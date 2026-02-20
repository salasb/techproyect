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

import { createClient } from '@supabase/supabase-js';
import prisma from '../src/lib/prisma';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

async function testAlignment() {
    const email = `test-align-${Date.now()}@test.com`;
    console.log("Signing up:", email);

    const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password: 'TestPassword123!'
    });

    if (error) {
        console.error("Signup failed (might be rate limit):", error.message);
    } else if (user) {
        console.log("Signup success! User ID:", user.id);

        // Let's check Prisma immediately
        const dbUsers = await prisma.$queryRaw`
            SELECT id FROM auth.users WHERE email = ${email};
        `;
        console.log("Prisma found users:", dbUsers);
    }
}

testAlignment();
