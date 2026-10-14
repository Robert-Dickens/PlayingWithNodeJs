# Getting started

This guide runs the API, web app, and their supporting services locally. Choose Docker Compose for a one-command setup, or start services individually for development.

## Prerequisites

- **Docker Desktop** with Docker Compose for the containerized setup, or PostgreSQL, Redis, and RabbitMQ installed locally
- **Node.js 20 or later** and npm for local API/web development
- **.NET 10 SDK** and Docker if running the Aspire AppHost

## Option 1: Docker Compose

From the solution root:

```sh
docker compose -f docker/docker-compose.yml up --build
```

Compose starts PostgreSQL, Redis, RabbitMQ, the API, and the web app. First-time image builds may take a few minutes.

| Service | Address |
| --- | --- |
| Web app | <http://localhost:5173> |
| API health | <http://localhost:3001/health> |
| API Swagger UI | <http://localhost:3001/api-docs> |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| RabbitMQ AMQP | `localhost:5672` |
| RabbitMQ management | <http://localhost:15672> (`guest` / `guest`) |

Stop the stack with `Ctrl+C`. To stop and remove containers while preserving the named PostgreSQL data volume, run `docker compose -f docker/docker-compose.yml down` in another terminal. To also delete that data volume, add `-v`.

The Compose API healthcheck invokes `curl` in the API image; that utility may not be present in the Node Alpine image. If the API works but Compose reports it as unhealthy, treat the healthcheck result cautiously and verify `/health` directly.

## Option 2: .NET Aspire

Aspire orchestrates PostgreSQL, Redis, RabbitMQ, API, and web app. From the solution root:

```sh
dotnet run --project aspire/AspireHost.csproj
```

The AppHost builds and serves both Node apps, so their dependencies must be installed. If needed, run `npm ci` once in both `api/` and `web/` before starting Aspire. Docker must be available for the infrastructure containers. The dashboard and service URLs are assigned at runtime; use the addresses printed by Aspire rather than assuming fixed ports.

The Aspire project targets `net10.0` and uses development credentials. For local environment overrides, see [api/.env.example](api/.env.example) and [aspire/appsettings.json](aspire/appsettings.json).

## Option 3: Run each app locally

Start PostgreSQL, Redis, and RabbitMQ first. The API defaults to PostgreSQL `localhost:5432`, Redis `localhost:6379`, RabbitMQ `localhost:5672`, and HTTP port `3001`. The sample credentials match the Compose defaults and are for development only.

### API

In a terminal at the solution root:

```sh
cd api
npm ci
```

Copy `api/.env.example` to `api/.env` if you want to change the defaults. Then start the development server:

```sh
npm run dev
```

The API listens at <http://localhost:3001>. `npm run build` compiles TypeScript to `api/dist`, `npm start` runs that build, and `npm run lint` performs a TypeScript check without emitting files.

### Web app

In a second terminal:

```sh
cd web
npm ci
npm run dev
```

Vite serves the dashboard at <http://localhost:5173>. The web app reads `VITE_API_URL` when set; by default, REST requests use `http://localhost:3001/api` and the Socket.IO connection uses `http://localhost:3001`. You can set the variable to either the API origin or its `/api` base path.

## Verify the API

Once its dependencies are running, request the health endpoint:

```sh
curl http://localhost:3001/health
```

A successful response contains `status`, `timestamp`, and `uptime`. This endpoint reports API process health; it is not a dependency readiness probe. Try the REST examples in [API_EXAMPLES.md](API_EXAMPLES.md).

## Configuration

The API loads `api/.env` in local runs. Common variables are `API_PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `REDIS_HOST`, `REDIS_PORT`, `RABBITMQ_URL`, `CORS_ORIGIN`, and `LOG_LEVEL`. Aspire injects service connection settings for its own run. Do not commit real credentials or use sample credentials outside development.

## Troubleshooting

- **API exits during startup:** confirm PostgreSQL, Redis, and RabbitMQ are accepting connections at the configured addresses. The API requires all three.
- **Port already in use:** stop the other process or change the corresponding service mapping/configuration before restarting.
- **Web app cannot reach the API:** verify the API is listening on port `3001` and `VITE_API_URL` points to the API origin. The REST paths are prefixed with `/api`.
- **Aspire service URLs differ:** use the URLs reported by the Aspire dashboard/console; host ports can be dynamically assigned.
