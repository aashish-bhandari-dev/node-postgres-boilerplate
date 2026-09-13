import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { HttpStatus } from '../constants/httpStatus';
import { ApiResponse } from '../utils/apiResponse';

export class HealthController {
  static async check(_req: Request, res: Response): Promise<void> {
    const startTime = Date.now();
    let dbStatus = 'healthy';
    let dbLatencyMs = 0;

    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbLatencyMs = Date.now() - dbStart;
    } catch (error) {
      dbStatus = 'unreachable';
    }

    const memoryUsage = process.memoryUsage();
    const isHealthy = dbStatus === 'healthy';

    const healthData = {
      status: isHealthy ? 'healthy' : 'degraded',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      responseTimeMs: Date.now() - startTime,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      system: {
        nodeVersion: process.version,
        memoryUsageMb: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        },
      },
    };

    ApiResponse.send(
      res,
      isHealthy ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE,
      isHealthy ? 'System is healthy' : 'System is degraded',
      healthData,
    );
  }
}
