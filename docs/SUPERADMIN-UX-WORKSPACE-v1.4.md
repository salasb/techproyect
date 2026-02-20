# SUPERADMIN UX WORKSPACE CONTROL v1.4

## Objetivo
Construir una experiencia fluida y "Premium" para los Superadmins tras el desacoplamiento de identidad y contexto lograda en la v1.3. La v1.4 busca crear herramientas para visualizar el entorno global de forma elegante (Panel Global `/admin/orgs`), manejar el enrutamiento y selección de la organización (Context Switch), sin afectar el acceso seguro, estableciendo el "Dashboard Superadmin Empty State".

## Separación Role vs Contexto
- **Role Global (`Profile.role === 'SUPERADMIN'`)**: Dicta "qué puede hacer el usuario globalmente". Es la llave maestra para entrar a las páginas bajo `/admin/*`. No depende de las organizaciones a las que pertenece.
- **Contexto Local (`app-org-id`)**: Dicta "en dónde está operando comercialmente". Un superadmin necesita poder inyectarse en cualquier contexto sin necesidad de ser un miembro de la tabla `OrganizationMember` para auditar.

## Flujo de Selección de Organización ("Switch Context")
El mecanismo canónico será exportado como un Server Action (`switchWorkspaceContext(orgId: string)`).
- **Validaciones**: Si es SUPERADMIN (verificando vía `workspace.isSuperadmin`), se saltarán las comprobaciones exclusivas de `OrganizationMember` al momento de inyectar la cookie, pero se forzará la actualización del perfil y la cookie `app-org-id`.
- **Efecto Secundario**: El cambio de contexto de un usuario loggeará un registro de "WORKSPACE_CONTEXT_SWITCHED" en el sistema de `AuditLog`.

## Estados UX (Dashboard / Home)
### Sin Org Activa (Fallback / NO_ORG / MULTI_NO_SELECTION)
Si un usuario con el role `SUPERADMIN` accede al sistema sin una organización seleccionada, en lugar del embudo típico de "Crear Negocio / Onboarding", se mostrará:
- Un Empty State "Modo Administrador Global Activo".
- Botones de Action Rápida "Panel Global" y "Seleccionar una Organización".

### Con Org Activa
Al seleccionar un contexto (ya sea org propia o inyectada), el Superadmin verá su Dashboard normalmente (para validar reportes B2B), pero existirá un chip de "Operando en: X" donde pueda rápidamente resetear o cambiar su entorno de monitoreo.

## Errores Esperados y Comportamiento Seguro
- **Cookie Inválida**: Si por alguna razón la ID seleccionada falla, se descartará pasivamente, se reiniciará al Empty State VIP sin bloquear la cuenta.
- **Acceso a Entidades B2B en org seleccionada**: Si la org actual es "A", operar una Quote le asignará a la org "A".

## QA Analógico
- Logear como superadmin sin orgs. -> Visualiza Empty State Premium.
- Clic "Panel Global de Organizaciones" -> Redirige a `/admin/orgs`.
- Click "Operar en esta Organización" (En tabla admin) -> Contexto cambia, redirige al Dashboard con data local, mantiene acceso Superadmin.
