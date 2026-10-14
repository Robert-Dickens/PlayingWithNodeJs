# FullStackApp

A full-stack reference solution combining a TypeScript/Express API, a React/Vite web client, PostgreSQL, Redis, RabbitMQ, Socket.IO, OpenTelemetry, and optional .NET Aspire orchestration.

## Documentation

- [Getting started](GETTING_STARTED.md) — prerequisites and ways to run the stack
- [Solution overview](SOLUTION_OVERVIEW.md) — goals, capabilities, and current scope
- [Architecture](ARCHITECTURE.md) — services, data flow, and infrastructure
- [API usage examples](API_EXAMPLES.md) — REST endpoints, request bodies, and Socket.IO events

## Quick start

With Docker installed, from the solution root:

```sh
docker compose -f docker/docker-compose.yml up --build
```

The main local endpoints are the API at <http://localhost:3001>, health check at <http://localhost:3001/health>, Swagger UI at <http://localhost:3001/api-docs>, and web app at <http://localhost:5173>. RabbitMQ management is at <http://localhost:15672> (development credentials: `guest` / `guest`).

For prerequisites, local development, Aspire, and shutdown instructions, see [Getting started](GETTING_STARTED.md).

## Technology

- **API:** Node.js 20, TypeScript, Express 5
- **Web:** React 19, Vite 8, TypeScript, Tailwind CSS 4
- **Persistence and infrastructure:** PostgreSQL 16, Redis 7, RabbitMQ
- **Real-time:** Socket.IO; RabbitMQ relays product events to connected API clients
- **Observability:** OpenTelemetry OTLP exporters and Pino structured logging
- **Orchestration:** Docker Compose or .NET Aspire (targets .NET 10)

## Important scope notes

- The active web client is a responsive, Flowbite-inspired admin dashboard. Its sidebar links to the product and product-detail CRUD screens; the overview includes catalog and inventory summaries.
- The toolbar notification drawer stores up to 100 recent items in browser local storage. Live product create/update/delete messages arrive over Socket.IO through RabbitMQ; product-detail changes are not broadcast to other clients.
- The product-detail screen loads details through the per-product lookup endpoint. There is no endpoint to list every detail record, and the UI presents one returned record per product even though the database can store multiple detail rows for a product.
- The API initializes PostgreSQL, Redis, and RabbitMQ at startup. If one is unavailable or misconfigured, the API exits rather than starting partially.
- Swagger UI is available at `/api-docs`. Some generated OpenAPI annotations may lag the implemented product-detail fields; use the route implementation and [API examples](API_EXAMPLES.md) as the behavior reference.
- Compose and Aspire are development setups with sample credentials, not production deployment configurations.
