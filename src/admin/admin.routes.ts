import { Router, Request, Response } from 'express';
import { adminResources } from './registry';
import { ApiResponse } from '../utils/apiResponse';

const router = Router();

// Index endpoint listing all available admin resources
router.get('/', (_req: Request, res: Response) => {
  const resourceList = adminResources.map((resource) => ({
    model: resource.model,
    path: `/api/v1/admin/${resource.path}`,
    endpoints: [
      `GET    /api/v1/admin/${resource.path} (List with pagination, search, sort)`,
      `GET    /api/v1/admin/${resource.path}/:id (Get single record)`,
      `POST   /api/v1/admin/${resource.path} (Create record)`,
      `PATCH  /api/v1/admin/${resource.path}/:id (Update record)`,
      `DELETE /api/v1/admin/${resource.path}/:id (Delete record)`,
    ],
  }));

  ApiResponse.success(res, 'Admin CRUD Resources Manifest', resourceList);
});

// Dynamically mount every registered CRUD resource router
for (const resource of adminResources) {
  router.use(`/${resource.path}`, resource.router);
}

export default router;
