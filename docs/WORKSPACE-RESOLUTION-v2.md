# Workspace Resolution v2 (Robust Persistence)

## El Problema del "Domain Hop"
Cuando el despliegue del software está hospedado en infraestructuras como Vercel y se asocian dominios personalizados (ej. `produccion.com`) pero las Vercel Deployments apuntan a `proyecto-xxx.vercel.app`, el contexto de la Cookie (`app-org-id`) **no se transfiere entre dominios**. 

Esto ocasionaba que los usuarios regulares de Producción se confundieran al ver el Dashboard vacío si abrían accidentalmente un enlace de un PR o Deployment Preview, pese a que su usuario sí tenía acceso en Bases de Datos a distintas Organizaciones.

## Lógica del "Last Active Org" (`Profile.organizationId`)
A partir de la v2, el campo `organizationId` dentro del modelo `Profile` asume el rol de **`lastActiveOrg` cache**.

Al navegar a `/dashboard`, la función `getWorkspaceState` procede con esta cascada de decisiones:
1. **Cookie Hit:** ¿Llegó una cookie `app-org-id` limpia y válida que coincida con una membresía activa (`OrganizationMember`)? 
   * **SI:** Continúa, usa esa org.
   * **NO:** Sigue intentando.
2. **Caso `memberships === 1`:** ¿El usuario solo pertenece a UNA empresa?
   * **SI:** Auto-selecciona el ID de la empresa, inyecta/restaura silenciosamente la cookie `app-org-id`, y actualiza el DB en `Profile.organizationId = ID`. Entra al Dashboard.
3. **Caso `memberships > 1`:** (Múltiples empresas pero cookie perdida):
   * ¿Tiene guardado en su perfil de DDBB (`Profile.organizationId`) un ID que calza con sus membresías actuales?
   * **SI:** Auto-selecciona su "Última Empresa Activa", reconstruye la cookie y lo deja pasar.
   * **NO:** Se asigna forzosamente `activeOrgId = null`. El middleware de renderizado interceptará al usuario obligándolo a hacer Click en el "Selector de Organizaciones" antes de ver los KPI.

### Anti-Ghosting
Esta estrategia se apoya validando consistentemente contra `OrganizationMember`. Es imposible inyectar una "Organización Fantasma", ya que cualquier persistencia en local storage, cookies, o en el profile cache se compara mediante la query `.some(m => m.organizationId === tryOrgId)` que está protegida del sistema. 

## Workspace Doctor (`/api/_debug/workspace-doctor`)
Se ha instaurado un enpoint analítico exclusivo solo disponible para entornos locales (o si se fuerza la variable `DEBUG_WORKSPACE="1"`).

Ofrece una vista asimétrica muy útil que delata:
- A qué Base de Datos Supabase estamos apuntando (`supabaseProjectRef`).
- Cuál es el Host (`host`).
- Cuántas orgs tiene en BD vs Cuál está leyendo desde Cookies (`activeOrgFromCookie`).
- Métricas contables referenciando la org que la plataforma asumió (`projectsCount`, `quotesCount`, `clientsCount`).
