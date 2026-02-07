require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHealth() {
    console.log('🔍 Diagnostics Tool v1.0.0');
    console.log('---------------------------');
    console.log(`Target URL: ${supabaseUrl}`);

    // 1. Check Project Connection (via public table reading if possible)
    const { data: projects, error: projError } = await supabase.from('Project').select('id, name, clientId').limit(3);

    if (projError) {
        console.error('❌ Connection Failed:', projError.message);
        return;
    }
    console.log(`✅ Database Connection OK. Found ${projects.length} accessible projects.`);

    // 2. Check Client vs Company
    const { count: clientCount } = await supabase.from('Client').select('*', { count: 'exact', head: true });
    const { count: companyCount } = await supabase.from('Company').select('*', { count: 'exact', head: true });

    console.log(`📊 Stats:`);
    console.log(`   - Projects: ${projects.length}`);
    console.log(`   - Clients (New Table): ${clientCount}`);
    console.log(`   - Companies (Old Table): ${companyCount}`);

    if (clientCount === 0 && companyCount > 0) {
        console.warn('⚠️  WARNING: You have data in "Company" but "Client" is empty.');
        console.warn('   This explains why Search and Linking fail.');
        console.warn('   Solución: Create new clients manually.');
    } else {
        console.log('✅ Client table has data.');
    }

    // 3. Check Foreign Keys (Inferred)
    console.log('inspecting Project assignments...');
    projects.forEach(p => {
        if (p.clientId) {
            console.log(`   - Project "${p.name}" linked to Client ID: ${p.clientId}`);
        } else {
            console.log(`   - Project "${p.name}" has NO Client linked.`);
        }
    });

    console.log('---------------------------');
    console.log('Recomendación: Si "Clients" es 0, debes recrear tus clientes.');
}

checkHealth();
