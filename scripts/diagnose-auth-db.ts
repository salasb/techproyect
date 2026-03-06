import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("=== Diagnóstico de Triggers y Constraints en auth.users ===");
    try {
        console.log("1. Buscando Triggers...");
        const triggers = await prisma.$queryRawUnsafe(`
            SELECT event_object_schema as table_schema,
                   event_object_table as table_name,
                   trigger_name,
                   event_manipulation as event,
                   action_statement as definition
            FROM information_schema.triggers
            WHERE event_object_schema = 'auth' AND event_object_table = 'users';
        `);
        console.log(JSON.stringify(triggers, null, 2));

        console.log("2. Buscando Foreign Key Constraints referenciando a auth.users...");
        const constraints = await prisma.$queryRawUnsafe(`
            SELECT
                tc.table_schema, 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name='users' AND ccu.table_schema='auth';
        `);
        console.log(JSON.stringify(constraints, null, 2));

    } catch (error: any) {
        console.error("Error al ejecutar el diagnóstico:", error.message);
    } finally {
        await prisma.$disconnect();
    }
}
main();
