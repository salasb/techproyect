const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.profile.findUnique({
    where: { email: 'salasb@gmail.com' }
  });
  console.log('User Role:', user ? user.role : 'NOT FOUND');
  await prisma.$disconnect();
}
main();
