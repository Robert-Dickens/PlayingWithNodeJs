import { Pool, PoolClient } from 'pg';
import { config } from '../config/environment';
import { log } from '../telemetry/logger';

export const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  database: config.database.name,
  user: config.database.user,
  password: config.database.password,
});

async function retry<T>(operation: () => Promise<T>, operationName: string, maxAttempts = 15): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts) {
        throw error;
      }

      log.warn(`${operationName} failed, retrying...`, {
        attempt,
        maxAttempts,
        error: error instanceof Error ? error.message : String(error),
      });

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw lastError;
}

export async function initializeDatabase() {
  try {
    await retry(async () => {
      const client = await pool.connect();
      log.info('Database connected', {
        host: config.database.host,
        database: config.database.name,
      });

      await client.query(`
        CREATE TABLE IF NOT EXISTS products (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10, 2) NOT NULL,
          stock_quantity INT DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS product_details (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
          sku VARCHAR(255) UNIQUE NOT NULL,
          weight DECIMAL(10, 2),
          dimensions VARCHAR(255),
          color VARCHAR(100),
          material VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      await client.query(`CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_product_details_product_id ON product_details(product_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_product_details_sku ON product_details(sku);`);

      log.info('Database tables initialized');
      client.release();
    }, 'Database initialization');
  } catch (err) {
    log.error('Database initialization failed', { error: err });
    throw err;
  }
}

export async function query(text: string, params?: any[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    log.debug('Database query executed', {
      query_text: text.substring(0, 50),
      duration_ms: duration,
      rows_affected: result.rowCount,
    });
    return result;
  } catch (error) {
    log.error('Database query error', {
      query_text: text.substring(0, 50),
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}
