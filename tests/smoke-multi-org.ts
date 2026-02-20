import fs from 'fs';
import path from 'path';

// Load env
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

import crypto from 'crypto';
import prisma from '../src/lib/prisma';
import * as serverResolver from '../src/lib/auth/server-resolver';
// We will mock requireOperationalScope directly in the imported module or globally.

async function runSmokeTest() {
    console.log("=== BATERÍA MÍNIMA DE SMOKE MULTI-ORG (v1.6.1 GATE) ===");

    const orgAId = crypto.randomUUID();
    const orgBId = crypto.randomUUID();
    const userId = crypto.randomUUID();

    try {
        console.log("1. Creating dummy Organizations A and B...");
        await prisma.organization.createMany({
            data: [
                { id: orgAId, name: 'Org A (Smoke Test)' },
                { id: orgBId, name: 'Org B (Smoke Test)' }
            ]
        });

        console.log("2. Injecting mock scope for Org A...");
        // Mocking the scope manually to bypass Next.js cookies() in CLI
        jestMockScope(orgAId, userId);

        // Let's test isolation using Prisma directly since Next.js Server Actions usually rely on 'next/headers' which crashes in raw CLI if not polyfilled.
        // The commercial actions rely on `await requireOperationalScope()`.
        const { createOpportunity, getOpportunities } = await import('../src/actions/opportunities');

        console.log("   -> Creating Opportunity in Org A...");
        await createOpportunity({
            title: 'Opp in Org A',
            description: 'This is an opp for org A',
            value: 1000,
            probability: 50,
            expectedCloseDate: new Date(),
        });

        const oppsA = await getOpportunities();
        console.log(`   -> Total Opportunities visible from Org A context: ${oppsA.length}`);

        console.log("3. Switching context to Org B...");
        jestMockScope(orgBId, userId);

        console.log("   -> Attempting to read Opportunities...");
        const oppsB = await getOpportunities();
        console.log(`   -> Total Opportunities visible from Org B context: ${oppsB.length}`);

        if (oppsA.length === 1 && oppsB.length === 0) {
            console.log("✅ SUCCESS: Multi-Org data isolation strictly verified. Org B cannot see Org A data.");
        } else {
            console.log("❌ FAILED: Data isolation leak detected.");
        }

    } catch (e) {
        console.error("Test error:", e);
    } finally {
        // Cleanup
        console.log("Cleaning up mock data...");
        await prisma.opportunity.deleteMany({ where: { organizationId: { in: [orgAId, orgBId] } } });
        await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
        console.log("Cleanup done.");
    }
}

function jestMockScope(orgId: string, userId: string) {
    // Override the exported function
    // @ts-ignore
    serverResolver.requireOperationalScope = async () => ({
        orgId,
        userId,
        isSuperadmin: false,
        role: 'OWNER'
    });
}

// Simple polyfill for Next.js cache which some actions might import
jestMockCache();

function jestMockCache() {
    try {
        const nextCache = require('next/cache');
        nextCache.revalidatePath = () => { };
    } catch (e) { }
}

runSmokeTest();
