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
    console.log("Checking DB...");
    const users = await prisma.$queryRaw`SELECT id, email, encrypted_password, aud, role, email_confirmed_at FROM auth.users WHERE email LIKE 'test-e2e-%'`;
    console.log("Auth Users:", users);

    const profiles = await prisma.profile.findMany({ where: { email: { startsWith: 'test-e2e-' } } });
    console.log("Profiles:", profiles);
}

checkDatabase();
