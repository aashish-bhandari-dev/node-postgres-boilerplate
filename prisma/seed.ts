import { PrismaClient } from '@prisma/client';
import { seedRoles, seedPermissions, seedUsers } from './seeder';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Seed Roles
  const roleMap = await seedRoles(prisma);

  // 2. Seed Permissions Catalog & Role-Permission Matrix
  const permissionMap = await seedPermissions(prisma, roleMap);

  // 3. Seed Users with assigned roles and per-user custom permission overrides
  await seedUsers(prisma, roleMap, permissionMap);

  console.log('✨ All seeders executed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
