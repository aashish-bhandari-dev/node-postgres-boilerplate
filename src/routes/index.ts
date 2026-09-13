import { Router } from 'express';
import healthRoutes from './health.routes';
import userRoutes from './user.routes';
import adminRoutes from '../admin/admin.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

export default router;
