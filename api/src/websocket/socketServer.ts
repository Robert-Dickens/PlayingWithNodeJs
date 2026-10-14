import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { config } from '../config/environment';
import { messageEmitter } from '../database/rabbitmq';
import { log } from '../telemetry/logger';
import { recordWebSocketConnection } from '../telemetry/metrics';

export let io: SocketIOServer;

export function initializeWebSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: config.websocket.cors,
  });

  io.on('connection', (socket) => {
    log.info('WebSocket client connected', { client_id: socket.id });
    recordWebSocketConnection(true);

    socket.on('subscribe_products', () => {
      socket.join('products');
      socket.emit('subscribed', { channel: 'products' });
      log.debug('Client subscribed to products', { client_id: socket.id });
    });

    socket.on('disconnect', () => {
      log.info('WebSocket client disconnected', { client_id: socket.id });
      recordWebSocketConnection(false);
    });
  });

  // Listen to RabbitMQ events and broadcast to connected clients
  messageEmitter.on('product.created', (data) => {
    io.to('products').emit('product:created', data);
    log.debug('Broadcast product.created', { product_id: data.id });
  });

  messageEmitter.on('product.updated', (data) => {
    io.to('products').emit('product:updated', data);
    log.debug('Broadcast product.updated', { product_id: data.id });
  });

  messageEmitter.on('product.deleted', (data) => {
    io.to('products').emit('product:deleted', data);
    log.debug('Broadcast product.deleted', { product_id: data.id });
  });
}

export function broadcastEvent(event: string, data: any) {
  io.emit(event, data);
}
