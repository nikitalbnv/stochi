# Observability

Local observability uses the LGTM stack:

- Loki for logs
- Grafana for dashboards and querying
- Tempo for traces
- Mimir for Prometheus-compatible metrics

## Start The Stack

```bash
cd infra/observability
docker compose up -d
```

Grafana runs at <http://localhost:3001>. The local credentials are `admin` / `admin`.

## Web App Logs

The Next.js app writes structured server logs through `~/lib/logger`. Set these values in `apps/web/.env` to push logs directly into local Loki:

```bash
SERVICE_NAME="stochi-web"
LOG_LEVEL="debug"
LOG_FORMAT="json"
LOG_LOKI_URL="http://localhost:3100/loki/api/v1/push"
```

Production can leave `LOG_LOKI_URL` unset and collect JSON stdout with the platform log collector or Promtail.

## Production Logs Without Grafana Cloud

Yes, but the production app must be able to reach Loki over HTTPS. Do not expose the unauthenticated local Loki container directly to the public internet.

Recommended non-cloud path:

1. Deploy this same `infra/observability` stack on a small VPS or private server.
2. Put Loki behind a reverse proxy with TLS and authentication.
3. Set production web app environment variables:

```bash
SERVICE_NAME="stochi-web"
LOG_LEVEL="info"
LOG_FORMAT="json"
LOG_LOKI_URL="https://observability.example.com/loki/api/v1/push"
LOG_LOKI_USERNAME="<basic_auth_username>"
LOG_LOKI_TOKEN="<basic_auth_password_or_token>"
```

If the proxy uses bearer auth instead of basic auth, leave `LOG_LOKI_USERNAME` empty and set only `LOG_LOKI_TOKEN`.

Then view production logs in Grafana Explore with:

```logql
{service="stochi-web", environment="production"}
{service="stochi-web", environment="production", level="error"}
```

For the Go engine, keep `LOG_FORMAT=json` and collect stdout with the host's log agent, Docker logging driver, or Promtail. If the engine runs on the same VPS as Loki, Promtail can scrape its container logs directly.

## Engine Logs

The Go engine uses structured `slog` output and request logging. Set these values in `apps/engine/.env` or the engine runtime environment:

```bash
SERVICE_NAME=stochi-engine
LOG_LEVEL=info
LOG_FORMAT=json
```

## Query Logs

In Grafana, open Explore and choose the Loki data source. Useful starter queries:

```logql
{service="stochi-web"}
{service="stochi-engine"}
{level="error"}
```

Tempo accepts OTLP on `localhost:4317` and `localhost:4318`. Mimir accepts Prometheus remote write at `http://localhost:9009/api/v1/push` and can be queried from Grafana through the pre-provisioned Mimir data source.
