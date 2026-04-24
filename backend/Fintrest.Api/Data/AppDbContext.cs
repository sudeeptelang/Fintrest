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

    // Athena AI thesis per (scan_run, stock). (Chat feature removed for MVP —
    // Fintrest's value is research + published outcome; conversational chat
    // was not core and carried variable Claude cost per Pro user.)
    public DbSet<AthenaThesis> AthenaTheses => Set<AthenaThesis>();

    // Portfolio
    public DbSet<Portfolio> Portfolios => Set<Portfolio>();
    public DbSet<PortfolioHolding> PortfolioHoldings => Set<PortfolioHolding>();
    public DbSet<PortfolioTransaction> PortfolioTransactions => Set<PortfolioTransaction>();
    public DbSet<PortfolioSnapshot> PortfolioSnapshots => Set<PortfolioSnapshot>();
    public DbSet<PortfolioAiRecommendation> PortfolioAiRecommendations => Set<PortfolioAiRecommendation>();
    public DbSet<PortfolioRiskMetric> PortfolioRiskMetrics => Set<PortfolioRiskMetric>();

    // Signal Engine v3 foundation (see docs/SIGNALS_V3.md + Migrations/014).
    // Empty until Milestone 2+ populates them — v2 scoring continues unchanged.
    public DbSet<FeatureRow> Features => Set<FeatureRow>();
    public DbSet<FeatureRank> FeatureRanks => Set<FeatureRank>();
    public DbSet<TickerEarningsProfile> TickerEarningsProfiles => Set<TickerEarningsProfile>();
    public DbSet<AlgorithmIcHistory> AlgorithmIcHistory => Set<AlgorithmIcHistory>();
    public DbSet<FeatureRunLog> FeatureRunLogs => Set<FeatureRunLog>();

    // Job state — cron robustness; migration 018.
    public DbSet<JobState> JobStates => Set<JobState>();

    // Briefing run history — migration 019.
    public DbSet<BriefingRun> BriefingRuns => Set<BriefingRun>();

    // Write-through cache for FMP firehoses — migration 020.
    public DbSet<MarketFirehoseSnapshot> MarketFirehoseSnapshots => Set<MarketFirehoseSnapshot>();

    // Fundamentals Q/P/G sub-scores — migration 021, §14.1.
    public DbSet<FundamentalSubscore> FundamentalSubscores => Set<FundamentalSubscore>();

    // Smart Money Phase 1 — SEC EDGAR Form 4 insider trades + derived
    // per-ticker score (migration 024, docs/SMART_MONEY_BUILD_SPEC.md).
    public DbSet<InsiderTransaction> InsiderTransactions => Set<InsiderTransaction>();
    public DbSet<InsiderScore> InsiderScores => Set<InsiderScore>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ─── Signal Engine v3 foundation ──────────────────────────────────
        // Composite keys for the feature store. EF Core needs these declared
        // explicitly since the models use [Column] but no [Key] attributes.
        modelBuilder.Entity<FeatureRow>()
            .HasKey(f => new { f.Ticker, f.Date, f.FeatureName });

        modelBuilder.Entity<FeatureRank>()
            .HasKey(f => new { f.Ticker, f.Date, f.FeatureName });

        modelBuilder.Entity<TickerEarningsProfile>()
            .HasKey(t => t.Ticker);

        modelBuilder.Entity<AlgorithmIcHistory>()
            .HasKey(a => new { a.Date, a.Algorithm, a.Sector, a.Regime, a.HorizonDays });

        modelBuilder.Entity<JobState>()
            .HasKey(j => j.JobName);

        modelBuilder.Entity<FundamentalSubscore>()
            .HasKey(f => new { f.Ticker, f.AsOfDate });

        // User — Plan is stored as lowercase text to match the DB's
        // `users_plan_check` constraint (free / starter / pro / premium).
        modelBuilder.Entity<User>(e =>
        {
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Plan).HasConversion(
                v => v.ToString().ToLowerInvariant(),
                v => Enum.Parse<PlanType>(v, true));
        });

        // Subscription — both Plan and Status use lowercase text to align with
        // similar DB check constraints. Case-insensitive parse on read protects
        // against any legacy PascalCase rows from earlier migrations.
        modelBuilder.Entity<Subscription>(e =>
        {
            e.HasIndex(s => s.UserId).IsUnique();
            e.Property(s => s.Status).HasConversion(
                v => v.ToString().ToLowerInvariant(),
                v => Enum.Parse<SubscriptionStatus>(v, true));
            e.Property(s => s.Plan).HasConversion(
                v => v.ToString().ToLowerInvariant(),
                v => Enum.Parse<PlanType>(v, true));
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
