import { PrismaClient, UserRole, AuthProvider } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Upsert sample Super Admin user
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      username: 'superadmin',
      firstName: 'Super',
      lastName: 'Admin',
      password: '$2b$10$hashedpasswordplaceholder',
      phone: '+1000000000',
      role: UserRole.SUPER_ADMIN,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
      isDeactivated: false,
    },
  });

  // Upsert sample regular admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: 'admin',
      firstName: 'System',
      lastName: 'Administrator',
      password: '$2b$10$hashedpasswordplaceholder',
      phone: '+1234567890',
      role: UserRole.ADMIN,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
      isDeactivated: false,
    },
  });

  // Upsert sample customer
  const customer = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      password: '$2b$10$hashedpasswordplaceholder',
      phone: '+1987654321',
      role: UserRole.CUSTOMER,
      provider: AuthProvider.LOCAL,
      isEmailVerified: true,
      emailVerifiedAt: new Date(),
      isActive: true,
      isDeactivated: false,
    },
  });

  console.log('✅ Seeding complete!');
  console.log(`Created Super Admin: ${superAdmin.email}`);
  console.log(`Created Admin: ${admin.email}`);
  console.log(`Created Customer: ${customer.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
