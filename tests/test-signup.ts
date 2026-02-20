import fs from 'fs';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.local');
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

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testSignup() {
    const email = `test-api-${Date.now()}@test.com`;
    console.log("Attempting signup for", email);
    const { data, error } = await supabase.auth.signUp({ email, password: 'TestPassword123!' });

    if (error) {
        console.error("Signup Error:", error);
    } else {
        console.log("Signup Success!", data.user?.id);
    }
}

testSignup();
