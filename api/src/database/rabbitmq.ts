import * as amqp from 'amqplib';
import { config } from '../config/environment';
import { log } from '../telemetry/logger';
import EventEmitter from 'events';

export const messageEmitter = new EventEmitter();
let connection: any = null;
let channel: any = null;

export async function initializeRabbitMQ() {
  try {
    for (let attempt = 1; attempt <= 15; attempt++) {
      try {
        connection = await amqp.connect(config.rabbitmq.url);
        channel = await connection.createChannel();

        await channel.assertExchange('product_events', 'topic', { durable: true });
        await channel.assertQueue('product.created', { durable: true });
        await channel.assertQueue('product.updated', { durable: true });
        await channel.assertQueue('product.deleted', { durable: true });

        await channel.bindQueue('product.created', 'product_events', 'product.created');
        await channel.bindQueue('product.updated', 'product_events', 'product.updated');
        await channel.bindQueue('product.deleted', 'product_events', 'product.deleted');

        log.info('RabbitMQ connected', {
          url: config.rabbitmq.url.replace(/:[^@]*@/, ':***@'),
          exchange: 'product_events',
        });

        consumeProductEvents();
        return;
      } catch (err) {
        if (attempt === 15) {
          throw err;
        }

        log.warn('RabbitMQ initialization failed, retrying...', {
          attempt,
          maxAttempts: 15,
          error: err instanceof Error ? err.message : String(err),
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  } catch (err) {
    log.error('RabbitMQ initialization failed', { error: err });
    throw err;
  }
}

async function consumeProductEvents() {
  if (!channel) return;

  try {
    await channel.consume('product.created', (msg: any) => {
      if (msg) {
        const content = JSON.parse(msg.content.toString());
        messageEmitter.emit('product.created', content);
        channel?.ack(msg);
      }
    });

    await channel.consume('product.updated', (msg: any) => {
      if (msg) {
        const content = JSON.parse(msg.content.toString());
        messageEmitter.emit('product.updated', content);
        channel?.ack(msg);
      }
    });

    await channel.consume('product.deleted', (msg: any) => {
      if (msg) {
        const content = JSON.parse(msg.content.toString());
        messageEmitter.emit('product.deleted', content);
        channel?.ack(msg);
      }
    });
  } catch (err) {
    log.error('Error consuming product events', { error: err });
  }
}

export async function publishProductEvent(
  event: 'product.created' | 'product.updated' | 'product.deleted',
  data: any
) {
  if (!channel) {
    log.warn('RabbitMQ channel not available, event not published', {
      event_type: event,
    });
    return;
  }

  try {
    channel.publish(
      'product_events',
      event,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    log.debug('Event published to RabbitMQ', { event_type: event });
  } catch (err) {
    log.error('Error publishing event', { event_type: event, error: err });
  }
}

export async function closeRabbitMQ() {
  if (channel) await channel.close();
  if (connection) await connection.close();
}
