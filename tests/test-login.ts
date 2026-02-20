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
import { setupTestEnvironment } from './db-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignIn() {
    console.log("Setting up test env...");
    const { userA } = await setupTestEnvironment();
    console.log("Testing signInWithPassword with", userA.email);
    const { data, error } = await supabase.auth.signInWithPassword({
        email: userA.email,
        password: 'TestPassword123!',
    });
    console.log("Result:", { data, error });
}

testSignIn();
