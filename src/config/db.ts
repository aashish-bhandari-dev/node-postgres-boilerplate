import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Prevent multiple PrismaClient instances during hot-reloads in development
export const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : ['error'],
  });

if (process.env.NODE_ENV === 'development') {
  // Log Prisma query events in development
  (prisma as any).$on?.('query', (e: any) => {
    logger.debug(`Prisma Query: ${e.query} [Params: ${e.params}] (Duration: ${e.duration}ms)`);
  });

  (prisma as any).$on?.('error', (e: any) => {
    logger.error(`Prisma Error: ${e.message}`);
  });

  global.prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info('🐘 PostgreSQL database connected successfully via Prisma');
  } catch (error) {
    logger.error('❌ Failed to connect to PostgreSQL database:', error);
    // Don't kill process immediately on connection failure so server can still boot and show healthcheck status
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('🐘 Prisma disconnected gracefully');
  } catch (error) {
    logger.error('❌ Error disconnecting Prisma:', error);
  }
}
