import { metrics } from '@opentelemetry/api';
import { SpanStatusCode } from '@opentelemetry/api';

const meterProvider = metrics.getMeterProvider();
const meter = meterProvider.getMeter('product-api', '1.0.0');

// Create metrics
export const apiCallCounter = meter.createCounter('api_calls_total', {
  description: 'Total number of API calls',
});

export const apiDurationHistogram = meter.createHistogram('api_call_duration_ms', {
  description: 'API call duration in milliseconds',
});

export const activeConnectionGauge = meter.createUpDownCounter('active_connections', {
  description: 'Number of active connections',
});

export const cacheHitCounter = meter.createCounter('cache_hits_total', {
  description: 'Total cache hits',
});

export const cacheMissCounter = meter.createCounter('cache_misses_total', {
  description: 'Total cache misses',
});

export const databaseQueryCounter = meter.createCounter('database_queries_total', {
  description: 'Total database queries',
});

export const databaseQueryDurationHistogram = meter.createHistogram('database_query_duration_ms', {
  description: 'Database query duration in milliseconds',
});

export const messageQueueCounter = meter.createCounter('message_queue_events', {
  description: 'Total message queue events',
});

export const websocketConnectionCounter = meter.createUpDownCounter('websocket_connections', {
  description: 'Number of active WebSocket connections',
});

// Helper functions to record metrics
export function recordApiCall(method: string, path: string, statusCode: number, duration: number) {
  apiCallCounter.add(1, {
    method,
    path,
    status_code: statusCode,
  });

  apiDurationHistogram.record(duration, {
    method,
    path,
  });
}

export function recordCacheHit(key: string) {
  cacheHitCounter.add(1, { key });
}

export function recordCacheMiss(key: string) {
  cacheMissCounter.add(1, { key });
}

export function recordDatabaseQuery(query: string, duration: number) {
  databaseQueryCounter.add(1, { query_type: query });
  databaseQueryDurationHistogram.record(duration, { query_type: query });
}

export function recordMessageQueueEvent(eventType: string) {
  messageQueueCounter.add(1, { event_type: eventType });
}

export function recordWebSocketConnection(connected: boolean) {
  websocketConnectionCounter.add(connected ? 1 : -1);
}
