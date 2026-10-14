# .NET Aspire Host

This directory will contain the .NET Aspire AppHost orchestration.

## Setup

`ash
dotnet new aspire-starter -n AspireHost
cd AspireHost
`

## Configuration

The Aspire host will orchestrate:
- Node.js API service (port 3001)
- React frontend (port 5173)
- PostgreSQL database (port 5432)
- Redis cache (port 6379)
- RabbitMQ message broker (port 5672)

## Running

`ash
dotnet run
`

This will start the Aspire dashboard and all services.
