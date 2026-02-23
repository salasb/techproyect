# Cockpit Global v3.2 - Operational Ready

Este documento detalla la arquitectura final de robustez y operatividad del Cockpit Global (`/admin`), consolidando la transición de un sistema resiliente a uno completamente funcional para producción.

## 1. Arquitectura de Estados por Bloque

El Cockpit opera bajo un modelo de **Aislamiento de Carga**. Cada sección del dashboard es independiente y reporta su propio estado vital.

### Estados de Bloque (BlockStatus)
- **`ok`**: Datos sincronizados y visibles.
- **`empty`**: Consulta exitosa pero sin registros (estado válido, no es error).
- **`degraded_config`**: Falta configuración de infraestructura (Safe Mode). Muestra placeholders neutrales.
- **`degraded_service`**: El servicio o la base de datos falló. Se captura para evitar el crash total de la página.

## 2. Safe Mode vs Operational

| Característica | Safe Mode (Degradado) | Operational (Completo) |
| :--- | :--- | :--- |
| **Requisito** | Falta `SUPABASE_SERVICE_ROLE_KEY` | Configuración Completa |
| **Badge Header** | Ámbar: "Safe Mode" | Verde: "Operational" |
| **KPIs** | Standby ("---") | Datos Reales |
| **Gráficos** | Placeholder Informativo | Rendimiento en Tiempo Real |
| **Directorio** | Bloqueado por Seguridad | Acceso Maestro (Bypass RLS) |

## 3. Variables de Entorno Críticas

Para el funcionamiento total (Operational Ready), el entorno debe contar con:
- `NEXT_PUBLIC_SUPABASE_URL`: Endpoint de API.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Acceso público.
- `SUPABASE_SERVICE_ROLE_KEY`: **CRÍTICO**. Permite la administración global.
- `SUPERADMIN_ALLOWLIST`: Lista blanca de correos raíz.

## 4. Guía de Diagnóstico

### Logs de Servidor
Todas las operaciones del adaptador están trazadas con el prefijo `[CockpitAdapter]`.
- `[CockpitAdapter][Config]`: Reporta el modo detectado al inicio.
- `[CockpitAdapter][Block:Name]`: Reporta el éxito/fallo y tiempo de carga de cada módulo.

### Test IDs para Automatización
Se han incluido identificadores para pruebas de humo:
- `cockpit-global-mode-badge`: Estado del sistema.
- `cockpit-orgs-table`: Tabla maestra de empresas.
- `cockpit-metrics-card`: Módulo financiero.

## 5. Próximos Pasos
1. Implementar motor de alertas en tiempo real vía Webhooks.
2. Añadir exportación masiva de datos consolidados.
3. Panel de auditoría de seguridad para detectar accesos anómalos.

---
**TechWise Engineering** - v3.2 2026 - Operational Ready
