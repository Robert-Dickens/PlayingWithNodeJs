using Aspire.Hosting;

var builder = DistributedApplication.CreateBuilder(args);

var username = builder.AddParameter("username", secret: false);
var password = builder.AddParameter("password", secret: false);

// Add PostgreSQL database
var postgres = builder.AddPostgres("postgres", username, password)
    .WithImage("ankane/pgvector")
    .WithImageTag("latest")
    .WithEnvironment("POSTGRES_DB", "productdb")
    .WithBindMount("postgres_data", "/var/lib/postgresql/data");

var postgresDb = postgres.AddDatabase("productdb");

// Add Redis cache
var redis = builder.AddRedis("redis");

// Add RabbitMQ message broker
var rabbitUser = builder.AddParameter("rabbitmq-user", "productuser", secret: false);
var rabbitPassword = builder.AddParameter("rabbitmq-password", "productpass", secret: true);

var rabbitmq = builder.AddRabbitMQ("rabbitmq", rabbitUser, rabbitPassword)
    .WithImage("rabbitmq")
    .WithImageTag("4.1.3-management");

// Serve the API after building it
var api = builder.AddNpmApp("api", "../api", "serve")
    .WithHttpEndpoint(targetPort: 3001)
    .WithEnvironment("NODE_ENV", "development")
    .WithEnvironment("API_PORT", "3001")
    .WithEnvironment("CORS_ORIGIN", "http://localhost:5173")
    .WithEnvironment("LOG_LEVEL", "info")
    .WaitFor(postgresDb)
    .WaitFor(redis)
    .WaitFor(rabbitmq)
    .WithReference(postgresDb, "productdb")
    .WithReference(redis,"redis")
    .WithReference(rabbitmq,"rabbitmq");

// Serve the React app after building it
var web = builder.AddNpmApp("web", "../web", "serve")
    .WithHttpEndpoint(targetPort: 5173)
    .WithEnvironment("VITE_API_URL", "http://localhost:3001");

var app = builder.Build();

await app.RunAsync();
