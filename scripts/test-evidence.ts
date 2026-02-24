import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const alerts = await prisma.superadminAlert.findMany({
        where: { 
            status: { in: ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'] }
        },
        include: { organization: { select: { name: true } } }
    });
    console.log("Raw Active Alerts from DB:", alerts.length);
    const unique = new Set(alerts.map(a => a.fingerprint));
    console.log("Unique fingerprints in DB:", unique.size);

    // Filter snoozed and map metadata
    const now = new Date();
    const result = alerts.map(a => {
        const raw = (a.metadata || {}) as any;
        return { ...a, metadata: raw };
    }).filter(a => {
        const meta = a.metadata as any;
        if (meta.snoozedUntil && new Date(meta.snoozedUntil) > now) {
            return false; 
        }
        return true;
    });
    
    console.log("Filtered active/non-snoozed:", result.length);
}
main().catch(console.error).finally(() => prisma.$disconnect());
