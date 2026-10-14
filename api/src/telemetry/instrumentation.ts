import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';

const resource = defaultResource().merge(
  resourceFromAttributes({
    'service.name': 'product-api',
    'service.version': '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  })
);

const traceExporter = new OTLPTraceExporter();

const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter(),
});

export const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader,
  logRecordProcessors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Log via a simple console.log since logger isn't initialized yet
console.log('[Telemetry] OpenTelemetry SDK started');
