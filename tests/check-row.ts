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

async function checkRow() {
    console.log("Checking row...");
    const badUser = await prisma.$queryRaw`
        SELECT * FROM auth.users WHERE email = 'test-e2e-user-a@techproyect.local';
    `;
    const goodUser = await prisma.$queryRaw`
        SELECT * FROM auth.users WHERE email NOT LIKE 'test-e2e-%' LIMIT 1;
    `;
    console.log("Bad User:", badUser);
    console.log("Good User:", goodUser);
}

checkRow();
