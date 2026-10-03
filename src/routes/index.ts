import { Router, Request, Response } from 'express';
import healthRoutes from './health.routes';
import authRoutes from './auth.routes';
import permissionRoutes from './permission.routes';
import roleRoutes from './role.routes';
import { modules } from '../modules';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// System health check
router.use('/health', healthRoutes);

// Authentication & Account Management
router.use('/auth', authRoutes);

// Permission Management & Catalog
router.use('/permissions', permissionRoutes);

// Role Management
router.use('/roles', roleRoutes);

// Dynamically mount all registered blueprint modules
for (const mod of modules) {
  router.use(`/${mod.path}`, mod.router);
}

// Directory / Manifest endpoint
router.get('/', (_req: Request, res: Response) => {
  const manifest = modules.map((m) => ({
    model: m.model,
    path: `/${m.path}`,
    endpoints: [
      `GET    /${m.path} (List with pagination, search, sort)`,
      `GET    /${m.path}/:id (Get single record)`,
      `POST   /${m.path} (Create record)`,
      `PUT    /${m.path}/:id (Update/replace record)`,
      `PATCH  /${m.path}/:id (Update record)`,
      `DELETE /${m.path}/:id (Delete record)`,
    ],
  }));

  ApiResponse.success(res, 'API Modules Manifest', manifest);
});

export default router;
