import pino from 'pino';
import { context, trace } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

// Create structured logger
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: process.env.NODE_ENV === 'development',
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
});

// Get tracer
export const tracer = trace.getTracer('product-api', '1.0.0');
const otelLogger = logs.getLogger('product-api', '1.0.0');

const severityNumbers = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
} as const;

// Log with trace context
export function logWithTrace(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: any) {
  const span = trace.getActiveSpan();
  const traceContext = span ? {
    traceId: span.spanContext().traceId,
    spanId: span.spanContext().spanId,
  } : {};

  const attributes = { ...traceContext, ...data };
  logger[level](attributes, message);
  otelLogger.emit({
    severityNumber: severityNumbers[level],
    severityText: level.toUpperCase(),
    body: message,
    attributes,
    context: context.active(),
  });
}

// Custom log functions
export const log = {
  info: (message: string, data?: any) => logWithTrace('info', message, data),
  warn: (message: string, data?: any) => logWithTrace('warn', message, data),
  error: (message: string, data?: any) => logWithTrace('error', message, data),
  debug: (message: string, data?: any) => logWithTrace('debug', message, data),
};
