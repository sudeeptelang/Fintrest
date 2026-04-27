# Build + publish the API in one image. Multi-stage so the final image doesn't
# carry the SDK (smaller, faster cold starts, cleaner attack surface).
#
# This Dockerfile is resolved from `backend/Fintrest.Api` as build context, which
# is what Render's Root Directory setting points at. Make sure Render's build
# setting is "Dockerfile" (not "Render Native") so Render picks this up.

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — build + publish
# ─────────────────────────────────────────────────────────────────────────────
# SDK + runtime both pinned to 9.0 to match the csproj <TargetFramework>net9.0
# binary; .NET 10 runtime can't load a net9.0 assembly so a 10.0 base image
# crashed the container on startup ("You must install or update .NET").
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Restore first — lets Docker cache the NuGet layer when only source changes.
COPY *.csproj ./
RUN dotnet restore

# Bring in the rest of the source.
COPY . ./

# Publish a trimmed, self-contained output into /app. Release config = optimized.
RUN dotnet publish -c Release -o /app --no-restore

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — runtime
# ─────────────────────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS runtime
WORKDIR /app
COPY --from=build /app ./

# Kestrel binds to port 8080 on all interfaces. Fly's fly.toml points
# internal_port=8080 at this, and Render's auto-injected $PORT defaults to 8080
# if you use the Render Docker environment. Docker ENV doesn't do runtime shell
# expansion, so we hard-code the port here — simpler than a shell-form entrypoint.
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

# Render's health check ($PORT/) will get the Kestrel 404 root — that's fine,
# it just needs the service to respond on the port. Health check URL can be
# overridden in Render settings to /api/v1/market/pulse if you want stricter.
EXPOSE 8080

ENTRYPOINT ["dotnet", "Fintrest.Api.dll"]
