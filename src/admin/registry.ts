import { CrudResource } from '../core/crud';
import { postAdminResource } from './resources/post.resource';
import { userAdminResource } from './resources/user.resource';

/**
 * Registry of all Admin Auto-CRUD resources.
 *
 * To register a new model CRUD:
 * 1. Create a resource file in `src/admin/resources/{model}.resource.ts`
 * 2. Add the exported resource to this array.
 * That's it! Full CRUD routes will be automatically mounted.
 */
export const adminResources: CrudResource[] = [
  postAdminResource,
  userAdminResource,
];
