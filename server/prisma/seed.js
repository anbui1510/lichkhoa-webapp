import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@lichkhoa.local';
  const passwordHash = await bcrypt.hash('admin123', 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { role: 'Admin' },
    create: {
      email,
      username: 'admin',
      role: 'Admin',
      fullName: 'Quản trị Khoa',
      phone: '0900000000',
      country: 'Việt Nam',
      address: 'Bệnh viện',
      passwordHash,
      settings: {
        create: {
          emailNotifications: true,
          pushNotifications: true,
          darkMode: false,
          language: 'vi'
        }
      }
    },
    include: { settings: true }
  });
  console.log('Seeded user:', user.email, '| password: admin123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
