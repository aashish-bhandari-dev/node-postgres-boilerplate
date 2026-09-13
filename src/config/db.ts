import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger';

declare global {
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
  const devPrisma = prisma as unknown as {
    $on(event: 'query', callback: (e: Prisma.QueryEvent) => void): void;
    $on(event: 'error', callback: (e: Prisma.LogEvent) => void): void;
  };

  devPrisma.$on?.('query', (e: Prisma.QueryEvent) => {
    logger.debug(
      `Prisma Query: ${e.query} [Params: ${e.params}] (Duration: ${e.duration}ms)`,
    );
  });

  devPrisma.$on?.('error', (e: Prisma.LogEvent) => {
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
