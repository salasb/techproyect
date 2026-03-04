import prisma from './src/lib/prisma'
async function main() {
  try {
    await prisma.organizationMember.findMany({
      where: { userId: '00000000-0000-0000-0000-000000000000', status: 'ACTIVE' },
      include: { 
          organization: {
              include: { subscription: { select: { status: true } } }
          }
      }
    })
    console.log("Success")
  } catch (e: any) {
    console.error("Prisma Error:", e.code, e.meta, e.message)
  } finally {
    await prisma.$disconnect()
  }
}
main()