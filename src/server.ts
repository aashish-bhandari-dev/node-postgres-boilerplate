import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';
import { logger } from './utils/logger';

let server: http.Server;

async function bootstrap() {
  // Connect to PostgreSQL via Prisma
  await connectDatabase();

  server = http.createServer(app);

  server.listen(env.PORT, () => {
    logger.info('🚀 Server running in ' + env.NODE_ENV + ' mode');
    logger.info(`📡 Server address: http://${env.HOST}:${env.PORT}`);
    logger.info(`📖 API Documentation: http://${env.HOST}:${env.PORT}/api-docs`);
    logger.info(`💓 Health Check: http://${env.HOST}:${env.PORT}/api/v1/health`);
  });
}

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');
      await disconnectDatabase();
      process.exit(0);
    });

    // Force close if graceful shutdown takes too long (10s)
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    await disconnectDatabase();
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Promise Rejection:', reason);
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception thrown:', error);
  process.exit(1);
});

bootstrap();
