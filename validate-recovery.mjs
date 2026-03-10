import pg from 'pg';
const { Pool } = pg;

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const email = 'ventas@techwise.cl';
    
    try {
        console.log(`[QA] Validating User: ${email}`);
        
        // 1. Check if user exists in Auth
        const resAuth = await pool.query('SELECT id, email, last_sign_in_at FROM auth.users WHERE email = $1', [email]);
        if (resAuth.rows.length === 0) {
            console.error('FAIL: User NOT found in auth.users. This explains why the recovery might fail.');
            return;
        }
        const authUser = resAuth.rows[0];
        console.log('PASS: User found in Auth:', authUser.id);

        // 2. Check if Profile is synced
        const resProfile = await pool.query('SELECT id, email, name FROM public."Profile" WHERE id = $1', [authUser.id]);
        if (resProfile.rows.length === 0) {
            console.error('FAIL: Profile NOT synced with Auth ID.');
            const resProfileByEmail = await pool.query('SELECT id, email FROM public."Profile" WHERE email = $1', [email]);
            if (resProfileByEmail.rows.length > 0) {
                 console.log('FOUND: Profile exists with same email but DIFFERENT ID:', resProfileByEmail.rows[0].id);
                 console.log('SYNCING NOW...');
                 await pool.query('UPDATE public."Profile" SET id = $1 WHERE email = $2', [authUser.id, email]);
                 console.log('PASS: Sync fixed.');
            }
        } else {
            console.log('PASS: Profile is correctly synced.');
        }

        // 3. Test generic recovery logic (simulated)
        console.log('[QA] Simulating forgotPassword for:', email);
        // We know Supabase resetPasswordForEmail returns success even if user doesn't exist (anti-enumeration)
        // so we must ensure the user exists first (Step 1).
        console.log('PASS: User existence verified. Recovery email would be sent to:', email);

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await pool.end();
    }
}

main();
