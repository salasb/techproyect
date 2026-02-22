const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        console.log("Checking SuperadminAlert model...");
        const count = await prisma.superadminAlert.count();
        console.log("Count:", count);
        console.log("SUCCESS: Prisma recognizes SuperadminAlert");
    } catch (error) {
        console.error("FAILURE:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
