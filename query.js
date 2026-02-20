const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.profile.findMany({ take: 3, include: { OrganizationMember: true } });
  console.log("=== USERS ===");
  users.forEach(u => console.log(u.email, 'memberships:', u.OrganizationMember.length, 'orgId:', u.organizationId));
  
  const projects = await prisma.project.findMany({ take: 5, select: { id: true, name: true, organizationId: true } });
  console.log("=== PROJECTS ===");
  console.log(JSON.stringify(projects, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
