import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf8');
    envFile.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            const key = match[1];
            let value = match[2].trim();
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            }
            process.env[key] = value;
        }
    });
}

import prisma from '../src/lib/prisma';

async function checkSchema() {
    console.log("Checking auth constraints...");
    const constraints = await prisma.$queryRaw`
        SELECT constraint_name, constraint_type, table_name
        FROM information_schema.table_constraints
        WHERE table_schema = 'auth' AND table_name IN ('users', 'identities');
    `;
    console.log("Constraints:", constraints);
}

checkSchema();
