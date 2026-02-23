const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const user = await prisma.profile.update({
      where: { email: 'salasb@gmail.com' },
      data: { role: 'SUPERADMIN' }
    });
    console.log('User promoted successfully:', user.email, user.role);
  } catch (error) {
    console.error('Error promoting user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
