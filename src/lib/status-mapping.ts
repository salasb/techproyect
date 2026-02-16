/**
 * Enum canónico de estados para el sistema Urbyx.
 * Alinea Backend, UI y E2E.
 */
export const STATUS_MAP = {
    // Estados de Residentes / Usuarios (Auditados por Codex)
    RESIDENT: {
        ACTIVE: { label: 'Activo', color: 'bg-emerald-100 text-emerald-700' },
        INACTIVE: { label: 'Inactivo', color: 'bg-zinc-100 text-zinc-500' },
        DECEASED: { label: 'Fallecido', color: 'bg-slate-200 text-slate-700' },
        TRANSFERRED: { label: 'Trasladado', color: 'bg-blue-100 text-blue-700' }
    },
    // Estados de Proyectos (Actuales en DB)
    PROJECT: {
        EN_CURSO: { label: 'En Curso', color: 'bg-blue-100 text-blue-700' },
        EN_ESPERA: { label: 'En Espera', color: 'bg-amber-100 text-amber-700' },
        BLOQUEADO: { label: 'Bloqueado', color: 'bg-red-100 text-red-700' },
        CERRADO: { label: 'Cerrado', color: 'bg-emerald-100 text-emerald-700' },
        CANCELADO: { label: 'Cancelado', color: 'bg-zinc-100 text-zinc-500' }
    },
    // Estados de Clientes
    CLIENT: {
        LEAD: { label: 'Lead', color: 'bg-purple-100 text-purple-700' },
        PROSPECT: { label: 'Prospecto', color: 'bg-blue-100 text-blue-700' },
        CLIENT: { label: 'Cliente', color: 'bg-emerald-100 text-emerald-700' },
        CHURNED: { label: 'Baja', color: 'bg-red-100 text-red-700' }
    }
} as const;

export type ResidentStatus = keyof typeof STATUS_MAP.RESIDENT;
export type ProjectStatus = keyof typeof STATUS_MAP.PROJECT;
export type ClientStatus = keyof typeof STATUS_MAP.CLIENT;
