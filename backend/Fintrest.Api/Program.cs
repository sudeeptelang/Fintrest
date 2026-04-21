using System.Text;
using Fintrest.Api.Core;
using Fintrest.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Database — Supabase PostgreSQL.
// EnableRetryOnFailure wraps every SaveChanges / query in Npgsql's
// NpgsqlExecutionStrategy, which absorbs transient errors (connection drops,
// the ObjectDisposedException race between Npgsql + Supabase PgBouncer, etc.).
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
            builder.Configuration.GetConnectionString("DefaultConnection"),
            npgsql => npgsql.EnableRetryOnFailure(
                maxRetryCount: 3,
                maxRetryDelay: TimeSpan.FromSeconds(5),
                errorCodesToAdd: null))
           .UseSnakeCaseNamingConvention());

// Auth — Validate Supabase JWT tokens
var supabaseUrl = builder.Configuration["Supabase:Url"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.Authority = $"{supabaseUrl}/auth/v1";
        options.MetadataAddress = $"{supabaseUrl}/auth/v1/.well-known/openid-configuration";
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = $"{supabaseUrl}/auth/v1",
            ValidAudience = "authenticated",
            NameClaimType = "sub",
        };
    });
// Import Core namespace for the IsAdmin() ClaimsPrincipal extension.
// (Named import at-use site to keep the top of file clean.)
// AdminOnly policy delegates to the IsAdmin() extension in core/deps.cs so
// admin access works whether the JWT carries ClaimTypes.Role="Admin",
// user_role="admin" (Supabase app_metadata convention), or role="admin".
// Supabase's default JWT has role="authenticated" which would otherwise
// fail a [Authorize(Roles = "Admin")] check. Admin users get marked by
// setting user_role="admin" in their Supabase app_metadata.
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireAssertion(ctx => ctx.User.IsAdmin()));
});

// Data Providers
builder.Services.AddSingleton<Fintrest.Api.Services.Providers.FmpRateLimiter>();
builder.Services.AddHttpClient<Fintrest.Api.Services.Providers.Contracts.IMarketDataProvider,
    Fintrest.Api.Services.Providers.Polygon.PolygonProvider>();
builder.Services.AddHttpClient<Fintrest.Api.Services.Providers.Contracts.IFundamentalsProvider,
    Fintrest.Api.Services.Providers.FMP.FmpProvider>();
builder.Services.AddHttpClient<Fintrest.Api.Services.Providers.Contracts.INewsProvider,
    Fintrest.Api.Services.Providers.Finnhub.FinnhubProvider>();

// Scoring configuration — weights, regime-conditional weight sets, thresholds.
// Tune these in appsettings.json without a recompile.
builder.Services.Configure<Fintrest.Api.Services.Scoring.ScoringOptions>(
    builder.Configuration.GetSection(Fintrest.Api.Services.Scoring.ScoringOptions.SectionName));

// Services
builder.Services.AddScoped<Fintrest.Api.Services.Ingestion.MarketDataBulkRepository>();
builder.Services.AddScoped<Fintrest.Api.Services.Ingestion.DataIngestionService>();
builder.Services.AddScoped<Fintrest.Api.Services.Pipeline.ScanOrchestrator>();
builder.Services.AddScoped<Fintrest.Api.Services.Portfolio.PortfolioService>();
builder.Services.AddScoped<Fintrest.Api.Services.Portfolio.PortfolioAiAdvisor>();
builder.Services.AddScoped<Fintrest.Api.Services.Portfolio.RiskAnalytics>();
builder.Services.AddScoped<Fintrest.Api.Services.Portfolio.PortfolioImporter>();
builder.Services.AddScoped<Fintrest.Api.Services.Portfolio.ClaudeFinancialAdvisor>();
builder.Services.AddScoped<Fintrest.Api.Services.AthenaService>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.AthenaThesisService>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.AthenaNewsService>();

// Signal Engine v3 foundation (docs/SIGNALS_V3.md).
// v2 scoring is still the source of truth for live signals; v3 just populates
// the feature store in parallel so we can validate before any scoring cutover.
// Dapper doesn't ship DateOnly/TimeOnly handlers as of 2.1.35 — register once.
Fintrest.Api.Services.Scoring.V3.DapperTypeHandlers.Register();

builder.Services.AddSingleton<Fintrest.Api.Services.Scoring.V3.SectorMap>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.FeatureStore>();
// FeatureBulkRepository uses Dapper on a dedicated NpgsqlConnection — scoped.
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.FeatureBulkRepository>();

// v3 feature implementations — each registered as IFeature so the orchestrator
// can iterate them via IEnumerable<IFeature>. Add new features here as they land.
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Momentum.Roc5dFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Momentum.Roc20dFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Momentum.Roc60dFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Momentum.Rsi14Feature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Trend.Ma50Feature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Trend.Ma200Feature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Volatility.Atr14Feature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.PriceRange.Week52RangePctFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Momentum.MomentumAccelerationFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Volatility.MeanReversionZScoreFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Trend.BollingerBandWidthFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Trend.Ma50SlopeFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Volume.RelativeVolume30dFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Volume.VolumeZScore30dFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Volume.VolumePriceConfirmationFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Trend.Adx14Feature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Volume.AccumulationDistributionFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Trend.CloseVsMa50PctFeature>();
// ─── M2.2 Phase A ──────────────────────────────────────────────────────────
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Sector.SectorRelativeStrengthFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Volatility.EwmaVolatilityForecastFeature>();
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.V3.IFeature,
    Fintrest.Api.Services.Scoring.V3.Features.Revisions.AnalystRevisionBreadth90dFeature>();

// Orchestrator is a singleton so the Timer lives through the app's lifetime;
// HostedService auto-registers via AddHostedService and pulls the same instance.
builder.Services.AddSingleton<Fintrest.Api.Services.Scoring.V3.FeaturePopulationJob>();
builder.Services.AddHostedService(sp =>
    sp.GetRequiredService<Fintrest.Api.Services.Scoring.V3.FeaturePopulationJob>());

// IC tracking — §14.0 in docs/SIGNALS_V3.md. Skeleton only; computation lands
// after the schema is extended (sector + p-value + turnover + 60d horizon).
builder.Services.AddSingleton<Fintrest.Api.Services.Scoring.V3.AlgorithmIcTrackingJob>();
builder.Services.AddHostedService(sp =>
    sp.GetRequiredService<Fintrest.Api.Services.Scoring.V3.AlgorithmIcTrackingJob>());

// Firehose cache — write-through at 6:15 AM ET Mon–Fri (migration 020).
// Decouples /insiders + /congress from live FMP so transient provider errors
// don't cause blank pages.
builder.Services.AddSingleton<Fintrest.Api.Services.Ingestion.FirehoseIngestJob>();
builder.Services.AddHostedService(sp =>
    sp.GetRequiredService<Fintrest.Api.Services.Ingestion.FirehoseIngestJob>());

// Fundamentals Q/P/G sub-score service — §14.1 (migration 021). Used by a
// manual admin endpoint for now; nightly job wires in a later commit.
builder.Services.AddScoped<Fintrest.Api.Services.Scoring.FundamentalSubscoreService>();

// Admin health — shared service + daily email at 7:00 AM ET.
builder.Services.AddScoped<Fintrest.Api.Services.Health.SystemHealthService>();
builder.Services.AddSingleton<Fintrest.Api.Services.Health.DailyHealthEmailJob>();
builder.Services.AddHostedService(sp =>
    sp.GetRequiredService<Fintrest.Api.Services.Health.DailyHealthEmailJob>());

// Cron robustness — scoped service that persists last-run state to job_state.
// All jobs that should survive a backend restart without skipping a day must
// gate via this service (DailyCronJob, MorningBriefingJob, DailyHealthEmailJob
// are refactored; FeaturePopulationJob + AlgorithmIcTrackingJob to follow).
builder.Services.AddScoped<Fintrest.Api.Services.JobState.JobStateService>();

builder.Services.AddSingleton<Fintrest.Api.Services.Email.EmailService>();
builder.Services.AddSingleton<Fintrest.Api.Services.Billing.StripeService>();
builder.Services.AddScoped<Fintrest.Api.Services.Email.AlertDispatcher>();
builder.Services.AddHostedService<Fintrest.Api.Services.Email.MorningBriefingJob>();

// Background Jobs
builder.Services.AddHostedService<Fintrest.Api.Services.Pipeline.DailyCronJob>();
builder.Services.AddHostedService<Fintrest.Api.Services.Pipeline.IntradayDriftJob>();

// CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

// Controllers + Swagger
builder.Services.AddControllers();
builder.Services.AddOpenApi();

var app = builder.Build();

// Middleware pipeline
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options => options.SwaggerEndpoint("/openapi/v1.json", "Fintrest API"));
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// Health check
app.MapGet("/health", () => new { Status = "ok", Service = "Fintrest.ai API" });

app.Run();
