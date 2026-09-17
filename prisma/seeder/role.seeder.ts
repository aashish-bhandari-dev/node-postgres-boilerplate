import { PrismaClient } from '@prisma/client';
import { RoleHierarchy } from '../../src/constants/roles';

export async function seedRoles(prisma: PrismaClient): Promise<Map<string, string>> {
  console.log('🎭 Seeding roles...');
  const roleDefinitions = [
    {
      name: 'SUPER_ADMIN',
      displayName: 'Super Admin',
      description: 'Full system access',
      hierarchy: RoleHierarchy['SUPER_ADMIN'] ?? 100,
      isSystem: true,
    },
    {
      name: 'ADMIN',
      displayName: 'Admin',
      description: 'Administrative access',
      hierarchy: RoleHierarchy['ADMIN'] ?? 80,
      isSystem: true,
    },
    {
      name: 'MANAGER',
      displayName: 'Manager',
      description: 'Management access',
      hierarchy: RoleHierarchy['MANAGER'] ?? 60,
      isSystem: true,
    },
    {
      name: 'USER',
      displayName: 'User',
      description: 'Standard user access',
      hierarchy: RoleHierarchy['USER'] ?? 40,
      isSystem: true,
    },
  ];

  const roleMap = new Map<string, string>(); // name -> id
  for (const roleDef of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      update: {
        displayName: roleDef.displayName,
        description: roleDef.description,
        hierarchy: roleDef.hierarchy,
        isSystem: roleDef.isSystem,
      },
      create: {
        name: roleDef.name,
        displayName: roleDef.displayName,
        description: roleDef.description,
        hierarchy: roleDef.hierarchy,
        isSystem: roleDef.isSystem,
      },
    });
    roleMap.set(role.name, role.id);
  }

  return roleMap;
}
