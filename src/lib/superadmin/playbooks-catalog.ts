export type PlaybookActionType = "deeplink" | "serverAction" | "check";

export interface CockpitPlaybookStep {
  id: string;
  title: string;
  description?: string;
  actionType?: PlaybookActionType;
  href?: string;
  actionId?: string;
  evidenceHint?: string;
  order: number;
}

export interface CockpitRulePlaybook {
  ruleCode: string;
  title: string;
  summary: string;
  defaultSlaPreset: "15m" | "1h" | "24h" | "72h";
  ownerRoleSuggested?: string;
  steps: CockpitPlaybookStep[];
}

export const PLAYBOOKS_CATALOG: Record<string, CockpitRulePlaybook> = {
  BILLING_PAST_DUE: {
    ruleCode: "BILLING_PAST_DUE",
    title: "Remediación de Pago Vencido",
    summary: "Gestión de organizaciones con facturas pendientes o fallidas en Stripe.",
    defaultSlaPreset: "24h",
    ownerRoleSuggested: "FINANCE_OPS",
    steps: [
      { id: "verify_stripe", title: "Verificar en Stripe Dashboard", description: "Confirmar que el pago realmente falló y no es un error de sync.", order: 1, actionType: "check", evidenceHint: "Buscar Invoice ID en Stripe" },
      { id: "check_org_status", title: "Revisar estado de la Org", description: "Verificar si hay bloqueos previos o tickets abiertos.", order: 2, actionType: "deeplink" },
      { id: "contact_customer", title: "Contactar al cliente", description: "Enviar aviso manual o verificar si el auto-dunning funcionó.", order: 3, actionType: "check" },
      { id: "retry_sync", title: "Forzar re-sincronización", description: "Ejecutar acción de sync manual si el pago ya se regularizó.", order: 4, actionType: "serverAction" },
    ],
  },
  BILLING_NOT_CONFIGURED: {
    ruleCode: "BILLING_NOT_CONFIGURED",
    title: "Configuración de Facturación Pendiente",
    summary: "Organizaciones que requieren setup financiero para operar o continuar tras trial.",
    defaultSlaPreset: "24h",
    ownerRoleSuggested: "FINANCE_OPS",
    steps: [
      { id: "verify_plan", title: "Auditar plan actual", description: "Verificar si debe estar en FREE o requiere configuración PRO.", order: 1, actionType: "check", evidenceHint: "Revisar tabla de suscripciones" },
      { id: "notify_org", title: "Notificar al Owner", description: "Solicitar carga de tarjeta de crédito o firma de contrato.", order: 2, actionType: "check" },
      { id: "apply_grace_period", title: "Otorgar periodo de gracia", description: "Si aplica, extender trial o posponer bloqueo.", order: 3, actionType: "serverAction" },
    ]
  },
  NO_ADMINS_ASSIGNED: {
    ruleCode: "NO_ADMINS_ASSIGNED",
    title: "Recuperación de Nodo Huérfano",
    summary: "La organización no tiene miembros asignados. Riesgo de abandono o error de creación.",
    defaultSlaPreset: "1h",
    ownerRoleSuggested: "SUPPORT",
    steps: [
      { id: "audit_logs", title: "Auditar logs de creación", description: "Identificar quién creó la org y qué pasó con el dueño inicial.", order: 1, actionType: "check", evidenceHint: "Buscar 'ORG_CREATED' en audit log" },
      { id: "check_invitations", title: "Verificar invitaciones pendientes", description: "Confirmar si hay invitaciones enviadas que no han sido aceptadas.", order: 2, actionType: "check" },
      { id: "assign_temporary", title: "Asignar administrador temporal", description: "Asignar un Superadmin o Support como miembro para investigar.", order: 3, actionType: "serverAction" },
    ],
  },
  TRIAL_ENDING_SOON: {
    ruleCode: "TRIAL_ENDING_SOON",
    title: "Cierre de Ventana Trial",
    summary: "El periodo de prueba expirará pronto. Oportunidad de conversión.",
    defaultSlaPreset: "24h",
    ownerRoleSuggested: "SALES_OPS",
    steps: [
      { id: "check_usage", title: "Verificar uso y adopción", description: "Evaluar métricas clave (Wau, quotes creadas) para medir interés.", order: 1, actionType: "check", evidenceHint: "Revisar health score > 50" },
      { id: "send_proposal", title: "Enviar propuesta comercial", description: "Si el uso es alto, enviar quote o nudge de upgrade.", order: 2, actionType: "check" },
      { id: "extend_trial", title: "Extender trial (opcional)", description: "Si el cliente pidió más tiempo, extender 7 días.", order: 3, actionType: "serverAction" },
    ]
  },
  INACTIVE_ORG: {
    ruleCode: "INACTIVE_ORG",
    title: "Prevención de Churn por Inactividad",
    summary: "Cliente de pago sin actividad reciente. Requiere contacto proactivo.",
    defaultSlaPreset: "72h",
    ownerRoleSuggested: "CUSTOMER_SUCCESS",
    steps: [
      { id: "review_activity", title: "Revisar última sesión", description: "Validar cuándo fue el último login o acción significativa.", order: 1, actionType: "check" },
      { id: "check_support_tickets", title: "Revisar tickets de soporte", description: "Confirmar si la inactividad se debe a un bug bloqueante.", order: 2, actionType: "check" },
      { id: "reach_out", title: "Contacto CS", description: "Enviar correo de check-in o agendar llamada.", order: 3, actionType: "check" },
    ]
  },
  WEBHOOK_FAILURE: {
    ruleCode: "WEBHOOK_FAILURE",
    title: "Resolución de Webhook Fallido",
    summary: "Integración externa o evento de Stripe falló al procesarse.",
    defaultSlaPreset: "1h",
    ownerRoleSuggested: "ENGINEERING",
    steps: [
      { id: "check_payload", title: "Revisar payload del evento", description: "Inspeccionar el cuerpo del webhook en logs.", order: 1, actionType: "check", evidenceHint: "ID del evento de Stripe" },
      { id: "replay_event", title: "Re-encolar evento", description: "Ejecutar retry manual del webhook.", order: 2, actionType: "serverAction" },
      { id: "escalate_bug", title: "Escalar a Ingeniería", description: "Si falla repetidamente, abrir issue técnico.", order: 3, actionType: "check" }
    ]
  },
  STALE_PENDING: {
    ruleCode: "STALE_PENDING",
    title: "Activación de Onboarding Estancado",
    summary: "Organizaciones en PENDING por más de 48h.",
    defaultSlaPreset: "24h",
    ownerRoleSuggested: "SALES_OPS",
    steps: [
      { id: "check_trial", title: "Verificar intención de uso", description: "Verificar si el cliente completó los pasos básicos.", order: 1, actionType: "check" },
      { id: "manual_activation", title: "Activar manualmente", description: "Si cumple requisitos, proceder a activar estado ACTIVE.", order: 2, actionType: "serverAction" },
    ],
  },
  SYSTEM_INFO: {
    ruleCode: "SYSTEM_INFO",
    title: "Revisión de Mensaje de Sistema",
    summary: "Mensajes informativos que requieren supervisión técnica.",
    defaultSlaPreset: "72h",
    ownerRoleSuggested: "SUPERADMIN",
    steps: [
      { id: "analyze_impact", title: "Analizar impacto", description: "Determinar si requiere escalación a desarrollo.", order: 1, actionType: "check" },
      { id: "archive_if_minor", title: "Resolver si es trivial", description: "Si no hay acción requerida, marcar como RESUELTO.", order: 2, actionType: "serverAction" },
    ],
  },
};

export function getPlaybookByRule(ruleCode: string): CockpitRulePlaybook {
  return PLAYBOOKS_CATALOG[ruleCode] || {
    ruleCode: "GENERIC_ALERT",
    title: "Procedimiento Estándar",
    summary: "Pasos genéricos para la resolución de alertas no catalogadas.",
    defaultSlaPreset: "72h",
    steps: [
      { id: "investigate", title: "Investigar causa raíz", actionType: "check", order: 1 },
      { id: "document", title: "Documentar hallazgo", actionType: "check", order: 2 },
      { id: "resolve", title: "Marcar resolución", actionType: "serverAction", order: 3 },
    ],
  };
}
