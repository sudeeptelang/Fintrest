using System.Text;
using Fintrest.Api.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// Database — Supabase PostgreSQL
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"))
           .UseSnakeCaseNamingConvention());

// Auth — Validate Supabase JWT tokens
var supabaseJwtSecret = builder.Configuration["Supabase:JwtSecret"]!;
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = $"{builder.Configuration["Supabase:Url"]}/auth/v1",
            ValidAudience = "authenticated",
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(supabaseJwtSecret)),
            NameClaimType = "sub",  // Supabase user ID is in "sub" claim
        };
    });
builder.Services.AddAuthorization();

// Data Providers
builder.Services.AddHttpClient<Fintrest.Api.Services.Providers.Contracts.IMarketDataProvider,
    Fintrest.Api.Services.Providers.Polygon.PolygonProvider>();
builder.Services.AddHttpClient<Fintrest.Api.Services.Providers.Contracts.IFundamentalsProvider,
    Fintrest.Api.Services.Providers.FMP.FmpProvider>();
builder.Services.AddHttpClient<Fintrest.Api.Services.Providers.Contracts.INewsProvider,
    Fintrest.Api.Services.Providers.Finnhub.FinnhubProvider>();

// Services
builder.Services.AddScoped<Fintrest.Api.Services.Ingestion.DataIngestionService>();
builder.Services.AddScoped<Fintrest.Api.Services.Pipeline.ScanOrchestrator>();
builder.Services.AddScoped<Fintrest.Api.Services.Portfolio.PortfolioService>();
builder.Services.AddScoped<Fintrest.Api.Services.Portfolio.PortfolioAiAdvisor>();
builder.Services.AddScoped<Fintrest.Api.Services.Portfolio.RiskAnalytics>();
builder.Services.AddScoped<Fintrest.Api.Services.Portfolio.PortfolioImporter>();
builder.Services.AddScoped<Fintrest.Api.Services.Portfolio.ClaudeFinancialAdvisor>();

// Background Jobs
builder.Services.AddHostedService<Fintrest.Api.Services.Pipeline.DailyCronJob>();

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
