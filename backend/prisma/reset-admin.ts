import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 'admin1234';
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);

  const user = await prisma.user.update({
    where: { username: 'admin' },
    data: { passwordHash: hash },
  });

  console.log(`✅ Reset password for user: ${user.username}`);
  console.log(`🔑 New Password: ${password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
