using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Ingestion;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Fintrest.Api.Services.Portfolio;

/// <summary>
/// Imports portfolios from CSV/text files.
/// Supports multiple broker export formats:
///   - Standard: Ticker, Quantity, AvgCost
///   - Robinhood: Symbol, Quantity, Average Cost
///   - Schwab: Symbol, Quantity, Cost Basis
///   - Fidelity: Symbol, Quantity, Cost Basis Per Share
///   - Generic: any file with ticker + shares + cost columns
/// </summary>
public class PortfolioImporter(
    AppDbContext db,
    DataIngestionService ingestion,
    ILogger<PortfolioImporter> logger)
{
    public record ImportResult(
        long PortfolioId,
        string PortfolioName,
        int HoldingsImported,
        int TickersNotFound,
        List<string> NotFoundTickers,
        int TickersAutoAdded,
        double TotalInvestedValue,
        double TotalCurrentValue,
        double TotalPnl
    );

    public record ParsedHolding(
        string Ticker,
        double Quantity,
        double AvgCost,
        double? CurrentPrice
    );

    /// <summary>
    /// Import a portfolio from CSV content.
    /// Auto-detects column format and maps tickers to stocks.
    /// </summary>
    public async Task<ImportResult> ImportFromCsvAsync(
        long userId,
        string portfolioName,
        Stream csvStream,
        double? cashBalance = null,
        CancellationToken ct = default)
    {
        // 1. Parse CSV into holdings
        var parsed = ParseCsv(csvStream);
        logger.LogInformation("Parsed {Count} holdings from CSV", parsed.Count);

        // 2. Create portfolio
        var portfolio = new Models.Portfolio
        {
            UserId = userId,
            Name = portfolioName,
            CashBalance = cashBalance ?? 0,
        };
        db.Portfolios.Add(portfolio);
        await db.SaveChangesAsync(ct);

        // 3. Match tickers to stocks, auto-add missing ones
        var notFound = new List<string>();
        var autoAdded = 0;
        var imported = 0;

        foreach (var holding in parsed)
        {
            var stock = await db.Stocks
                .FirstOrDefaultAsync(s => s.Ticker.ToUpper() == holding.Ticker.ToUpper(), ct);

            // Auto-add missing tickers
            if (stock is null)
            {
                try
                {
                    await ingestion.IngestStockAsync(holding.Ticker, ct);
                    stock = await db.Stocks
                        .FirstOrDefaultAsync(s => s.Ticker.ToUpper() == holding.Ticker.ToUpper(), ct);
                    if (stock is not null) autoAdded++;
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Failed to auto-add ticker {Ticker}", holding.Ticker);
                }
            }

            if (stock is null)
            {
                notFound.Add(holding.Ticker);
                continue;
            }

            // Get current price from latest market data
            var latestPrice = await db.MarketData
                .Where(m => m.StockId == stock.Id)
                .OrderByDescending(m => m.Ts)
                .Select(m => m.Close)
                .FirstOrDefaultAsync(ct);

            var currentPrice = latestPrice > 0 ? latestPrice : holding.AvgCost;
            var currentValue = holding.Quantity * currentPrice;
            var costBasis = holding.Quantity * holding.AvgCost;
            var pnl = currentValue - costBasis;
            var pnlPct = costBasis > 0 ? (pnl / costBasis) * 100 : 0;

            db.PortfolioHoldings.Add(new PortfolioHolding
            {
                PortfolioId = portfolio.Id,
                StockId = stock.Id,
                Quantity = holding.Quantity,
                AvgCost = holding.AvgCost,
                CurrentPrice = currentPrice,
                CurrentValue = currentValue,
                UnrealizedPnl = pnl,
                UnrealizedPnlPct = pnlPct,
            });

            // Record the initial buy transaction
            db.PortfolioTransactions.Add(new PortfolioTransaction
            {
                PortfolioId = portfolio.Id,
                StockId = stock.Id,
                Type = "BUY",
                Quantity = holding.Quantity,
                Price = holding.AvgCost,
                Fees = 0,
                Total = costBasis,
                Notes = "Imported from CSV",
                ExecutedAt = DateTime.UtcNow,
            });

            imported++;
        }

        // Npgsql 10 + Supabase pgbouncer still surface the disposed-connector race
        // on large SaveChanges batches (the Holdings import SQL is ~140 commands for
        // an 8-position portfolio). Retry 3x with pool clears — same pattern used in
        // DataIngestionService / FeatureBulkRepository.
        await SaveWithRetryAsync(ct);

        // Calculate totals
        var holdings = await db.PortfolioHoldings
            .Where(h => h.PortfolioId == portfolio.Id)
            .ToListAsync(ct);

        var totalInvested = holdings.Sum(h => h.Quantity * h.AvgCost);
        var totalCurrent = holdings.Sum(h => h.CurrentValue);
        var totalPnl = totalCurrent - totalInvested;

        logger.LogInformation(
            "Portfolio '{Name}' imported: {Imported} holdings, {NotFound} not found, {AutoAdded} auto-added",
            portfolioName, imported, notFound.Count, autoAdded);

        return new ImportResult(
            PortfolioId: portfolio.Id,
            PortfolioName: portfolioName,
            HoldingsImported: imported,
            TickersNotFound: notFound.Count,
            NotFoundTickers: notFound,
            TickersAutoAdded: autoAdded,
            TotalInvestedValue: Math.Round(totalInvested, 2),
            TotalCurrentValue: Math.Round(totalCurrent, 2),
            TotalPnl: Math.Round(totalPnl, 2)
        );
    }

    /// <summary>
    /// Import from a simple text format: one holding per line.
    /// Accepts: "AAPL 100 150.00" or "AAPL,100,150.00" or "AAPL\t100\t150.00"
    /// </summary>
    public async Task<ImportResult> ImportFromTextAsync(
        long userId,
        string portfolioName,
        string textContent,
        double? cashBalance = null,
        CancellationToken ct = default)
    {
        var holdings = new List<ParsedHolding>();
        var lines = textContent.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        foreach (var line in lines)
        {
            // Skip headers
            if (line.StartsWith("ticker", StringComparison.OrdinalIgnoreCase) ||
                line.StartsWith("symbol", StringComparison.OrdinalIgnoreCase) ||
                line.StartsWith("#"))
                continue;

            var parts = line.Split([',', '\t', ' ', '|'], StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (parts.Length < 2) continue;

            var ticker = parts[0].ToUpper().Trim('"');
            if (!double.TryParse(parts[1].Trim('$', '"'), NumberStyles.Any, CultureInfo.InvariantCulture, out var qty)) continue;

            var avgCost = 0.0;
            if (parts.Length >= 3)
                double.TryParse(parts[2].Trim('$', '"'), NumberStyles.Any, CultureInfo.InvariantCulture, out avgCost);

            if (qty > 0)
                holdings.Add(new ParsedHolding(ticker, qty, avgCost, null));
        }

        // Use CSV import flow with parsed holdings
        var stream = new MemoryStream();
        using (var writer = new StreamWriter(stream, leaveOpen: true))
        {
            await writer.WriteLineAsync("Ticker,Quantity,AvgCost");
            foreach (var h in holdings)
                await writer.WriteLineAsync($"{h.Ticker},{h.Quantity},{h.AvgCost}");
        }
        stream.Position = 0;

        return await ImportFromCsvAsync(userId, portfolioName, stream, cashBalance, ct);
    }

    private List<ParsedHolding> ParseCsv(Stream stream)
    {
        var holdings = new List<ParsedHolding>();

        // Load everything up-front so we can scan for the real header row. Fidelity, Schwab, and
        // Vanguard all export preamble lines (account name, date, disclaimers) before the actual
        // table; naïve CSV parsing treats the first row as headers and fails.
        using var initialReader = new StreamReader(stream);
        var allLines = new List<string>();
        while (initialReader.ReadLine() is { } line)
            allLines.Add(line);

        if (allLines.Count == 0) return holdings;

        var headerRow = FindHeaderRow(allLines);
        if (headerRow < 0)
        {
            logger.LogWarning("No ticker/quantity header found in CSV — tried first 30 rows.");
            return holdings;
        }

        // Re-stream from the detected header row onward.
        var relevant = string.Join('\n', allLines.Skip(headerRow));
        var brokerGuess = GuessBroker(allLines.Take(headerRow + 1).ToList());
        logger.LogInformation("CSV detected format: {Broker} (header at line {Row})", brokerGuess, headerRow + 1);

        using var textReader = new StringReader(relevant);
        using var csv = new CsvReader(textReader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            MissingFieldFound = null,
            HeaderValidated = null,
            PrepareHeaderForMatch = args => args.Header.ToLower().Trim(),
            BadDataFound = null, // broker exports have quoting weirdness — don't throw
        });

        csv.Read();
        csv.ReadHeader();
        var headers = csv.HeaderRecord?.Select(h => h.ToLower().Trim()).ToArray() ?? [];

        var tickerCol = FindColumn(headers, "ticker", "symbol", "stock", "security");
        var qtyCol = FindColumn(headers, "quantity", "shares", "qty", "amount", "units");
        var costCol = FindColumnExact(headers, "average cost basis")
                      ?? FindColumnExact(headers, "cost basis per share")
                      ?? FindColumnExact(headers, "avg cost")
                      ?? FindColumnExact(headers, "average cost")
                      ?? FindColumnExact(headers, "share price")    // Vanguard
                      ?? FindColumn(headers, "avgcost", "purchase price", "price per share", "price");

        if (tickerCol is null || qtyCol is null)
        {
            logger.LogWarning("Could not detect ticker/quantity columns. Headers: {Headers}", string.Join(", ", headers));
            return holdings;
        }

        while (csv.Read())
        {
            try
            {
                var ticker = csv.GetField(tickerCol.Value)?.Trim().ToUpper();
                if (string.IsNullOrEmpty(ticker)) continue;

                // Clean ticker (remove exchange prefix like "NYSE:")
                if (ticker.Contains(':')) ticker = ticker.Split(':').Last();
                ticker = ticker.Trim('"', '\'');

                // Skip cash, money market, warrants, empty rows
                if (ticker is "CASH" or "SPAXX" or "FDRXX" or "MONEY MARKET" or "--" or "") continue;
                if (ticker.EndsWith("**")) ticker = ticker.TrimEnd('*'); // SPAXX** → SPAXX
                if (ticker is "SPAXX" or "FDRXX" or "FCASH") continue;
                // Skip warrants (OPENL, OPENZ, OPENW, etc.)
                if (ticker.Length > 4 && ticker.All(c => char.IsLetter(c))) { /* keep, might be valid */ }

                var qtyStr = CleanNumber(csv.GetField(qtyCol.Value));
                if (!double.TryParse(qtyStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var qty) || qty <= 0)
                    continue;

                var avgCost = 0.0;
                if (costCol.HasValue)
                {
                    var costStr = CleanNumber(csv.GetField(costCol.Value));
                    double.TryParse(costStr, NumberStyles.Any, CultureInfo.InvariantCulture, out avgCost);
                }

                holdings.Add(new ParsedHolding(ticker, qty, avgCost, null));
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "Failed to parse CSV row");
            }
        }

        return holdings;
    }

    /// <summary>Strip $, commas, quotes, parens from number strings.</summary>
    private static string CleanNumber(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return "0";
        var cleaned = raw.Trim();
        // Handle negative in parens: ($1,234.56) → -1234.56
        var negative = cleaned.StartsWith('(') && cleaned.EndsWith(')');
        cleaned = cleaned.Trim('$', '"', ' ', '(', ')', '%');
        cleaned = cleaned.Replace(",", "");
        if (negative) cleaned = "-" + cleaned;
        return cleaned;
    }

    private static int? FindColumnExact(string[] headers, string name)
    {
        for (var i = 0; i < headers.Length; i++)
            if (headers[i].Trim() == name.ToLower().Trim()) return i;
        return null;
    }

    private static int? FindColumn(string[] headers, params string[] candidates)
    {
        for (var i = 0; i < headers.Length; i++)
        {
            foreach (var candidate in candidates)
            {
                if (headers[i].Contains(candidate, StringComparison.OrdinalIgnoreCase))
                    return i;
            }
        }
        return null;
    }

    /// <summary>
    /// Scan the first 30 rows looking for the real header line — the one with both a
    /// ticker/symbol column AND a quantity/shares column. Brokers export preambles
    /// (account name, date, blank lines) that must be skipped.
    /// </summary>
    private static int FindHeaderRow(List<string> lines)
    {
        var tickerWords = new[] { "symbol", "ticker", "security", "stock" };
        var qtyWords    = new[] { "quantity", "shares", "qty", "units" };

        for (int i = 0; i < Math.Min(30, lines.Count); i++)
        {
            var lower = lines[i].ToLowerInvariant();
            var hasTicker = tickerWords.Any(w => lower.Contains(w));
            var hasQty    = qtyWords.Any(w => lower.Contains(w));
            if (hasTicker && hasQty) return i;
        }
        // Fall back to row 0 so single-row exports still work.
        return lines.Count > 0 ? 0 : -1;
    }

    /// <summary>Best-effort broker identification from the preamble/header — purely for logs.</summary>
    private static string GuessBroker(List<string> preamble)
    {
        var joined = string.Join(" ", preamble).ToLowerInvariant();
        if (joined.Contains("fidelity") || joined.Contains("spaxx")) return "Fidelity";
        if (joined.Contains("charles schwab") || joined.Contains("cost basis")) return "Schwab";
        if (joined.Contains("vanguard") || joined.Contains("investment name")) return "Vanguard";
        if (joined.Contains("robinhood")) return "Robinhood";
        if (joined.Contains("e*trade") || joined.Contains("etrade")) return "E*Trade";
        if (joined.Contains("interactive brokers") || joined.Contains("ibkr")) return "IBKR";
        if (joined.Contains("merrill")) return "Merrill";
        if (joined.Contains("webull")) return "Webull";
        if (joined.Contains("m1")) return "M1";
        return "Generic CSV";
    }

    /// <summary>Retry the batched SaveChangesAsync on the Npgsql+pgbouncer
    /// disposed-connector race. 3 attempts, pool clear between retries, linear
    /// backoff. Only catches transient signatures — real DbUpdateException
    /// body issues bubble up as before.</summary>
    private async Task SaveWithRetryAsync(CancellationToken ct)
    {
        const int maxAttempts = 3;
        for (int attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                await db.SaveChangesAsync(ct);
                return;
            }
            catch (Exception ex) when (attempt < maxAttempts && IsTransient(ex))
            {
                NpgsqlConnection.ClearAllPools();
                logger.LogWarning(
                    "PortfolioImporter.SaveChangesAsync transient error (attempt {Attempt}/{Max}): {Type}: {Msg}",
                    attempt, maxAttempts, ex.GetType().Name, ex.Message);
                await Task.Delay(TimeSpan.FromMilliseconds(500 * attempt), ct);
            }
        }
    }

    private static bool IsTransient(Exception ex)
    {
        for (var e = ex; e is not null; e = e.InnerException!)
        {
            if (e is ObjectDisposedException) return true;
            if (e is NpgsqlException) return true;
            if (e is System.Net.Sockets.SocketException) return true;
            if (e is TimeoutException) return true;
        }
        return false;
    }
}
