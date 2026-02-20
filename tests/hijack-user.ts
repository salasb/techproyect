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
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function hijackUser() {
    const email = 'test-user-a-1771619466578@test.com';
    const newPassword = 'TestPassword123!';

    console.log(`Updating password for ${email}...`);

    await prisma.$executeRawUnsafe(`
        UPDATE auth.users 
        SET encrypted_password = crypt('${newPassword}', gen_salt('bf', 10))
        WHERE email = '${email}';
    `);

    console.log("Password updated. Testing login...");

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: newPassword,
    });

    if (error) {
        console.error("Login failed:", error);
    } else {
        console.log("Login SUCCESS!", data.user?.id);
    }
}

hijackUser();
