import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import staticPlugin from '@fastify/static';
import { createServer } from 'http';
import path from 'path';

import { config } from './utils/config';
import { prisma, disconnectPrisma } from './utils/prisma';
import { AppError } from './utils/errors';
import { initSocket } from './modules/websocket/socket';

import { authRoutes } from './modules/auth/auth.routes';
import { companiesRoutes } from './modules/companies/companies.routes';
import { categoriesRoutes } from './modules/categories/categories.routes';
import { productsRoutes } from './modules/products/products.routes';
import { tablesRoutes } from './modules/tables/tables.routes';
import { qrRoutes } from './modules/qr/qr.routes';
import { ordersRoutes } from './modules/orders/orders.routes';
import { billsRoutes } from './modules/bills/bills.routes';
import { menuRoutes } from './modules/menu/menu.routes';
import { sessionsRoutes } from './modules/sessions/sessions.routes';

async function buildApp() {
  const fastify = Fastify({
    logger: true,
    trustProxy: true,
  });

  // Security
  await fastify.register(helmet, {
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });

  await fastify.register(cors, {
    origin: config.CORS_ORIGIN.split(',').map(s => s.trim()),
    credentials: true,
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  await fastify.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024,
      files: 1,
    },
  });

  // Serve uploaded files
  await fastify.register(staticPlugin, {
    root: path.resolve(config.UPLOAD_DIR),
    prefix: '/uploads/',
    decorateReply: false,
  });

  // Error handler
  fastify.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({
        error: error.name,
        message: error.message,
        statusCode: error.statusCode,
      });
      return;
    }

    // Fastify rate limit error
    if (error.statusCode === 429) {
      reply.status(429).send({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        statusCode: 429,
      });
      return;
    }

    // Unexpected errors - don't leak details
    fastify.log.error(error);
    reply.status(500).send({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
      statusCode: 500,
    });
  });

  // Health check
  fastify.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Register routes
  await fastify.register(authRoutes);
  await fastify.register(companiesRoutes);
  await fastify.register(categoriesRoutes);
  await fastify.register(productsRoutes);
  await fastify.register(tablesRoutes);
  await fastify.register(qrRoutes);
  await fastify.register(ordersRoutes);
  await fastify.register(billsRoutes);
  await fastify.register(sessionsRoutes);
  await fastify.register(menuRoutes);

  return fastify;
}

async function start() {
  const fastify = await buildApp();

  // Create HTTP server for Socket.io
  const httpServer = createServer(fastify.server);
  initSocket(httpServer);

  await fastify.ready();

  httpServer.listen(config.PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${config.PORT}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down...');
    await disconnectPrisma();
    httpServer.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
