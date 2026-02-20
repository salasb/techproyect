import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.profile.findMany({
        include: { OrganizationMember: true }
    });
    console.log("=== USERS ===");
    users.forEach(u => console.log(u.email, 'memberships:', u.OrganizationMember.length, 'orgId:', u.organizationId));

    const projects = await prisma.project.findMany({
        select: { id: true, name: true, organizationId: true, responsible: true }
    });
    console.log("=== PROJECTS ===");
    console.log(JSON.stringify(projects, null, 2));

    const orgs = await prisma.organization.findMany();
    console.log("=== ORGS ===");
    console.log(JSON.stringify(orgs, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
