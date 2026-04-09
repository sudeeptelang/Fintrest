using System.Globalization;
using CsvHelper;
using CsvHelper.Configuration;
using Fintrest.Api.Data;
using Fintrest.Api.Models;
using Fintrest.Api.Services.Ingestion;
using Fintrest.Api.Services.Providers.Contracts;
using Microsoft.EntityFrameworkCore;

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
    IMarketDataProvider marketProvider,
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

        await db.SaveChangesAsync(ct);

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

        using var reader = new StreamReader(stream);
        using var csv = new CsvReader(reader, new CsvConfiguration(CultureInfo.InvariantCulture)
        {
            HasHeaderRecord = true,
            MissingFieldFound = null,
            HeaderValidated = null,
            PrepareHeaderForMatch = args => args.Header.ToLower().Trim(),
        });

        csv.Read();
        csv.ReadHeader();
        var headers = csv.HeaderRecord?.Select(h => h.ToLower().Trim()).ToArray() ?? [];

        // Auto-detect column mapping
        var tickerCol = FindColumn(headers, "ticker", "symbol", "stock", "name", "security");
        var qtyCol = FindColumn(headers, "quantity", "shares", "qty", "amount", "units");
        var costCol = FindColumn(headers, "avgcost", "avg cost", "average cost", "cost basis", "cost basis per share", "price", "purchase price", "cost");

        if (tickerCol is null || qtyCol is null)
        {
            logger.LogWarning("Could not detect ticker or quantity columns. Headers: {Headers}", string.Join(", ", headers));
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

                // Skip cash, money market, etc.
                if (ticker is "CASH" or "SPAXX" or "FDRXX" or "MONEY MARKET" or "--") continue;

                var qtyStr = csv.GetField(qtyCol.Value)?.Trim('$', '"', ' ') ?? "0";
                if (!double.TryParse(qtyStr, NumberStyles.Any, CultureInfo.InvariantCulture, out var qty) || qty <= 0)
                    continue;

                var avgCost = 0.0;
                if (costCol.HasValue)
                {
                    var costStr = csv.GetField(costCol.Value)?.Trim('$', '"', ' ') ?? "0";
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
}
