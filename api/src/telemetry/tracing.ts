import { trace, context, SpanStatusCode } from '@opentelemetry/api';
import { Request, Response, NextFunction } from 'express';
import { log } from './logger';
import { recordApiCall } from './metrics';

const tracer = trace.getTracer('product-api', '1.0.0');

/**
 * Express middleware for tracing HTTP requests
 */
export function tracingMiddleware(req: Request, res: Response, next: NextFunction) {
  const span = tracer.startSpan(`${req.method} ${req.path}`, {
    attributes: {
      'http.method': req.method,
      'http.url': req.url,
      'http.target': req.path,
      'http.host': req.hostname,
    },
  });

  // Run the rest of the middleware in the span's context
  const startTime = Date.now();
  context.with(trace.setSpan(context.active(), span), () => {
    // Capture response
    const originalSend = res.send;
    res.send = function (data: any) {
      const duration = Date.now() - startTime;

      span.setAttributes({
        'http.status_code': res.statusCode,
        'http.duration_ms': duration,
      });

      log.info(`${req.method} ${req.path}`, {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration_ms: duration,
      });

      if (res.statusCode >= 400) {
        span.setStatus({ code: SpanStatusCode.ERROR });
      }

      return originalSend.call(this, data);
    };

    res.on('finish', () => {
      recordApiCall(req.method, req.path, res.statusCode, Date.now() - startTime);
      span.end();
    });

    next();
  });
}

/**
 * Create a new span for async operations
 */
export function createSpan<T>(
  name: string,
  fn: (span: any) => Promise<T>
): Promise<T> {
  const span = tracer.startSpan(name);
  return context.with(trace.setSpan(context.active(), span), async () => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({ 
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Add attributes to current span
 */
export function addSpanAttributes(attributes: Record<string, any>) {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

/**
 * Record an event on current span
 */
export function recordSpanEvent(name: string, attributes?: Record<string, any>) {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}
