import { createClient } from 'redis';
import { config } from '../config/environment';
import { log } from '../telemetry/logger';

const redisUrl = config.redis.url ?? `redis://${config.redis.host}:${config.redis.port}`;

const redisOptions: any = {
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        return new Error('Redis reconnect retries exceeded');
      }
      return Math.min(retries * 100, 2000);
    },
  },
};

if (config.redis.tls) {
  redisOptions.socket.tls = true;
  redisOptions.socket.rejectUnauthorized = false;
  redisOptions.socket.serverName = config.redis.host;
}

export const redisClient = createClient(redisOptions);

redisClient.on('error', (err) => {
  log.error('Redis client error', {
    error: err instanceof Error ? {
      name: err.name,
      message: err.message,
      stack: err.stack,
    } : { value: String(err) },
  });
});
redisClient.on('connect', () => log.info('Redis connected'));

export async function initializeRedis() {
  try {
    if (redisClient.isOpen || redisClient.isReady) {
      return;
    }

    for (let attempt = 1; attempt <= 15; attempt++) {
      try {
        await redisClient.connect();
        return;
      } catch (err) {
        if (attempt === 15) {
          throw err;
        }

        log.warn('Redis initialization failed, retrying...', {
          attempt,
          maxAttempts: 15,
          error: err instanceof Error ? {
            name: err.name,
            message: err.message,
            stack: err.stack,
          } : { value: String(err) },
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  } catch (err) {
    log.error('Redis initialization failed', {
      error: err instanceof Error ? {
        name: err.name,
        message: err.message,
        stack: err.stack,
      } : { value: String(err) },
    });
    throw err;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    log.error('Cache get error', { key, error: err });
    return null;
  }
}

export async function cacheSet(key: string, value: any, ttl: number = 3600): Promise<void> {
  try {
    await redisClient.setEx(key, ttl, JSON.stringify(value));
  } catch (err) {
    log.error('Cache set error', { key, ttl, error: err });
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await redisClient.del(key);
  } catch (err) {
    log.error('Cache delete error', { key, error: err });
  }
}

export async function cacheClear(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
      log.debug('Cache cleared', { pattern, keys_deleted: keys.length });
    }
  } catch (err) {
    log.error('Cache clear error', { pattern, error: err });
  }
}
