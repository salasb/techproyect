import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const alerts = await prisma.superadminAlert.findMany({
        where: { 
            status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
        },
        select: {
            id: true,
            fingerprint: true,
            title: true,
            type: true
        }
    });
    console.log("Total active alerts:", alerts.length);
    console.log("Sample active alerts:");
    console.table(alerts.slice(0, 20));
}
main().catch(console.error).finally(() => prisma.$disconnect());
