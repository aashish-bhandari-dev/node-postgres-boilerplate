import { PrismaClient, AuthProvider } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { SYSTEM_PERMISSIONS } from '../src/constants/permissions';
import { RolePermissions, RoleHierarchy } from '../src/constants/roles';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Roles
  console.log('🎭 Seeding roles...');
  const roleDefinitions = [
    { name: 'SUPER_ADMIN', displayName: 'Super Admin', description: 'Full system access', hierarchy: RoleHierarchy['SUPER_ADMIN'] ?? 100, isSystem: true },
    { name: 'ADMIN', displayName: 'Admin', description: 'Administrative access', hierarchy: RoleHierarchy['ADMIN'] ?? 80, isSystem: true },
    { name: 'MANAGER', displayName: 'Manager', description: 'Management access', hierarchy: RoleHierarchy['MANAGER'] ?? 60, isSystem: true },
    { name: 'USER', displayName: 'User', description: 'Standard user access', hierarchy: RoleHierarchy['USER'] ?? 40, isSystem: true },
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

  // 2. Seed Permissions Catalog
  console.log('📦 Seeding permissions catalog...');
  const permissionRecordMap = new Map<string, string>(); // name -> id
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

  // 3. Seed Default Role Permissions
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

  const defaultPassword = 'Test@123';
  const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

  const superAdminRoleId = roleMap.get('SUPER_ADMIN')!;
  const adminRoleId = roleMap.get('ADMIN')!;
  const managerRoleId = roleMap.get('MANAGER')!;
  const userRoleId = roleMap.get('USER')!;

  // 1. Super Admin (superadmin@gmail.com)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@gmail.com' },
    update: {
      password: hashedPassword,
      roleId: superAdminRoleId,
      isActive: true,
      isDeactivated: false,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPhoneVerified: true,
      phoneVerifiedAt: new Date(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
      deletedAt: null,
    },
    create: {
      email: 'superadmin@gmail.com',
      username: 'superadmin',
      firstName: 'Super',
      lastName: 'Admin',
      password: hashedPassword,
      phone: '+1000000000',
      roleId: superAdminRoleId,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPhoneVerified: true,
      phoneVerifiedAt: new Date(),
      isActive: true,
      isDeactivated: false,
    },
  });

  // 2. Admin (admin@gmail.com)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {
      password: hashedPassword,
      roleId: adminRoleId,
      isActive: true,
      isDeactivated: false,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPhoneVerified: true,
      phoneVerifiedAt: new Date(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
      deletedAt: null,
    },
    create: {
      email: 'admin@gmail.com',
      username: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      password: hashedPassword,
      phone: '+1234567890',
      roleId: adminRoleId,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPhoneVerified: true,
      phoneVerifiedAt: new Date(),
      isActive: true,
      isDeactivated: false,
    },
  });

  // 3. Manager (manager@gmail.com)
  const manager = await prisma.user.upsert({
    where: { email: 'manager@gmail.com' },
    update: {
      password: hashedPassword,
      roleId: managerRoleId,
      isActive: true,
      isDeactivated: false,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPhoneVerified: true,
      phoneVerifiedAt: new Date(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
      deletedAt: null,
    },
    create: {
      email: 'manager@gmail.com',
      username: 'manager',
      firstName: 'Operations',
      lastName: 'Manager',
      password: hashedPassword,
      phone: '+1987654321',
      roleId: managerRoleId,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPhoneVerified: true,
      phoneVerifiedAt: new Date(),
      isActive: true,
      isDeactivated: false,
    },
  });

  // 4. Regular User (user@gmail.com)
  const user = await prisma.user.upsert({
    where: { email: 'user@gmail.com' },
    update: {
      password: hashedPassword,
      roleId: userRoleId,
      isActive: true,
      isDeactivated: false,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPhoneVerified: true,
      phoneVerifiedAt: new Date(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
      deletedAt: null,
    },
    create: {
      email: 'user@gmail.com',
      username: 'user',
      firstName: 'Regular',
      lastName: 'User',
      password: hashedPassword,
      phone: '+1555555555',
      roleId: userRoleId,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPhoneVerified: true,
      phoneVerifiedAt: new Date(),
      isActive: true,
      isDeactivated: false,
    },
  });

  // 5. Restricted Manager (restricted.manager@gmail.com) - demonstrates per-user custom permissions
  const restrictedManager = await prisma.user.upsert({
    where: { email: 'restricted.manager@gmail.com' },
    update: {
      password: hashedPassword,
      roleId: managerRoleId,
      hasCustomPermissions: true,
      isActive: true,
      isDeactivated: false,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPhoneVerified: true,
      phoneVerifiedAt: new Date(),
      failedLoginAttempts: 0,
      lockoutUntil: null,
      deletedAt: null,
    },
    create: {
      email: 'restricted.manager@gmail.com',
      username: 'restricted_manager',
      firstName: 'ViewOnly',
      lastName: 'Manager',
      password: hashedPassword,
      phone: '+1999888777',
      roleId: managerRoleId,
      hasCustomPermissions: true,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPhoneVerified: true,
      phoneVerifiedAt: new Date(),
      isActive: true,
      isDeactivated: false,
    },
  });

  // Assign custom permissions for the restricted manager:
  // Role defaults for MANAGER give users:read, users:update, settings:read, audit:read.
  // Restricted Manager has users:read ALLOWED, and users:update, settings:read, audit:read DENIED!
  const usersReadId = permissionRecordMap.get('users:read');
  const usersUpdateId = permissionRecordMap.get('users:update');
  const settingsReadId = permissionRecordMap.get('settings:read');
  const auditReadId = permissionRecordMap.get('audit:read');

  if (usersReadId) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: restrictedManager.id,
          permissionId: usersReadId,
        },
      },
      update: { isGranted: true },
      create: {
        userId: restrictedManager.id,
        permissionId: usersReadId,
        isGranted: true,
      },
    });
  }

  for (const deniedPermId of [usersUpdateId, settingsReadId, auditReadId].filter(Boolean)) {
    await prisma.userPermission.upsert({
      where: {
        userId_permissionId: {
          userId: restrictedManager.id,
          permissionId: deniedPermId!,
        },
      },
      update: { isGranted: false },
      create: {
        userId: restrictedManager.id,
        permissionId: deniedPermId!,
        isGranted: false,
      },
    });
  }

  console.log('✅ Database seeded successfully!\n');
  console.table([
    {
      Role: 'SUPER_ADMIN',
      Email: superAdmin.email,
      Username: superAdmin.username,
      Password: defaultPassword,
      CustomPermissions: 'No (God mode)',
    },
    {
      Role: 'ADMIN',
      Email: admin.email,
      Username: admin.username,
      Password: defaultPassword,
      CustomPermissions: 'No (Role default)',
    },
    {
      Role: 'MANAGER',
      Email: manager.email,
      Username: manager.username,
      Password: defaultPassword,
      CustomPermissions: 'No (Role default)',
    },
    {
      Role: 'MANAGER',
      Email: restrictedManager.email,
      Username: restrictedManager.username,
      Password: defaultPassword,
      CustomPermissions: 'Yes (View users only)',
    },
    {
      Role: 'USER',
      Email: user.email,
      Username: user.username,
      Password: defaultPassword,
      CustomPermissions: 'No (Role default)',
    },
  ]);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
