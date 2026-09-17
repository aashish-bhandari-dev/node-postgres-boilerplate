import { PrismaClient, AuthProvider } from '@prisma/client';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;
export const DEFAULT_SEED_PASSWORD = 'Test@123';

export async function seedUsers(
  prisma: PrismaClient,
  roleMap: Map<string, string>,
  permissionMap: Map<string, string>,
): Promise<void> {
  console.log('👤 Seeding default users...');

  const hashedPassword = await bcrypt.hash(DEFAULT_SEED_PASSWORD, SALT_ROUNDS);

  const superAdminRoleId = roleMap.get('SUPER_ADMIN')!;
  const adminRoleId = roleMap.get('ADMIN')!;
  const managerRoleId = roleMap.get('MANAGER')!;
  const userRoleId = roleMap.get('USER')!;

  // 1. Super Admin
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

  // 2. Admin
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

  // 3. Manager
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

  // 4. Regular User
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

  // 5. Restricted Manager - demonstrates per-user custom permissions overrides
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

  // Assign custom per-user permissions for the restricted manager:
  // Role defaults for MANAGER give users:read, users:update, settings:read, audit:read.
  // Restricted Manager has users:read ALLOWED, and users:update, settings:read, audit:read DENIED.
  const usersReadId = permissionMap.get('users:read');
  const usersUpdateId = permissionMap.get('users:update');
  const settingsReadId = permissionMap.get('settings:read');
  const auditReadId = permissionMap.get('audit:read');

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

  console.log('✅ Default users seeded successfully!\n');
  console.table([
    {
      Role: 'SUPER_ADMIN',
      Email: superAdmin.email,
      Username: superAdmin.username,
      Password: DEFAULT_SEED_PASSWORD,
      CustomPermissions: 'No (God mode)',
    },
    {
      Role: 'ADMIN',
      Email: admin.email,
      Username: admin.username,
      Password: DEFAULT_SEED_PASSWORD,
      CustomPermissions: 'No (Role default)',
    },
    {
      Role: 'MANAGER',
      Email: manager.email,
      Username: manager.username,
      Password: DEFAULT_SEED_PASSWORD,
      CustomPermissions: 'No (Role default)',
    },
    {
      Role: 'MANAGER',
      Email: restrictedManager.email,
      Username: restrictedManager.username,
      Password: DEFAULT_SEED_PASSWORD,
      CustomPermissions: 'Yes (View users only)',
    },
    {
      Role: 'USER',
      Email: user.email,
      Username: user.username,
      Password: DEFAULT_SEED_PASSWORD,
      CustomPermissions: 'No (Role default)',
    },
  ]);
}
