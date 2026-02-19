# QA Smoke Test: Auth Organization Resolution (W6.3.1)

Este documento detalla los casos de prueba para validar la corrección en la lógica de resolución de organizaciones y la auto-reparación de membresías huérfanas.

## Requisitos Previos
- Habilitar logs de diagnóstico: `LOG_ORG_RESOLUTION=1` en el entorno.
- Usuario de prueba con una organización ya creada.

## Casos de Prueba (Escenarios Críticos)

### 1. Usuario Recurrente con 1 Organización
- **Escenario**: El usuario ya tiene una organización y no tiene cookies activas (ej: nueva sesión).
- **Acción**: Iniciar sesión o entrar a la raíz `/`.
- **Resultado Esperado**:
    - El sistema debe redirigir automáticamente a `/dashboard`.
    - La cookie `app-org-id` debe quedar establecida con el ID de la organización.
    - Logs (si DEBUG=1): Debe mostrar `ENTER (Única membresía)`.

### 2. Usuario con Múltiples Organizaciones
- **Escenario**: El usuario pertenece a >1 organizaciones.
- **Acción**: Iniciar sesión sin cookie de organización.
- **Resultado Esperado**: Redirección a `/org/select`.
- **Acción 2**: Seleccionar una organización.
- **Resultado Esperado 2**: Redirección a `/dashboard` y establecimiento de cookie.

### 3. Cookie Inválida o de Otra Sesión
- **Escenario**: El usuario tiene una cookie `app-org-id` que apunta a una organización a la que ya no pertenece (o de otro preview URL).
- **Acción**: Navegar a `/dashboard`.
- **Resultado Esperado**: 
    - El resolver debe detectar `Cookie inválida`.
    - El sistema debe re-calcular el acceso basándose en membresías reales.
    - Redirigir según el número de membresías válidas (ENTER o SELECT).

### 4. MEMBRESÍA HUÉRFANA (Auto-repair)
- **Escenario**: Un usuario tiene una organización vinculada en su `Profile` (propiedad) pero no tiene el registro en la tabla `OrganizationMember` (por un error de migración o refactor previo).
- **Acción**: Iniciar sesión.
- **Resultado Esperado**:
    - Logs: `Auto-repair: Detectada org huérfana...`.
    - El sistema debe insertar automáticamente el registro faltante en `OrganizationMember`.
    - El usuario entra a `/dashboard` normalmente.

### 5. Usuario Nuevo Real (0 orgs)
- **Escenario**: Usuario que recién crea cuenta y no ha configurado nada.
- **Acción**: Entrar al sistema.
- **Resultado Esperado**: Redirección a `/start` mostrando el formulario de "Crear Organización".

### 6. Usuario en /start con Orgs Existentes (UX Hardening)
- **Escenario**: El usuario ya tiene orgs pero navega manualmente a `/start`.
- **Resultado Esperado**: 
    - No debe aparecer el formulario de creación como opción principal/única.
    - Debe aparecer un botón prominente: **"Entrar al Dashboard"** o **"Bienvenido de vuelta"**.

---
**Notas Técnicas**:
- Revisar logs en la consola del servidor para verificar el flujo de resolución.
- El hostname se incluye en los logs para depurar problemas en ambientes de preview de Vercel/Cloud-Run.
