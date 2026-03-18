# REPORTE DE ESTABILIZACIÓN: SETTINGS, PROYECTOS Y KANBAN (v1.0)
Fecha: 18 de Marzo, 2026
Autor: Principal Product Engineer / TechProyect

## 1. INVENTARIO DE SOLUCIONES

### A. Settings (Team, Organization, Billing)
- **Causa Raíz:** Los Superadmins (Global Operators) recibían un error `FORBIDDEN` si no eran miembros explícitos de la organización que intentaban gestionar.
- **Solución:** Se flexibilizó el `SettingsCoreService` para permitir el bypass de membresía a usuarios con rol global de Superadmin.

### B. Auditoría Financiera
- **Causa Raíz:** Excesivo peso visual en el detalle del proyecto.
- **Solución:** Rediseño a formato **Compact Widget**. Se redujo el padding, se simplificó el gráfico de salud y se movieron los detalles de alertas a una lista minimalista.

### C. Bitácora (Bug Visual)
- **Causa Raíz:** Renderizado duplicado de componentes (`ProjectLogsManager` + `UnifiedTimeline`) en la misma pestaña.
- **Solución:** Se consolidó la visualización exclusivamente en `UnifiedTimeline`, eliminando el componente redundante y saneando el layout.

### D. Estado del Proyecto (Automatización)
- **Causa Raíz:** Falta de claridad en la transición "En Espera" -> "En Curso".
- **Solución:** Implementada **Máquina de Estados Inteligente**. El sistema ahora detecta actividad comercial real (asignación de cliente, creación de notas o costos) y promociona el proyecto automáticamente a "En Curso", registrando el evento en la bitácora.

### E. Kanban Clientes
- **Causa Raíz:** Fallo de persistencia al usar Supabase SDK (PostgREST) en la acción de mover tarjetas.
- **Solución:** Migración de `updateClientStatus` a **Prisma (Server-only)**. Esto garantiza que el cambio de columna sea atómico y no falle por restricciones de esquema en Preview.

## 2. CHECKLIST QA
- [x] Superadmin puede entrar a settings de cualquier org.
- [x] Auditoría financiera no roba espacio operativo.
- [x] Bitácora muestra una sola línea de tiempo limpia.
- [x] Proyectos pasan a "En Curso" al recibir su primera nota/costo.
- [x] Drag and drop en Kanban persiste correctamente.
