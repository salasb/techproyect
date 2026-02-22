import prisma from "./src/lib/prisma";

async function main() {
    const projects = await prisma.project.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log("Recent projects:");
    for (const p of projects) {
        console.log(`- ${p.id} | ${p.name} | Org: ${p.organizationId} | Status: ${p.status}`);
    }
}
main().catch(console.error);
