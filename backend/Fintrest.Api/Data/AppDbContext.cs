using Fintrest.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Fintrest.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Subscription> Subscriptions => Set<Subscription>();
    public DbSet<Stock> Stocks => Set<Stock>();
    public DbSet<MarketData> MarketData => Set<MarketData>();
    public DbSet<Fundamental> Fundamentals => Set<Fundamental>();
    public DbSet<ScanRun> ScanRuns => Set<ScanRun>();
    public DbSet<Signal> Signals => Set<Signal>();
    public DbSet<SignalBreakdown> SignalBreakdowns => Set<SignalBreakdown>();
    public DbSet<SignalEvent> SignalEvents => Set<SignalEvent>();
    public DbSet<NewsItem> NewsItems => Set<NewsItem>();
    public DbSet<Watchlist> Watchlists => Set<Watchlist>();
    public DbSet<WatchlistItem> WatchlistItems => Set<WatchlistItem>();
    public DbSet<Alert> Alerts => Set<Alert>();
    public DbSet<AlertDelivery> AlertDeliveries => Set<AlertDelivery>();
    public DbSet<PerformanceTracking> PerformanceTracking => Set<PerformanceTracking>();
    public DbSet<SeoArticle> SeoArticles => Set<SeoArticle>();
    public DbSet<AdminAuditLog> AdminAuditLogs => Set<AdminAuditLog>();
    public DbSet<ProviderHealth> ProviderHealth => Set<ProviderHealth>();
    public DbSet<LlmTraceLog> LlmTraceLogs => Set<LlmTraceLog>();

    // Portfolio
    public DbSet<Portfolio> Portfolios => Set<Portfolio>();
    public DbSet<PortfolioHolding> PortfolioHoldings => Set<PortfolioHolding>();
    public DbSet<PortfolioTransaction> PortfolioTransactions => Set<PortfolioTransaction>();
    public DbSet<PortfolioSnapshot> PortfolioSnapshots => Set<PortfolioSnapshot>();
    public DbSet<PortfolioAiRecommendation> PortfolioAiRecommendations => Set<PortfolioAiRecommendation>();
    public DbSet<PortfolioRiskMetric> PortfolioRiskMetrics => Set<PortfolioRiskMetric>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Plan).HasConversion<string>();
        });

        // Subscription
        modelBuilder.Entity<Subscription>(e =>
        {
            e.HasIndex(s => s.UserId).IsUnique();
            e.Property(s => s.Status).HasConversion<string>();
            e.Property(s => s.Plan).HasConversion<string>();
        });

        // Stock
        modelBuilder.Entity<Stock>(e =>
        {
            e.HasIndex(s => s.Ticker).IsUnique();
        });

        // MarketData — composite index
        modelBuilder.Entity<MarketData>(e =>
        {
            e.HasIndex(m => new { m.StockId, m.Ts }).IsDescending(false, true);
        });

        // Signal — composite index
        modelBuilder.Entity<Signal>(e =>
        {
            e.HasIndex(s => new { s.ScanRunId, s.ScoreTotal }).IsDescending(false, true);
            e.Property(s => s.SignalType).HasConversion<string>();
        });

        // SignalBreakdown — unique per signal
        modelBuilder.Entity<SignalBreakdown>(e =>
        {
            e.HasIndex(b => b.SignalId).IsUnique();
        });

        // SEO articles
        modelBuilder.Entity<SeoArticle>(e =>
        {
            e.HasIndex(a => a.Slug).IsUnique();
        });

        // NewsItem
        modelBuilder.Entity<NewsItem>(e =>
        {
            e.HasIndex(n => n.StockId);
        });

        // PerformanceTracking
        modelBuilder.Entity<PerformanceTracking>(e =>
        {
            e.HasIndex(p => p.SignalId).IsUnique();
        });

        // Portfolio
        modelBuilder.Entity<Portfolio>(e =>
        {
            e.HasIndex(p => p.UserId);
        });

        // PortfolioHolding — unique stock per portfolio
        modelBuilder.Entity<PortfolioHolding>(e =>
        {
            e.HasIndex(h => new { h.PortfolioId, h.StockId }).IsUnique();
        });

        // PortfolioTransaction
        modelBuilder.Entity<PortfolioTransaction>(e =>
        {
            e.HasIndex(t => new { t.PortfolioId, t.ExecutedAt }).IsDescending(false, true);
        });

        // PortfolioSnapshot — one snapshot per portfolio per day
        modelBuilder.Entity<PortfolioSnapshot>(e =>
        {
            e.HasIndex(s => new { s.PortfolioId, s.Date }).IsUnique();
        });

        // PortfolioAiRecommendation
        modelBuilder.Entity<PortfolioAiRecommendation>(e =>
        {
            e.HasIndex(r => new { r.PortfolioId, r.CreatedAt }).IsDescending(false, true);
        });

        // PortfolioRiskMetric — one per portfolio per day
        modelBuilder.Entity<PortfolioRiskMetric>(e =>
        {
            e.HasIndex(r => new { r.PortfolioId, r.Date }).IsUnique();
        });
    }
}
