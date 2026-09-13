import { CrudModule } from '../core/crud';
import { userModule } from './user.module';
import { postModule } from './post.module';

/**
 * Registered API Modules
 *
 * To add full CRUD for a new model:
 * 1. Define model in prisma/schema.prisma
 * 2. Create `src/modules/<model>.module.ts` using `defineModule({ model: '<model>' })`
 * 3. Add it to this array.
 * Endpoints are immediately available at `/api/<model>s` and `/api/v1/<model>s`!
 */
export const modules: CrudModule[] = [
  userModule,
  postModule,
];
