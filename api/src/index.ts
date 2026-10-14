// Load local environment variables before importing modules that read process.env.
import 'dotenv/config';

// Initialize telemetry before importing the application modules.
import { sdk } from './telemetry/instrumentation';

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import swaggerUi from 'swagger-ui-express';
import { config } from './config/environment';
import { initializeDatabase } from './database/postgres';
import { initializeRedis } from './database/redis';
import { initializeRabbitMQ, closeRabbitMQ } from './database/rabbitmq';
import { initializeWebSocket } from './websocket/socketServer';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import { tracingMiddleware } from './telemetry/tracing';
import { log } from './telemetry/logger';
import { swaggerSpec } from './swagger';
import productRoutes from './routes/products';
import productDetailRoutes from './routes/productDetails';

async function bootstrap() {
  const app: Express = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Add tracing middleware
  app.use(tracingMiddleware);

  // Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

  // Request logging with telemetry
  app.use((req: Request, res: Response, next) => {
    log.info(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // Initialize services
  try {
    log.info('Initializing services...');
    await initializeDatabase();
    await initializeRedis();
    await initializeRabbitMQ();
  } catch (err) {
    log.error('Service initialization failed', { error: err });
    process.exit(1);
  }

  // Create HTTP server
  const httpServer = createServer(app);

  // Initialize WebSocket
  initializeWebSocket(httpServer);

  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Health check endpoint
   *     description: Check the health status and uptime of the API server
   *     tags:
   *       - Health
   *     responses:
   *       200:
   *         description: Server is healthy
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthResponse'
   */
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // API Routes
  app.use('/api/products', productRoutes);
  app.use('/api/product-details', productDetailRoutes);

  // Error handling
  app.use(errorHandler);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Start server
  httpServer.listen(config.port, () => {
    log.info(`Server running at http://localhost:${config.port}`, {
      port: config.port,
      environment: config.nodeEnv,
    });
  });

  // Graceful shutdown
  const shutdown = () => {
    log.info('Shutdown signal received, shutting down gracefully...');
    httpServer.close(async (serverError) => {
      try {
        await closeRabbitMQ();
      } catch (error) {
        log.error('Error closing RabbitMQ', { error });
      }

      try {
        await sdk.shutdown();
      } catch (error) {
        log.error('Error shutting down OpenTelemetry SDK', { error });
      }

      process.exit(serverError ? 1 : 0);
    });
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

bootstrap().catch((err) => log.error('Bootstrap failed', { error: err }));
