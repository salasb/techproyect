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

async function checkDatabase() {
    console.log("Checking DB for a real user hash...");
    const users = await prisma.$queryRaw`SELECT email, encrypted_password, instance_id, aud, role, is_super_admin FROM auth.users WHERE email NOT LIKE 'test-e2e-%' LIMIT 1`;
    console.log("Real Auth User:", users);
}

checkDatabase();
