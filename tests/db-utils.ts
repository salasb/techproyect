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

export async function setupTestEnvironment() {
    const orgAId = crypto.randomUUID();
    const orgBId = crypto.randomUUID();
    const userAId = crypto.randomUUID();
    const superadminId = crypto.randomUUID();
    const emailA = `test-e2e-${Date.now()}-user-a@techproyect.local`;
    const superadminEmail = `test-e2e-${Date.now()}-superadmin@techproyect.local`;

    try {
        await prisma.$executeRawUnsafe(`
            DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email IN ('${emailA}', '${superadminEmail}'));
            DELETE FROM auth.users WHERE email IN ('${emailA}', '${superadminEmail}');
            
            INSERT INTO auth.users (
                id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
                raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, 
                phone, phone_change, phone_change_token, email_change_token_current, 
                email_change_confirm_status, reauthentication_token, is_sso_user, 
                is_anonymous
            )
            VALUES 
            (
                '${userAId}', '00000000-0000-0000-0000-000000000000', null, 'authenticated', '${emailA}', 
                '$2a$06$n.mjLYKC/cNxxY3p6A2XduIFrE0O/Bqe8dv7mbkBm3grvTO8Bunf6', now(), 
                '{"provider": "email", "providers": ["email"]}', '{}', false, now(), now(), 
                null, '', '', '', 0, '', false, false
            ),
            (
                '${superadminId}', '00000000-0000-0000-0000-000000000000', null, 'authenticated', '${superadminEmail}', 
                '$2a$06$n.mjLYKC/cNxxY3p6A2XduIFrE0O/Bqe8dv7mbkBm3grvTO8Bunf6', now(), 
                '{"provider": "email", "providers": ["email"]}', '{}', false, now(), now(), 
                null, '', '', '', 0, '', false, false
            )
            ON CONFLICT (id) DO NOTHING;
            
            INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
            VALUES
            (gen_random_uuid(), '${userAId}', '${userAId}', '{"sub": "${userAId}", "email": "${emailA}", "email_verified": true, "phone_verified": false}'::jsonb, 'email', null, now(), now()),
            (gen_random_uuid(), '${superadminId}', '${superadminId}', '{"sub": "${superadminId}", "email": "${superadminEmail}", "email_verified": true, "phone_verified": false}'::jsonb, 'email', null, now(), now())
            ON CONFLICT (provider_id, provider) DO NOTHING;
        `);
    } catch (e: any) {
        if (!e.message.includes('unique constraint')) {
            throw e;
        }
    }

    // 2. Ensure Profiles exist (in case trigger missed them or failed)
    await prisma.profile.upsert({
        where: { id: userAId },
        update: { email: emailA },
        create: { id: userAId, email: emailA, name: 'Test User A' }
    });
    await prisma.profile.upsert({
        where: { id: superadminId },
        update: { email: superadminEmail, role: 'SUPERADMIN' },
        create: { id: superadminId, email: superadminEmail, name: 'Superadmin', role: 'SUPERADMIN' }
    });

    // 3. Create Organizations
    await prisma.organization.upsert({
        where: { id: orgAId },
        update: { name: 'Test Org A' },
        create: { id: orgAId, name: 'Test Org A' }
    });
    await prisma.organization.upsert({
        where: { id: orgBId },
        update: { name: 'Test Org B' },
        create: { id: orgBId, name: 'Test Org B' }
    });

    // 4. Create Memberships (User A is in both Org A and Org B, Superadmin is in neither/global)
    await prisma.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: orgAId, userId: userAId } },
        update: {},
        create: { organizationId: orgAId, userId: userAId, role: 'OWNER' }
    });
    await prisma.organizationMember.upsert({
        where: { organizationId_userId: { organizationId: orgBId, userId: userAId } },
        update: {},
        create: { organizationId: orgBId, userId: userAId, role: 'MEMBER' }
    });

    // 5. Seed some commercial data in Org A
    const projectAId = crypto.randomUUID();
    await prisma.project.upsert({
        where: { id: projectAId },
        update: { name: 'Project in Org A' },
        create: {
            id: projectAId,
            organizationId: orgAId,
            name: 'Project in Org A',
            responsible: 'Test User A',
            status: 'EN_CURSO',
            stage: 'LEVANTAMIENTO',
            progress: 0,
            startDate: new Date(),
            plannedEndDate: new Date(Date.now() + 86400000)
        }
    });

    return {
        userA: { id: userAId, email: emailA, password: 'TestPassword123!' },
        superadmin: { id: superadminId, email: superadminEmail, password: 'TestPassword123!' },
        orgAId,
        orgBId,
        projectAId
    };
}
