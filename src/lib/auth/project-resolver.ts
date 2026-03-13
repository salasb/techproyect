import prisma from "@/lib/prisma";
import { resolveSessionContext, SessionContext } from "./session-resolver";

export type ProjectAccessResult =
  | {
      ok: true;
      projectId: string;
      projectCode: string;
      orgId: string;
      accessMode: 'GLOBAL' | 'TENANT';
      project: any;
      context: SessionContext;
    }
  | {
      ok: false;
      code:
        | 'NO_AUTH'
        | 'PROJECT_NOT_FOUND'
        | 'NO_MEMBERSHIP'
        | 'CONTEXT_MISSING'
        | 'ORG_MISMATCH'
        | 'NO_PERMISSION'
        | 'DB_ERROR';
      message: string;
      traceId: string;
    };

/**
 * PROJECT ACCESS RESOLVER (v2.0)
 * Canonical logic to determine if a user can access a specific project.
 * Completely immune to Vercel preview cookie drops.
 */
export async function resolveProjectAccess(projectRef: string): Promise<ProjectAccessResult> {
    const traceId = `PRJ-RES-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    try {
        // 1. Resolve Session Context (Robust)
        const sessionContext = await resolveSessionContext();
        
        if (!sessionContext.isAuthenticated) {
            return { ok: false, code: 'NO_AUTH', message: 'No estás autenticado.', traceId };
        }
        
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
                saleNote: true
            }
        });

        if (!project) {
            console.warn(`[ProjectResolver][${traceId}] Project ${projectRef} not found in DB.`);
            return { ok: false, code: 'PROJECT_NOT_FOUND', message: 'El proyecto no existe o fue eliminado.', traceId };
        }

        const projectOrgId = project.organizationId;
        const isGlobalOperator = sessionContext.globalRole === 'SUPERADMIN' || sessionContext.globalRole === 'STAFF';

        // 3. Evaluate Access Precedence
        
        // CASE A: Global Operator (Superadmin/Creator) -> Absolute Bypass
        if (isGlobalOperator) {
            console.log(`[ProjectResolver][${traceId}] GLOBAL ACCESS GRANTED for project ${projectRef} (Org: ${projectOrgId})`);
            return { 
                ok: true, 
                projectId: project.id, 
                projectCode: project.id, 
                orgId: projectOrgId as string, 
                accessMode: 'GLOBAL', 
                project, 
                context: sessionContext 
            };
        }

        // CASE B: Regular User Check against robust memberships from session
        const isMember = sessionContext.memberships.some(m => m.orgId === projectOrgId);

        if (!isMember) {
            console.warn(`[ProjectResolver][${traceId}] Access denied: User ${sessionContext.userId} is not a member of Org ${projectOrgId}`);
            return { ok: false, code: 'NO_MEMBERSHIP', message: 'No tienes permisos para ver este proyecto o no perteneces a la organización dueña.', traceId };
        }

        // 4. Access Granted
        console.log(`[ProjectResolver][${traceId}] Access granted for user ${sessionContext.userId} to project ${projectRef}`);
        return { 
            ok: true, 
            projectId: project.id, 
            projectCode: project.id, 
            orgId: projectOrgId as string, 
            accessMode: 'TENANT', 
            project, 
            context: sessionContext 
        };

    } catch (e: any) {
        console.error(`[ProjectResolver][${traceId}] FATAL ERROR:`, e.stack);
        return { ok: false, code: 'DB_ERROR', message: 'Ocurrió un error inesperado al verificar el acceso al proyecto.', traceId };
    }
}
