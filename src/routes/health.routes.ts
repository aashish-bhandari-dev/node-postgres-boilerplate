import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';

const router = Router();

/**
 * @openapi
 * /api/v1/health:
 *   get:
 *     summary: System health and database connectivity check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: System and database are healthy
 *       503:
 *         description: Database or critical dependency is down
 */
router.get('/', HealthController.check);

export default router;
