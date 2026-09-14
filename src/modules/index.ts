import { Blueprint } from '../core/blueprint';
import { userModule } from './user.module';

/**
 * Registered API Modules
 *
 * To add endpoints for a new model:
 * 1. Define model in prisma/schema.prisma
 * 2. Create `src/modules/<model>.module.ts` using `defineBlueprint({ model: '<model>' })`
 * 3. Add it to this array.
 * Endpoints are immediately available at `/api/<model>s` and `/api/v1/<model>s`!
 */
export const modules: Blueprint[] = [userModule];
