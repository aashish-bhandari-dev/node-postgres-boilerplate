import { PrismaClient } from '@prisma/client';
import { SYSTEM_PERMISSIONS } from '../../src/constants/permissions';
import { RolePermissions } from '../../src/constants/roles';

export async function seedPermissions(
  prisma: PrismaClient,
  roleMap: Map<string, string>,
): Promise<Map<string, string>> {
  console.log('📦 Seeding permissions catalog...');
  const permissionRecordMap = new Map<string, string>(); 

  for (const perm of SYSTEM_PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {
        displayName: perm.displayName,
        description: perm.description,
        module: perm.module,
        action: perm.action,
      },
      create: {
        name: perm.name,
        displayName: perm.displayName,
        description: perm.description,
        module: perm.module,
        action: perm.action,
      },
    });
    permissionRecordMap.set(record.name, record.id);
  }

  // Seed default role-permission assignments
  console.log('🛡️  Seeding default role permissions...');
  for (const [roleName, permNames] of Object.entries(RolePermissions)) {
    const roleId = roleMap.get(roleName);
    if (!roleId) continue;

    for (const permName of permNames) {
      const permissionId = permissionRecordMap.get(permName);
      if (permissionId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId,
              permissionId,
            },
          },
          update: {},
          create: {
            roleId,
            permissionId,
          },
        });
      }
    }
  }

  return permissionRecordMap;
}
