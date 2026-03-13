import prisma from "@/lib/prisma";
import { resolveAccessContext, AccessContext } from "./access-resolver";

export type ProjectAccessResult =
  | {
      ok: true;
      project: any; // Using any for compatibility with existing hydration
      context: AccessContext;
      accessMode: 'GLOBAL' | 'TENANT';
    }
  | {
      ok: false;
      code:
        | 'PROJECT_NOT_FOUND'
        | 'NO_AUTH'
        | 'NO_MEMBERSHIP'
        | 'ORG_MISMATCH'
        | 'FORBIDDEN'
        | 'DB_ERROR';
      message: string;
      traceId: string;
    };

/**
 * PROJECT ACCESS RESOLVER (v1.0)
 * Canonical logic to determine if a user can access a specific project.
 * Implements Rule: Project access should NOT depend solely on the active org cookie.
 */
export async function resolveProjectAccess(projectRef: string): Promise<ProjectAccessResult> {
    const traceId = `PRJ-RES-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    try {
        // 1. Resolve Global Identity Context
        const context = await resolveAccessContext();
        
        // 2. Fetch Project and its ownership from DB (Strict Lookup)
        const project = await prisma.project.findUnique({
            where: { id: projectRef },
            include: {
                organization: true,
                company: true,
                client: true,
                costEntries: true,
                invoices: true,
                quoteItems: true,
                tasks: true,
                SaleNote: true
            }
        });

        if (!project) {
            console.warn(`[ProjectResolver][${traceId}] Project ${projectRef} not found in DB.`);
            return { ok: false, code: 'PROJECT_NOT_FOUND', message: 'El proyecto no existe.', traceId };
        }

        const projectOrgId = project.organizationId;

        // 3. Evaluate Access Precedence
        
        // CASE A: Global Operator (Superadmin/Creator) -> Absolute Bypass
        if (context.isGlobalOperator) {
            console.log(`[ProjectResolver][${traceId}] GLOBAL ACCESS GRANTED for project ${projectRef} (Org: ${projectOrgId})`);
            return { ok: true, project, context, accessMode: 'GLOBAL' };
        }

        // CASE B: Regular User Check
        // If the user is NOT a member of the organization that owns the project, deny access.
        // We use Prisma to verify membership instead of relying on the cookie.
        const membership = await prisma.organizationMember.findFirst({
            where: {
                organizationId: projectOrgId as string,
                userId: context.userId
            }
        });

        if (!membership) {
            console.warn(`[ProjectResolver][${traceId}] Access denied: User ${context.userId} is not a member of Org ${projectOrgId}`);
            return { ok: false, code: 'NO_MEMBERSHIP', message: 'No tienes permisos para ver este proyecto (Org Mismatch).', traceId };
        }

        // 4. Access Granted
        console.log(`[ProjectResolver][${traceId}] Access granted for user ${context.userId} to project ${projectRef}`);
        return { ok: true, project, context, accessMode: 'TENANT' };

    } catch (e: any) {
        console.error(`[ProjectResolver][${traceId}] FATAL ERROR:`, e.message);
        return { ok: false, code: 'DB_ERROR', message: 'Ocurrió un error al verificar el acceso al proyecto.', traceId };
    }
}
