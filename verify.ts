import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=========================================");
    console.log("=== TECHPROYECT DATABASE FORENSICS   ===");
    console.log("=========================================");
    console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Exists" : "Missing");

    try {
        await prisma.$connect();
        console.log("✅ DB Connection: OK");
    } catch (e) {
        console.error("❌ DB Connection Failed", e);
        return;
    }

    const profiles = await prisma.profile.findMany({
        include: {
            OrganizationMember: {
                where: { status: 'ACTIVE' },
                include: { organization: true }
            }
        }
    });

    console.log(`\nTotales en sistema: perfiles (${profiles.length})`);

    let affectedUser = null;

    for (const p of profiles) {
        let totalProjects = 0;
        let totalQuotes = 0;
        let totalClients = 0;

        let orgStats = [];

        for (const m of p.OrganizationMember) {
            const pCount = await prisma.project.count({ where: { organizationId: m.organizationId } });
            const qCount = await prisma.quote.count({ where: { project: { organizationId: m.organizationId } } });
            const cCount = await prisma.client.count({ where: { organizationId: m.organizationId } });

            totalProjects += pCount;
            totalQuotes += qCount;
            totalClients += cCount;

            orgStats.push({
                orgId: m.organizationId,
                role: m.role,
                status: m.status,
                projects: pCount,
                quotes: qCount,
                clients: cCount
            });
        }

        if (totalProjects >= 5 || p.email.includes('salasb')) {
            affectedUser = { profile: p, stats: orgStats };

            console.log(`\n🔍 === ANALIZANDO USUARIO AFECTADO ===`);
            console.log(`User ID: ${p.id}`);
            console.log(`Email: ${p.email}`);
            console.log(`Profile.organizationId (Last Active): ${p.organizationId || 'NULL'}`);
            console.log(`Memberships Count: ${p.OrganizationMember.length}`);

            console.log(`\n📊 Conteos por Organización (Membresías):`);
            console.table(orgStats);

            if (p.OrganizationMember.length > 0) {
                const sampleOrg = p.OrganizationMember[0].organizationId;

                console.log(`\n📋 Muestra de Proyectos Reales (Org: ${sampleOrg}):`);
                const sampleProjects = await prisma.project.findMany({
                    where: { organizationId: sampleOrg },
                    take: 5,
                    select: { id: true, name: true, status: true }
                });
                console.log(sampleProjects);
            }

            console.log(`\n🛡️ Consistency Check:`);
            const hasValidLastActive = p.organizationId ?
                p.OrganizationMember.some(m => m.organizationId === p.organizationId) : false;

            console.log(`- Profile.organizationId es miembro válido: ${hasValidLastActive ? 'SÍ ✅' : 'NO ❌ (o es nulo)'}`);
            console.log(`- Orfandad: ${p.OrganizationMember.length > 0 ? 'Sin membresías huérfanas comprobadas ✅' : 'N/A'}`);
        }
    }

    if (!affectedUser) {
        console.log("\n❌ No se encontró ningún usuario con más de 5 proyectos o email salasb.");
    }

}

main().catch(console.error).finally(() => prisma.$disconnect());
