using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Providers.Edgar;

/// <summary>
/// Fetches SEC EDGAR daily filing indexes, filters for Form 4, downloads
/// and parses the primary XML per filing, and upserts insider_transactions
/// rows. Orchestrated by EdgarIngestJob on a nightly cadence (8 PM ET
/// weekdays — just after EDGAR's last filings of the day settle).
///
/// Idempotent — the composite UNIQUE on insider_transactions means
/// re-ingesting the same day is a no-op for already-seen rows. Safe to
/// re-run for backfill.
/// </summary>
public class EdgarIngestService(
    EdgarClient edgar,
    AppDbContext db,
    ILogger<EdgarIngestService> logger)
{
    private const string BaseArchives = "https://www.sec.gov/Archives";
    private const string DailyIndex = "https://www.sec.gov/Archives/edgar/daily-index";

    public record IngestSummary(
        DateTime Date,
        int FilingsSeen,
        int Form4Filings,
        int TransactionsUpserted,
        int ParseFailures);

    /// <summary>
    /// Ingest all Form 4 filings for a given calendar date. If the index
    /// 404s (weekend/holiday) we return a zero summary — not an error.
    /// </summary>
    public async Task<IngestSummary> IngestDateAsync(DateTime date, CancellationToken ct = default)
    {
        var qtr = ((date.Month - 1) / 3) + 1;
        var idxUrl = $"{DailyIndex}/{date.Year:D4}/QTR{qtr}/form.{date:yyyyMMdd}.idx";

        var idxBody = await edgar.GetStringAsync(idxUrl, ct);
        if (string.IsNullOrEmpty(idxBody))
        {
            logger.LogInformation("EDGAR index not found for {Date} ({Url}) — weekend/holiday or not yet published.", date.ToString("yyyy-MM-dd"), idxUrl);
            return new IngestSummary(date.Date, 0, 0, 0, 0);
        }

        var entries = ParseFormIndex(idxBody);
        var form4s = entries.Where(e => e.FormType == "4").ToList();
        logger.LogInformation("EDGAR {Date}: {Total} filings, {Form4} Form 4s", date.ToString("yyyy-MM-dd"), entries.Count, form4s.Count);

        int upserted = 0;
        int parseFailures = 0;

        foreach (var entry in form4s)
        {
            if (ct.IsCancellationRequested) break;

            try
            {
                var transactions = await FetchAndParseAsync(entry, date, ct);
                if (transactions is null)
                {
                    parseFailures++;
                    continue;
                }

                // Upsert with dedupe on the composite unique key. We read
                // the existing rows for this accession first, then add
                // anything new. For 10-30 tx per filing this is cheap.
                var accession = transactions[0].AccessionNumber;
                var existingKeys = await db.InsiderTransactions
                    .Where(t => t.AccessionNumber == accession)
                    .Select(t => new { t.InsiderCik, t.TransactionDate, t.Shares, t.TransactionCode })
                    .ToListAsync(ct);
                var seen = existingKeys.Select(k => (k.InsiderCik, k.TransactionDate, k.Shares, k.TransactionCode)).ToHashSet();

                foreach (var tx in transactions)
                {
                    var key = (tx.InsiderCik, tx.TransactionDate, tx.Shares, tx.TransactionCode);
                    if (!seen.Contains(key))
                    {
                        db.InsiderTransactions.Add(tx);
                        upserted++;
                    }
                }
            }
            catch (Exception ex)
            {
                parseFailures++;
                logger.LogWarning(ex, "EDGAR Form 4 parse/upsert failed for {Accession}", entry.AccessionNumber);
            }
        }

        if (upserted > 0) await db.SaveChangesAsync(ct);

        return new IngestSummary(date.Date, entries.Count, form4s.Count, upserted, parseFailures);
    }

    /// <summary>Backfill a date range. Max 30 days to prevent accidental huge runs.</summary>
    public async Task<List<IngestSummary>> BackfillAsync(DateTime from, DateTime to, CancellationToken ct = default)
    {
        if ((to - from).TotalDays > 30)
            throw new ArgumentException("Backfill limited to 30 days — chunk longer runs manually.");
        var summaries = new List<IngestSummary>();
        for (var d = from.Date; d <= to.Date; d = d.AddDays(1))
        {
            summaries.Add(await IngestDateAsync(d, ct));
        }
        return summaries;
    }

    // ─── internal ──────────────────────────────────────────────────────────

    private record IndexEntry(string FormType, string CompanyName, string Cik, DateTime Date, string FilePath)
    {
        public string AccessionNumber =>
            // File path looks like "edgar/data/320193/000032019326000043/0000320193-26-000043-index.htm"
            // Accession is the dir segment before "-index.htm" — take it from the .htm basename.
            System.IO.Path.GetFileNameWithoutExtension(FilePath).Replace("-index", "");
    }

    private static List<IndexEntry> ParseFormIndex(string body)
    {
        // EDGAR's form.YYYYMMDD.idx is a fixed-width text file with a
        // header + separator line + data rows. We take the dashed
        // separator as our anchor and split each data row by runs of 2+
        // whitespace chars (the fields are padded but not tab-delimited).
        var entries = new List<IndexEntry>();
        var lines = body.Split('\n');
        bool afterSeparator = false;
        foreach (var rawLine in lines)
        {
            var line = rawLine.TrimEnd('\r');
            if (line.StartsWith("---"))
            {
                afterSeparator = true;
                continue;
            }
            if (!afterSeparator) continue;
            if (string.IsNullOrWhiteSpace(line)) continue;

            // Form fields are fixed-width; splitting on 2+ spaces is
            // sufficient because company names can contain single spaces.
            var parts = System.Text.RegularExpressions.Regex.Split(line, "\\s{2,}");
            if (parts.Length < 5) continue;

            var formType = parts[0].Trim();
            // Only Form 4 + amendments (4/A). The filter here avoids
            // parsing overhead for the 99% of filings that are 10-K / 8-K
            // / DEF 14A etc.
            if (formType != "4" && formType != "4/A") continue;

            var companyName = parts[1].Trim();
            var cik = parts[2].Trim();
            if (!DateTime.TryParse(parts[3].Trim(),
                System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal,
                out var date)) continue;
            var filePath = parts[4].Trim();
            entries.Add(new IndexEntry("4", companyName, cik, date.Date, filePath));
        }
        return entries;
    }

    private async Task<List<InsiderTransaction>?> FetchAndParseAsync(IndexEntry entry, DateTime filingDate, CancellationToken ct)
    {
        // Primary doc lookup: EDGAR exposes an index.json per accession
        // that lists the primary XML. Path pattern:
        //   /Archives/edgar/data/{cik}/{accession-no-dashes}/index.json
        var accNoDashes = entry.AccessionNumber.Replace("-", "");
        var indexJsonUrl = $"{BaseArchives}/edgar/data/{long.Parse(entry.Cik)}/{accNoDashes}/index.json";
        var indexJson = await edgar.GetStringAsync(indexJsonUrl, ct);
        if (indexJson is null) return null;

        var primaryDoc = ExtractPrimaryXml(indexJson);
        if (primaryDoc is null) return null;

        var xmlUrl = $"{BaseArchives}/edgar/data/{long.Parse(entry.Cik)}/{accNoDashes}/{primaryDoc}";
        var xml = await edgar.GetStringAsync(xmlUrl, ct);
        if (xml is null) return null;

        var parsed = Form4Parser.Parse(xml, filingDate, entry.AccessionNumber, xmlUrl);
        return parsed?.Transactions;
    }

    private static string? ExtractPrimaryXml(string indexJson)
    {
        // index.json has shape { "directory": { "item": [ { "name": "...", ... }, ... ] } }
        // We want the first *.xml file whose name starts with "wf-form4" or
        // contains "form4" — those are the XBRL-encoded Form 4 primary docs.
        try
        {
            using var doc = System.Text.Json.JsonDocument.Parse(indexJson);
            var items = doc.RootElement.GetProperty("directory").GetProperty("item");
            string? fallback = null;
            foreach (var item in items.EnumerateArray())
            {
                if (!item.TryGetProperty("name", out var nameProp)) continue;
                var name = nameProp.GetString() ?? "";
                if (!name.EndsWith(".xml", StringComparison.OrdinalIgnoreCase)) continue;
                if (name.Contains("form4", StringComparison.OrdinalIgnoreCase)
                    || name.StartsWith("wf-", StringComparison.OrdinalIgnoreCase))
                    return name;
                fallback ??= name;
            }
            return fallback; // any XML, last resort
        }
        catch
        {
            return null;
        }
    }
}
