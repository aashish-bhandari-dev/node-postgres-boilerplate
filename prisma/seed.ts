import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Upsert sample admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'System Administrator',
      role: Role.ADMIN,
      posts: {
        create: [
          {
            title: 'Welcome to the Node.js Express Prisma Boilerplate',
            content: 'This is a sample post seeded automatically.',
            published: true,
          },
        ],
      },
    },
  });

  // Upsert sample regular user
  const user = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      email: 'john.doe@example.com',
      name: 'John Doe',
      role: Role.USER,
      posts: {
        create: [
          {
            title: 'My First Post',
            content: 'Hello World from Prisma!',
            published: true,
          },
        ],
      },
    },
  });

  console.log('✅ Seeding complete!');
  console.log(`Created admin: ${admin.email}`);
  console.log(`Created user: ${user.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
