# Solution overview

## Purpose

FullStackApp is a development scaffold for exploring a small product catalog system across a TypeScript API, a React web client, and commonly used service infrastructure. It demonstrates separated API and UI projects, relational persistence, caching, message-based event delivery, real-time notifications, and telemetry.

## What is included

- **REST API:** Express endpoints for products and product details, a health endpoint, Swagger UI, centralized error handling, and PostgreSQL initialization.
- **Data services:** PostgreSQL stores the records; Redis caches product and product-detail lookups; RabbitMQ carries product lifecycle events.
- **Real-time notifications:** API clients can subscribe to product changes over Socket.IO. Product service events are published through RabbitMQ and relayed to subscribed sockets.
- **Web client:** React/Vite application scaffold with a product-management component in the source tree.
- **Observability:** OpenTelemetry SDK/exporters, automatic instrumentation, custom API and WebSocket metrics, and Pino logging.
- **Run options:** Docker Compose for the stack, or .NET Aspire for local orchestration and dashboard integration.

## Domain model

A **Product** has an ID, name, optional description, price, stock quantity, and timestamps. A **ProductDetail** belongs to a product and has a unique SKU plus optional weight, dimensions, color, and material. The database creates these tables and indexes when the API starts; product detail rows are deleted with their product through a foreign key cascade.

## Request and event lifecycle

1. The client calls an API endpoint under `/api`.
2. The API reads/writes PostgreSQL and uses Redis for selected lookups.
3. Product create/update/delete operations invalidate product caches and publish a product event to RabbitMQ.
4. The API's broker consumer relays those product events to clients subscribed to the Socket.IO `products` room.
5. OpenTelemetry instrumentation and Pino logging provide diagnostics; under Aspire, telemetry is sent to its configured OTLP endpoint.

Product-detail operations use the database and invalidate detail caches on create/update. They do not currently publish the same RabbitMQ/Socket.IO lifecycle events as product CRUD.

## Current scope and limitations

- The active React entry point renders the default Vite starter screen. The product-management component exists but is not currently wired into that entry point, so the browser UI should be considered a scaffold rather than a finished catalog interface.
- API validation is intentionally minimal. Create endpoints check required fields, but there is no comprehensive type/range validation or authentication/authorization.
- Swagger UI is present, but some annotations/schema details can differ from route behavior. The examples in [API_EXAMPLES.md](API_EXAMPLES.md) describe the current implementation; the route files are authoritative.
- Health reports the API process and does not test downstream dependencies. The API itself requires PostgreSQL, Redis, and RabbitMQ to initialize before it listens.
- The Compose and Aspire definitions use development credentials/settings and are not hardened for production.

## Where to go next

- Run the services: [Getting started](GETTING_STARTED.md)
- Inspect service relationships and runtime flow: [Architecture](ARCHITECTURE.md)
- Call the API and subscribe to events: [API usage examples](API_EXAMPLES.md)
