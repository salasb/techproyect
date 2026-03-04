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
    const client = new PrismaClient({ adapter })
    
    // DB Schema Guard: Log latest applied migration on initialization (Server log only)
    if (typeof window === 'undefined') {
        client.$queryRawUnsafe('SELECT migration_name, started_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 1')
            .then((res: any) => {
                const latest = res?.[0]?.migration_name || 'None';
                console.log(`[DB Guard] Prisma initialized. Latest migration: ${latest}`);
            })
            .catch(err => {
                console.warn(`[DB Guard] Prisma initialized. Could not verify migrations: ${err.message}`);
            });
    }

    return client;
}

declare const globalThis: {
    prismaGlobal: ReturnType<typeof prismaClientSingleton>
} & typeof global

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
