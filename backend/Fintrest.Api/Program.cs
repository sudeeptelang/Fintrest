using System.Text;
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
builder.Services.AddAuthorization();

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

// Orchestrator is a singleton so the Timer lives through the app's lifetime;
// HostedService auto-registers via AddHostedService and pulls the same instance.
builder.Services.AddSingleton<Fintrest.Api.Services.Scoring.V3.FeaturePopulationJob>();
builder.Services.AddHostedService(sp =>
    sp.GetRequiredService<Fintrest.Api.Services.Scoring.V3.FeaturePopulationJob>());

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
