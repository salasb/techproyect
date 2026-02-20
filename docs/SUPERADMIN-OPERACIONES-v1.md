# Superadmin Operaciones v1

Los Superadmins manejan el acceso global de las Organizaciones. 

## Vista Principal: `/admin/orgs`
Muestra una grilla con:
- Todas las Organizaciones (rut, nombre).
- Plan Acutal y Status.
- Métricas rápidas (Usuarios, Proyectos).
- Panel de Control (Activar/Suspender, Más Opciones).

## Acciones Críticas
Ubicadas bajo el menú kebab (tres puntos) o directas en la tabla. Todas corren como 'Server Actions' en `src/actions/superadmin.ts` y fuerzan verificación estricta de rol Prisma.

### 1. Activar/Suspender (Toggle)
- **Activación**: Pasa manualmentee cualquier Origen (PENDING, INACTIVE) a `ACTIVE`.
- **Suspensión**: Pasa a `INACTIVE`. Si la organización es INACTIVE, el Workspace Resolver en middleware / backend echará a cualquier miembro estándar de sus rutas protegidas.

### 2. Otorgar COMP (Complementary)
Regala acceso comercial "por la casa" sorteando bloqueos de pago.
- Define `status="ACTIVE"`, `compedUntil= [1 año adelante]`, `source="COMPED"`.
- Rescata negocios a punto de chrun.

### 3. Extend Trial (Extender Prueba)
Dale un alivio a un cliente que está en negociación.
- Añade `N` días seleccionables a `trialEndsAt`. 
- Deja el estatus de vuelta en `TRIALING`.

## Trazabilidad e Inmutabilidad
El Superadmin NUNCA borra organizaciones (`DELETE`). Si una empresa requiere dar de baja, se SUSPENDE (`INACTIVE`), dejando el hash y RUT guardados para propósitos fiscales e históricos. 
Todas las transacciones descritas arriba disparan inserts en `AuditLog` con action "SUPERADMIN_{ACTION}" y el email de quien ejecutó los cambios, facilitando auditorías de seguridad en caso de escaladas no autorizadas.
