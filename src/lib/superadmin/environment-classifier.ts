export type EnvironmentClass = "production" | "demo" | "test" | "qa" | "trial" | "unknown";

export interface EnvironmentClassification {
    environmentClass: EnvironmentClass;
    isOperationallyRelevant: boolean;
    exclusionReason?: string;
}

export function classifyOrganizationEnvironment(org: { 
    name: string; 
    createdAt: Date | string;
    subscription?: { status: string; trialEndsAt?: Date | string | null } | null;
    plan?: string;
}): EnvironmentClassification {
    const name = org.name.toLowerCase();
    
    // 1. Hard-coded patterns for Test/Demo/QA
    if (name.includes("test") || name.includes("prueba") || name.includes("sandbox")) {
        return { environmentClass: "test", isOperationallyRelevant: false, exclusionReason: "Match: TEST pattern in name" };
    }
    
    if (name.includes("demo") || name.includes("ejemplo") || name.includes("muestra")) {
        return { environmentClass: "demo", isOperationallyRelevant: false, exclusionReason: "Match: DEMO pattern in name" };
    }
    
    if (name.includes("qa") || name.includes("staging") || name.includes("dev")) {
        return { environmentClass: "qa", isOperationallyRelevant: false, exclusionReason: "Match: QA/DEV pattern in name" };
    }

    // 2. Trial classification
    const isTrialing = org.subscription?.status === 'TRIALING';
    const createdAt = new Date(org.createdAt);
    const ageInDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (isTrialing) {
        // Trials are considered noise for strict production scope, regardless of age
        return { 
            environmentClass: "trial", 
            isOperationallyRelevant: false, 
            exclusionReason: ageInDays < 2 ? "Fresh Trial (< 48h)" : "Active Trial (Non-Prod Scope)" 
        };
    }

    // 3. Known production indicators (Paid plans, or active status without test names)
    if (org.plan && org.plan !== 'FREE' && org.plan !== 'TRIAL') {
        return { environmentClass: "production", isOperationallyRelevant: true };
    }

    // 4. Default to unknown if name is generic and no billing info
    // But for this system, if it's not a test name, we treat it as potentially production
    if (name.length > 3) {
        return { environmentClass: "production", isOperationallyRelevant: true };
    }

    return { environmentClass: "unknown", isOperationallyRelevant: false, exclusionReason: "Ambiguous / Incomplete metadata" };
}
