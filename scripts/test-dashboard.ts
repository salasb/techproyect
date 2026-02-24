import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log("Checking DB active alerts...");
    const alerts = await prisma.superadminAlert.findMany({
        where: { status: { in: ['ACTIVE', 'ACKNOWLEDGED'] } }
    });
    console.log("Total DB alerts:", alerts.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
