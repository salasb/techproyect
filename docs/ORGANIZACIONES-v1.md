# Organizaciones v1 (MVP Operable)

## 1. Resumen de Arquitectura
Se ha descentralizado la gestión de organizaciones para que sea accesible por cualquier usuario autenticado, eliminando la dependencia de la página legacy `/start`.

### Componentes Clave:
- **Listado**: `/organizations` - Panel central para ver y entrar a espacios de trabajo.
- **Creación**: `/organizations/new` - Formulario atómico para inicializar una empresa.
- **Configuración**: `/settings/organization` - Edición de datos legales y de identidad.
- **Equipo**: `/settings/organization/team` - Gestión de miembros (invitaciones, roles y bajas).

## 2. Matriz de Permisos (RBAC)
| Acción | Permiso Requerido | Nivel |
| :--- | :--- | :--- |
| Crear Org | Ninguno (Autenticado) | Global |
| Editar Org | `ORG_MANAGE` | Organización |
| Invitar Miembro | `TEAM_MANAGE` | Organización |
| Cambiar Rol | `TEAM_MANAGE` | Organización |
| Remover Miembro | `TEAM_MANAGE` | Organización |

## 3. Seguridad e Identidad (IDOR Prevention)
- Todas las acciones server-side validan el `orgId` extraído del contexto seguro (cookies/sesión) y no del body de la petición cuando se trata de gestión interna.
- Se utiliza `requirePermission` para asegurar que el usuario pertenece a la organización antes de cualquier mutación.

## 4. Auditoría
Eventos registrados en `auditLog`:
- `ORG_CREATED`: Al crear una nueva empresa.
- `ORG_UPDATED`: Al modificar datos del perfil.
- `INVITE_SENT`: Al enviar una invitación por correo.
- `MEMBER_ROLE_CHANGED`: Al promover o degradar a un colaborador.
- `MEMBER_REMOVED`: Al dar de baja a un miembro.

## 5. Resiliencia
- **OrgSwitcher**: Si no hay organización activa, redirige a `/organizations` en lugar de fallar silenciosamente.
- **Fail-safe**: En caso de error de base de datos en el bootstrap, la UI permite continuar hacia el Dashboard con funcionalidad limitada.

---
*TechWise Engineering v1.0*
