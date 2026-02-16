import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Load .env.local or .env manually
const envFiles = [".env.local", ".env"];
envFiles.forEach(file => {
    const envPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(envPath)) {
        console.log(`Loading env from ${file}...`);
        const envConfig = fs.readFileSync(envPath, "utf8");
        envConfig.split("\n").forEach((line) => {
            const firstEqualsIndex = line.indexOf('=');
            if (firstEqualsIndex !== -1) {
                const key = line.substring(0, firstEqualsIndex).trim();
                const value = line.substring(firstEqualsIndex + 1).trim();

                if (key && !key.startsWith("#")) {
                    process.env[key] = value.replace(/^["']|["']$/g, "");
                }
            }
        });
    }
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("❌ Error: SUPABASE_SERVICE_ROLE_KEY is missing.");
    console.error("   Please ensure .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function runVerification() {
    console.log("🚀 Starting Release v1.0 Data Verification...");

    // 1. Verify Recent User Invitations
    console.log("\n1. Checking User Invitations (Last 24h)...");
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: invitations, error: inviteError } = await supabaseAdmin
        .from('UserInvitation')
        .select('*')
        .gt('createdAt', yesterday);

    if (inviteError) {
        console.error("❌ Error fetching invitations:", inviteError.message);
    } else {
        console.log(`✅ Found ${invitations?.length || 0} recent invitations.`);
        invitations?.forEach(inv => {
            console.log(`   - Invite for ${inv.email} (${inv.acceptedAt ? 'Accepted' : 'Pending'})`);
        });
    }

    // 2. Verify Recent Profiles (Registered Users)
    console.log("\n2. Checking Recently Registered Users (Last 24h)...");
    const { data: profiles, error: profileError } = await supabaseAdmin
        .from('Profile')
        .select('*')
        .gt('createdAt', yesterday);

    if (profileError) {
        console.error("❌ Error fetching profiles:", profileError.message);
    } else {
        console.log(`✅ Found ${profiles?.length || 0} recent profiles.`);
        profiles?.forEach(p => {
            console.log(`   - User: ${p.email} (Org ID: ${p.organizationId || 'NONE'})`);
            if (!p.organizationId) {
                console.warn(`     ⚠️ WARNING: User ${p.email} has no Organization linked!`);
            }
        });
    }

    // 3. Verify Recent Projects
    console.log("\n3. Checking Recently Created Projects (Last 24h)...");
    const { data: projects, error: projectError } = await supabaseAdmin
        .from('Project')
        .select('*, company:Company(name)')
        .gt('createdAt', yesterday);

    if (projectError) {
        console.error("❌ Error fetching projects:", projectError.message);
    } else {
        console.log(`✅ Found ${projects?.length || 0} recent projects.`);
        projects?.forEach(p => {
            console.log(`   - Project: ${p.name} (Status: ${p.status}, Client: ${p.company?.name})`);
        });
    }

    // 4. Verify System Integrity (Orphans)
    console.log("\n4. System Integrity Check...");
    // Check for profiles without orgs (Critical for this release)
    const { count: orphanUsers, error: orphanError } = await supabaseAdmin
        .from('Profile')
        .select('*', { count: 'exact', head: true })
        .is('organizationId', null);

    if (!orphanError) {
        if (orphanUsers && orphanUsers > 0) {
            console.warn(`⚠️  WARNING: Found ${orphanUsers} users without an Organization.`);
        } else {
            console.log("✅ All users are linked to an Organization.");
        }
    }

    console.log("\n---------------------------------------------------");
    console.log("verification complete.");
}

runVerification().catch(e => console.error(e));
