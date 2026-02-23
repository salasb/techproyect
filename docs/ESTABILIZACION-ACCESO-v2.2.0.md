# Estabilización de Acceso y Orquestación v2.2.0

## Objetivo
Cerrar la orquestación de entrada por rol y eliminar crashes en producción relacionados con el contexto y la configuración.

## Cambios Implementados

### 1. Orquestación de Entrada Canónica (Policy v2.2.0)
- **Ruta Recomendada (Superadmin)**: Ahora los `SUPERADMIN` siempre son recomendados a entrar por `/admin` (Global Cockpit) por defecto, independientemente de si tienen un contexto de organización activo. Esto garantiza una experiencia de "Command Center" global consistente.
- **Middleware**: Se ajustó la redirección en `/login`. Los usuarios autenticados que intenten acceder a `/login` ahora son enviados a `/` (la raíz), permitiendo que el resolver centralizado decida el portal correcto (Admin vs Dashboard).
- **Home (`/`)**: Actúa como el orquestador principal usando `recommendedRoute`.

### 2. Estabilización de Settings (Blindaje)
- Se corrigió el crash "Client-side exception" en `/settings`.
- **Defensiva en Server Component**: Se reemplazó `single()` por `maybeSingle()` y se agregaron fallbacks para cuando la tabla `Settings` está vacía o hay errores de permisos.
- **Defensiva en Client Components**:
    - `GlobalAuditLog`: Agregada validación para el array de `logs` y protección en `log.action.replace()`.
    - `SettingsForm`: Se asegura de recibir un objeto válido aunque los datos de DB fallen.

### 3. UX de Identidad y Modo
- **Header**: Se garantiza la visibilidad del badge `SuperAdmin` y se añade claridad sobre el modo de operación (`Modo Local` vs `Panel Global`).
- **Dashboard Guard**: El layout de dashboard redirige proactivamente a Superadmins sin contexto a `/admin` para evitar estados de "Context: Ninguna" en vistas operativas.

## Verificación
- [x] Login con Superadmin -> Redirige a `/admin`.
- [x] Acceso a `/settings` -> Carga sin errores incluso con datos parciales.
- [x] Cambio de contexto local -> El header muestra "Modo Local".
- [x] Retorno a global -> Botón de Shield siempre visible para SA.

## Estado Final
**LISTO PARA DESPLIEGUE**. Se eliminaron los puntos de fallo único por nulabilidad en la entrada.
