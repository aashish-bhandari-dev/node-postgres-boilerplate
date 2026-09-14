import { PrismaClient, UserRole, AuthProvider } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Starting database seeding...');

  const defaultPassword = 'Test@123';
  const hashedPassword = await bcrypt.hash(defaultPassword, SALT_ROUNDS);

  // 1. Super Admin (superadmin@gmail.com)
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@gmail.com' },
    update: {
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
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
      role: UserRole.SUPER_ADMIN,
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
      role: UserRole.ADMIN,
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
      role: UserRole.ADMIN,
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
      role: UserRole.MANAGER,
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
      role: UserRole.MANAGER,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPhoneVerified: true,
      phoneVerifiedAt: new Date(),
      isActive: true,
      isDeactivated: false,
    },
  });

  // 4. Customer (customer@gmail.com)
  const customer = await prisma.user.upsert({
    where: { email: 'customer@gmail.com' },
    update: {
      password: hashedPassword,
      role: UserRole.CUSTOMER,
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
      email: 'customer@gmail.com',
      username: 'customer',
      firstName: 'Jane',
      lastName: 'Customer',
      password: hashedPassword,
      phone: '+1555555555',
      role: UserRole.CUSTOMER,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isPhoneVerified: true,
      phoneVerifiedAt: new Date(),
      isActive: true,
      isDeactivated: false,
    },
  });

  console.log('✅ Database seeded successfully!\n');
  console.table([
    {
      Role: superAdmin.role,
      Email: superAdmin.email,
      Username: superAdmin.username,
      Password: defaultPassword,
    },
    {
      Role: admin.role,
      Email: admin.email,
      Username: admin.username,
      Password: defaultPassword,
    },
    {
      Role: manager.role,
      Email: manager.email,
      Username: manager.username,
      Password: defaultPassword,
    },
    {
      Role: customer.role,
      Email: customer.email,
      Username: customer.username,
      Password: defaultPassword,
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
