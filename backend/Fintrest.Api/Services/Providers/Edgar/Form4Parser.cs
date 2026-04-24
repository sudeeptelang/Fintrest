using System.Xml.Linq;
using Fintrest.Api.Models;

namespace Fintrest.Api.Services.Providers.Edgar;

/// <summary>
/// Parses an SEC Form 4 primary XML document into a list of
/// InsiderTransaction rows. Non-derivative transactions only (we don't
/// track options/warrants — that's a separate feature). 10b5-1 flag is
/// detected from footnote text (standard XBRL pattern, no dedicated
/// element in the schema).
///
/// The XML root element is always &lt;ownershipDocument&gt;. We don't
/// rely on the schemaVersion element because SEC has used it
/// inconsistently across 2003-2025 filings. Instead we probe for the
/// known child-element names and fail soft (return empty) if the
/// structure doesn't match.
/// </summary>
public static class Form4Parser
{
    public record Form4ParseResult(
        string IssuerCik,
        string IssuerTicker,
        string InsiderCik,
        string InsiderName,
        string? InsiderTitle,
        bool IsOfficer,
        bool IsDirector,
        bool Is10PctOwner,
        List<InsiderTransaction> Transactions);

    /// <summary>
    /// Parse the primary Form 4 XML. Returns null if the document isn't a
    /// recognisable Form 4 (wrong root, malformed, or derivative-only).
    /// Caller fills in ticker, accession_number, filing_date + raw_xml_url.
    /// </summary>
    public static Form4ParseResult? Parse(string xml, DateTime filingDate, string accessionNumber, string rawXmlUrl)
    {
        XDocument doc;
        try { doc = XDocument.Parse(xml); }
        catch { return null; }

        var root = doc.Root;
        if (root?.Name.LocalName != "ownershipDocument") return null;

        // Issuer + reporting-owner metadata (single-owner per Form 4).
        var issuer = root.Element("issuer");
        var issuerCik = Text(issuer, "issuerCik") ?? "";
        var issuerTicker = Text(issuer, "issuerTradingSymbol")?.Trim().ToUpperInvariant() ?? "";

        var ownerEl = root.Element("reportingOwner");
        if (ownerEl is null) return null;

        var ownerId = ownerEl.Element("reportingOwnerId");
        var insiderCik = Text(ownerId, "rptOwnerCik") ?? "";
        var insiderName = Text(ownerId, "rptOwnerName") ?? "";

        var rel = ownerEl.Element("reportingOwnerRelationship");
        var isDirector = Bool(rel, "isDirector");
        var isOfficer = Bool(rel, "isOfficer");
        var is10Pct = Bool(rel, "isTenPercentOwner");
        var insiderTitle = Text(rel, "officerTitle");

        if (string.IsNullOrWhiteSpace(issuerTicker) || string.IsNullOrWhiteSpace(insiderCik))
            return null;

        // Detect 10b5-1 from footnote text — no dedicated element. Some
        // filers put it in a footnote referenced by a transaction; we
        // apply it file-wide because our scoring only needs to know "did
        // this filing declare 10b5-1." Precision > recall here.
        var is10b5_1 = DetectIs10b5_1(root);

        var transactions = new List<InsiderTransaction>();
        var nonDerivativeTable = root.Element("nonDerivativeTable");
        if (nonDerivativeTable is null) return null;

        foreach (var txEl in nonDerivativeTable.Elements("nonDerivativeTransaction"))
        {
            var date = ParseDate(Text(txEl.Element("transactionDate"), "value"));
            if (date is null) continue;

            var coding = txEl.Element("transactionCoding");
            var code = Text(coding, "transactionCode") ?? "";
            if (code.Length != 1) continue; // malformed

            var amounts = txEl.Element("transactionAmounts");
            var shares = Decimal(amounts?.Element("transactionShares"), "value");
            if (shares is null or 0) continue;

            var price = Decimal(amounts?.Element("transactionPricePerShare"), "value");
            decimal? totalValue = price.HasValue ? shares.Value * price.Value : null;

            var post = txEl.Element("postTransactionAmounts");
            var sharesAfter = Decimal(post?.Element("sharesOwnedFollowingTransaction"), "value");

            transactions.Add(new InsiderTransaction
            {
                AccessionNumber = accessionNumber,
                CompanyCik = issuerCik,
                Ticker = issuerTicker,
                InsiderCik = insiderCik,
                InsiderName = insiderName,
                InsiderTitle = insiderTitle,
                IsOfficer = isOfficer,
                IsDirector = isDirector,
                Is10PctOwner = is10Pct,
                TransactionDate = DateTime.SpecifyKind(date.Value, DateTimeKind.Utc),
                FilingDate = DateTime.SpecifyKind(filingDate.Date, DateTimeKind.Utc),
                TransactionCode = code,
                Shares = shares.Value,
                PricePerShare = price,
                TotalValue = totalValue,
                SharesOwnedAfter = sharesAfter,
                Is10b5_1 = is10b5_1,
                IsOpenMarket = IsOpenMarketCode(code),
                RawXmlUrl = rawXmlUrl,
            });
        }

        if (transactions.Count == 0) return null;

        return new Form4ParseResult(
            issuerCik, issuerTicker, insiderCik, insiderName, insiderTitle,
            isOfficer, isDirector, is10Pct, transactions);
    }

    // ─── helpers ───────────────────────────────────────────────────────────

    private static string? Text(XElement? parent, string childName)
    {
        if (parent is null) return null;
        var child = parent.Element(childName);
        if (child is null) return null;
        // Many Form 4 fields wrap values in <value> elements. Prefer that
        // when present, fall back to the child's own text content.
        var value = child.Element("value");
        return (value?.Value ?? child.Value).Trim();
    }

    private static bool Bool(XElement? parent, string childName)
    {
        var v = Text(parent, childName);
        return v is "1" or "true" || string.Equals(v, "true", StringComparison.OrdinalIgnoreCase);
    }

    private static decimal? Decimal(XElement? el, string? childName = null)
    {
        if (el is null) return null;
        string? raw;
        if (childName is not null)
        {
            var child = el.Element(childName);
            raw = child?.Value;
        }
        else
        {
            var value = el.Element("value");
            raw = (value?.Value ?? el.Value);
        }
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return decimal.TryParse(raw, System.Globalization.NumberStyles.Float,
            System.Globalization.CultureInfo.InvariantCulture, out var d) ? d : null;
    }

    private static DateTime? ParseDate(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        return DateTime.TryParse(s, System.Globalization.CultureInfo.InvariantCulture,
            System.Globalization.DateTimeStyles.AssumeUniversal | System.Globalization.DateTimeStyles.AdjustToUniversal,
            out var d) ? d.Date : null;
    }

    private static bool DetectIs10b5_1(XElement root)
    {
        foreach (var fn in root.Descendants("footnote"))
        {
            var text = fn.Value ?? "";
            if (text.Contains("10b5-1", StringComparison.OrdinalIgnoreCase) ||
                text.Contains("Rule 10b5", StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }

    private static bool IsOpenMarketCode(string code) => code switch
    {
        "P" => true,   // open-market purchase
        "S" => true,   // open-market sale
        _ => false,    // grants/exercises/gifts etc. are not open-market
    };
}
