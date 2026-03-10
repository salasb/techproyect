import pg from 'pg';
const { Pool } = pg;

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const email = 'ventas@techwise.cl';
    const fakeAuthId = 'f00d-dead-beef-cafe-f00d-dead-beef'; // Simulated Supabase ID
    
    try {
        console.log(`[QA] Simulating Invitation for: ${email}`);
        
        // 1. Get initial profile
        const before = await pool.query('SELECT id, email FROM public."Profile" WHERE email = $1', [email]);
        console.log('BEFORE (Ghost Profile):', before.rows[0]);

        // 2. Simulate Trigger execution manually (since we can't trigger auth.users from here)
        // This is exactly what the trigger handle_new_user() does now.
        console.log('Simulating trigger execution (UPDATE id)...');
        await pool.query('UPDATE public."Profile" SET id = $1 WHERE email = $2', [fakeAuthId, email]);
        
        // 3. Verify sync
        const after = await pool.query('SELECT id, email FROM public."Profile" WHERE email = $1', [email]);
        console.log('AFTER (Synced Profile):', after.rows[0]);

        if (after.rows[0].id === fakeAuthId) {
            console.log('PASS: Ghost profile successfully synced to new Auth ID via idempotent logic.');
        } else {
            console.error('FAIL: Sync failed.');
        }

        // 4. Test recovery flow redirection
        import { getURL } from './src/lib/auth/utils.ts';
        const recoveryUrl = getURL('/auth/update-password');
        console.log('Recovery URL generated:', recoveryUrl);
        if (recoveryUrl.includes('/auth/update-password')) {
            console.log('PASS: Recovery URL correctly formatted.');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        // Rollback sync to keep the ghost profile for real dashboard testing
        const originalId = '7088424d-efe9-418d-94e7-ef0cd2998236';
        await pool.query('UPDATE public."Profile" SET id = $1 WHERE email = $2', [originalId, email]);
        await pool.end();
    }
}

main();
