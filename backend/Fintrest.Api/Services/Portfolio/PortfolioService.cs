using Fintrest.Api.Data;
using Fintrest.Api.DTOs.Portfolio;
using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Services.Portfolio;

/// <summary>
/// Core portfolio CRUD: create, list, transact, holdings, snapshots.
/// </summary>
public class PortfolioService(AppDbContext db, ILogger<PortfolioService> logger)
{
    public async Task<Models.Portfolio> CreatePortfolio(long userId, PortfolioCreateRequest request)
    {
        var portfolio = new Models.Portfolio
        {
            UserId = userId,
            Name = request.Name,
            Strategy = request.Strategy,
            CashBalance = request.InitialCash,
        };
        db.Portfolios.Add(portfolio);
        await db.SaveChangesAsync();
        return portfolio;
    }

    public async Task<List<Models.Portfolio>> GetPortfolios(long userId)
    {
        return await db.Portfolios
            .Include(p => p.Holdings)
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();
    }

    public async Task<Models.Portfolio?> GetPortfolio(long userId, long portfolioId)
    {
        return await db.Portfolios
            .Include(p => p.Holdings).ThenInclude(h => h.Stock)
            .FirstOrDefaultAsync(p => p.Id == portfolioId && p.UserId == userId);
    }

    /// <summary>
    /// Process a transaction: BUY deducts cash and adds/updates holding,
    /// SELL adds cash and reduces holding, DIVIDEND adds cash.
    /// </summary>
    public async Task<PortfolioTransaction> AddTransaction(long userId, long portfolioId, TransactionRequest request)
    {
        var portfolio = await db.Portfolios
            .Include(p => p.Holdings)
            .FirstOrDefaultAsync(p => p.Id == portfolioId && p.UserId == userId)
            ?? throw new InvalidOperationException("Portfolio not found");

        var stock = await db.Stocks.FindAsync(request.StockId)
            ?? throw new InvalidOperationException("Stock not found");

        var fees = request.Fees ?? 0;
        var total = request.Quantity * request.Price + fees;
        var type = request.Type.ToUpperInvariant();

        switch (type)
        {
            case "BUY":
                // No cash balance gate: users recording pre-existing holdings
                // (most common flow) rarely have a matching cash balance set.
                // Cash can go negative; the UI surfaces this as needed.
                portfolio.CashBalance -= total;

                var existingHolding = portfolio.Holdings.FirstOrDefault(h => h.StockId == request.StockId);
                if (existingHolding is not null)
                {
                    // Update average cost
                    var totalCost = existingHolding.AvgCost * existingHolding.Quantity + request.Quantity * request.Price;
                    existingHolding.Quantity += request.Quantity;
                    existingHolding.AvgCost = totalCost / existingHolding.Quantity;
                    existingHolding.CurrentPrice = request.Price;
                    existingHolding.CurrentValue = existingHolding.Quantity * request.Price;
                    existingHolding.UnrealizedPnl = existingHolding.CurrentValue - existingHolding.Quantity * existingHolding.AvgCost;
                    existingHolding.UnrealizedPnlPct = existingHolding.AvgCost > 0
                        ? (request.Price - existingHolding.AvgCost) / existingHolding.AvgCost * 100
                        : 0;
                    existingHolding.UpdatedAt = DateTime.UtcNow;
                }
                else
                {
                    db.Set<PortfolioHolding>().Add(new PortfolioHolding
                    {
                        PortfolioId = portfolioId,
                        StockId = request.StockId,
                        Quantity = request.Quantity,
                        AvgCost = request.Price,
                        CurrentPrice = request.Price,
                        CurrentValue = request.Quantity * request.Price,
                        UnrealizedPnl = 0,
                        UnrealizedPnlPct = 0,
                    });
                }
                break;

            case "SELL":
                var holdingToSell = portfolio.Holdings.FirstOrDefault(h => h.StockId == request.StockId)
                    ?? throw new InvalidOperationException("No holding found for this stock");

                if (holdingToSell.Quantity < request.Quantity)
                    throw new InvalidOperationException("Insufficient shares to sell");

                var sellProceeds = request.Quantity * request.Price - fees;
                portfolio.CashBalance += sellProceeds;

                holdingToSell.Quantity -= request.Quantity;
                if (holdingToSell.Quantity <= 0)
                {
                    db.Set<PortfolioHolding>().Remove(holdingToSell);
                }
                else
                {
                    holdingToSell.CurrentPrice = request.Price;
                    holdingToSell.CurrentValue = holdingToSell.Quantity * request.Price;
                    holdingToSell.UnrealizedPnl = holdingToSell.CurrentValue - holdingToSell.Quantity * holdingToSell.AvgCost;
                    holdingToSell.UnrealizedPnlPct = holdingToSell.AvgCost > 0
                        ? (request.Price - holdingToSell.AvgCost) / holdingToSell.AvgCost * 100
                        : 0;
                    holdingToSell.UpdatedAt = DateTime.UtcNow;
                }
                break;

            case "DIVIDEND":
                var dividendAmount = request.Quantity * request.Price;
                portfolio.CashBalance += dividendAmount;
                break;

            default:
                throw new InvalidOperationException($"Unknown transaction type: {type}");
        }

        var transaction = new PortfolioTransaction
        {
            PortfolioId = portfolioId,
            StockId = request.StockId,
            Type = type,
            Quantity = request.Quantity,
            Price = request.Price,
            Fees = fees,
            Total = total,
            Notes = request.Notes,
        };
        db.Set<PortfolioTransaction>().Add(transaction);

        portfolio.UpdatedAt = DateTime.UtcNow;
        // Retry wrapper mirrors what PortfolioImporter / DataIngestionService do —
        // the Npgsql+pgbouncer race can hit any SaveChanges batch, even a tiny
        // add-holding one, so 3 attempts with pool clear covers us.
        await SaveChangesWithRetryAsync();

        // Reload stock for ticker in response
        await db.Entry(transaction).Reference(t => t.Stock).LoadAsync();
        return transaction;
    }

    private async Task SaveChangesWithRetryAsync(CancellationToken ct = default)
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
                Npgsql.NpgsqlConnection.ClearAllPools();
                await Task.Delay(TimeSpan.FromMilliseconds(500 * attempt), ct);
            }
        }
    }

    private static bool IsTransient(Exception ex)
    {
        for (var e = ex; e is not null; e = e.InnerException!)
        {
            if (e is ObjectDisposedException) return true;
            if (e is Npgsql.NpgsqlException) return true;
            if (e is System.Net.Sockets.SocketException) return true;
            if (e is TimeoutException) return true;
        }
        return false;
    }

    public async Task<List<PortfolioHolding>> GetHoldings(long userId, long portfolioId)
    {
        var portfolio = await db.Portfolios
            .FirstOrDefaultAsync(p => p.Id == portfolioId && p.UserId == userId)
            ?? throw new InvalidOperationException("Portfolio not found");

        return await db.Set<PortfolioHolding>()
            .Include(h => h.Stock)
            .Where(h => h.PortfolioId == portfolioId)
            .OrderByDescending(h => h.CurrentValue)
            .ToListAsync();
    }

    public async Task<List<PortfolioTransaction>> GetTransactions(long userId, long portfolioId)
    {
        var portfolio = await db.Portfolios
            .FirstOrDefaultAsync(p => p.Id == portfolioId && p.UserId == userId)
            ?? throw new InvalidOperationException("Portfolio not found");

        return await db.Set<PortfolioTransaction>()
            .Include(t => t.Stock)
            .Where(t => t.PortfolioId == portfolioId)
            .OrderByDescending(t => t.ExecutedAt)
            .ToListAsync();
    }

    /// <summary>
    /// Refresh current_price, current_value, and unrealized PnL from latest market_data.
    /// </summary>
    public async Task UpdateHoldingPrices(long portfolioId)
    {
        var holdings = await db.Set<PortfolioHolding>()
            .Include(h => h.Stock)
            .Where(h => h.PortfolioId == portfolioId)
            .ToListAsync();

        foreach (var holding in holdings)
        {
            var latestPrice = await db.MarketData
                .Where(m => m.StockId == holding.StockId)
                .OrderByDescending(m => m.Ts)
                .Select(m => m.Close)
                .FirstOrDefaultAsync();

            if (latestPrice <= 0) continue;

            holding.CurrentPrice = latestPrice;
            holding.CurrentValue = holding.Quantity * latestPrice;
            holding.UnrealizedPnl = holding.CurrentValue - holding.Quantity * holding.AvgCost;
            holding.UnrealizedPnlPct = holding.AvgCost > 0
                ? (latestPrice - holding.AvgCost) / holding.AvgCost * 100
                : 0;
            holding.UpdatedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
    }

    /// <summary>
    /// Calculate total value and daily return, then save a snapshot record.
    /// </summary>
    public async Task<PortfolioSnapshot> TakeSnapshot(long portfolioId)
    {
        var portfolio = await db.Portfolios
            .Include(p => p.Holdings)
            .FirstOrDefaultAsync(p => p.Id == portfolioId)
            ?? throw new InvalidOperationException("Portfolio not found");

        var investedValue = portfolio.Holdings.Sum(h => h.CurrentValue);
        var totalValue = portfolio.CashBalance + investedValue;

        // Get previous snapshot for daily return calc
        var previousSnapshot = await db.Set<PortfolioSnapshot>()
            .Where(s => s.PortfolioId == portfolioId)
            .OrderByDescending(s => s.Date)
            .FirstOrDefaultAsync();

        var dailyReturn = previousSnapshot is not null && previousSnapshot.TotalValue > 0
            ? (totalValue - previousSnapshot.TotalValue) / previousSnapshot.TotalValue * 100
            : 0;

        // Cumulative return from first snapshot
        var firstSnapshot = await db.Set<PortfolioSnapshot>()
            .Where(s => s.PortfolioId == portfolioId)
            .OrderBy(s => s.Date)
            .FirstOrDefaultAsync();

        var baseValue = firstSnapshot?.TotalValue ?? totalValue;
        var cumulativeReturn = baseValue > 0
            ? (totalValue - baseValue) / baseValue * 100
            : 0;

        var snapshot = new PortfolioSnapshot
        {
            PortfolioId = portfolioId,
            Date = DateTime.UtcNow.Date,
            TotalValue = totalValue,
            CashValue = portfolio.CashBalance,
            InvestedValue = investedValue,
            DailyReturnPct = Math.Round(dailyReturn, 4),
            CumulativeReturnPct = Math.Round(cumulativeReturn, 4),
        };
        db.Set<PortfolioSnapshot>().Add(snapshot);
        await db.SaveChangesAsync();

        logger.LogInformation(
            "Snapshot for portfolio {Id}: total={Total:F2}, daily={Daily:F2}%, cumulative={Cum:F2}%",
            portfolioId, totalValue, dailyReturn, cumulativeReturn);

        return snapshot;
    }

    /// <summary>Get latest signal score for a stock (if any).</summary>
    public async Task<double?> GetLatestSignalScore(long stockId)
    {
        return await db.Signals
            .Where(s => s.StockId == stockId && s.Status == "ACTIVE")
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => (double?)s.ScoreTotal)
            .FirstOrDefaultAsync();
    }
}
