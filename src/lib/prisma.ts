import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
    // Setup connection pool
    const connectionString = process.env.DATABASE_URL
    const pool = new Pool({ connectionString })

    // Create Prisma adapter
    const adapter = new PrismaPg(pool)

    // Pass adapter to PrismaClient
    return new PrismaClient({ adapter })
}

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
