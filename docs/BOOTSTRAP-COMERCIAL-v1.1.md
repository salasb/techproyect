# BOOTSTRAP COMERCIAL v1.1

## Objetivo
Este documento define las reglas de negocio, estados de UI y responsabilidades para el "Arranque Comercial" del sistema. Su propósito es garantizar que un usuario real, independientemente de su estado interno en la base de datos (por ejemplo, pérdida de cookies, perfil faltante o esperando aprobación), siempre tenga una ruta clara a seguir, sin experimentar "pantallas blancas", bucles infinitos de carga o mensajes de error crípticos.

## 1. Estados Exactos del Onboarding (Contrato de WorkspaceStatus)

El sistema ahora opera bajo una máquina de estados estricta gestionada por `src/lib/auth/workspace-resolver.ts`. Cada estado dicta lo que el usuario ve en el Dashboard:

- `NOT_AUTHENTICATED`: El usuario no tiene sesión válida en Supabase. Acción: Redirigir al Login.
- `WORKSPACE_ERROR`: Ocurrió un fallo en el resolver (ej. timeout de la base de datos). 
  - **Experiencia de Usuario:** Banner naranja indicando "Demora o error al cargar contexto".
  - **Call To Action (CTA):** Botón para "Reintentar" (recargar la página).
- `PROFILE_MISSING`: El usuario existe en Supabase Auth, pero la tabla `Profile` no tiene un registro correspondiente u ocurrió una desincronización severa.
  - **Experiencia de Usuario:** Banner rojo alertando "Error de sincronización de perfil".
  - **Call To Action (CTA):** Enlace al Endpoint Forense (`/api/_debug/workspace-doctor`) o contacto de soporte. No se asume que es un usuario "nuevo".
- `NO_ORG`: El usuario tiene perfil, pero no pertenece a ninguna organización. Es un usuario genuinamente nuevo (si no aplicó auto-provisioning).
  - **Experiencia de Usuario:** Banner premium de bienvenida ("Bienvenido a TechProyect").
  - **Call To Action (CTA):** "Crear Organización", "Seleccionar Existente", o entrar a "Modo Exploración" (opcional).
- `ORG_MULTI_NO_SELECTION`: El usuario pertenece a una o más organizaciones, pero perdió su cookie de selección (`app-org-id`) y no se pudo resolver un "fallback" seguro. (Escenario clásico de *Domain Hop*).
  - **Experiencia de Usuario:** Banner ámbar indicando "Selecciona tu espacio de trabajo".
  - **Call To Action (CTA):** Enlace obligatorio al `/org/select`. Nunca se le debe mostrar la pantalla de "Crear Organización" de un usuario nuevo.
- `ORG_PENDING_APPROVAL`: El usuario pertenece a una organización, pero esta fue creada mientras la bandera `MANUAL_APPROVAL_REQUIRED=1` estaba activa, y un Superadmin aún no la aprueba.
  - **Experiencia de Usuario:** Banner azul oscuro indicando "Aprobación Pendiente".
  - **Call To Action (CTA):** Mensaje pasivo indicando que el equipo está revisando su solicitud. Las herramientas del dashboard estarán bloqueadas o invisibles.
- `ORG_ACTIVE_SELECTED`: El usuario tiene una organización activa y lista para operar.
  - **Experiencia de Usuario:** Dashboard operativo normal.
  - **Casos Empty:** Si la organización es nueva y no tiene proyectos, se mostrarán *Empty States Profesionales* ("Crea tu primer proyecto", "Registra tu primer cliente") en lugar de ver gráficos rotos o en blanco de demostración fraudulenta.

## 2. Flujo de Decisión de Superadmin

A través del entorno en `/admin/orgs`, el rol `SUPERADMIN` es el único con la capacidad de alterar los estados de suscripción o acceso comercial. Sus acciones están trazadas mandatoriamente en la tabla `AuditLog`.

- **Aprobar:** Transiciona una organización de `PENDING` a `ACTIVE`. Automáticamente, el cliente pasa al estado `ORG_ACTIVE_SELECTED` en su próximo refresco.
- **Trial / COMP:** El Superadmin puede extender días de Trialing o regalar acceso "COMP" manual para un negocio específico.
- **Pausar / Desactivar:** Revoca el acceso a usuarios morosos o que incumplen términos, pasándolos a `INACTIVE` o `PAUSED`.

## 3. Reglas de Negocio Inmutables

1. **Cero Spinners Infinitos:** Ninguna operación de data fetching en el dashboard debe demorar más de 6 segundos. Si una colección pesada (ej. `Sentinel`) falla, debe proveer un layout parcial o ceder el control al fallback `WORKSPACE_ERROR`.
2. **Cero Mutaciones de Cookie Inseguras:** Las asignaciones de la cookie `app-org-id` deben hacerse de forma *idempotente* y atrapando errores context variables en Next.js Server Components.
3. **Copy Profesional:** La terminología se centra en "Espacio de Trabajo", "Organizaciones", "Aprobación Comercial", evadiendo terminología técnica u hostil frente al usuario.
