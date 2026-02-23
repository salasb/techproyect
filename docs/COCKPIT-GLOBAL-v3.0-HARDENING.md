# Cockpit Global v3.0 - Hardening & Resiliencia

Este documento detalla la arquitectura de robustez implementada en el Cockpit Global (`/admin`) para garantizar una operación continua incluso ante configuraciones incompletas o fallos en servicios externos.

## 1. Arquitectura de Resiliencia

El Cockpit implementa un patrón de **Degradación Elegante (Graceful Degradation)** basado en tres capas:

### A. Configuración en Tiempo de Ejecución (`getServerRuntimeConfig`)
Centralizamos la validación de infraestructura en `src/lib/config/server-runtime.ts`.
- Detecta la ausencia de `SUPABASE_SERVICE_ROLE_KEY`.
- No lanza excepciones; devuelve un estado tipado (`isDegradedMode`).
- Permite que el shell de la aplicación cargue siempre.

### B. Adaptador de Datos Maestro (`getCockpitDataSafe`)
Ubicado en `src/lib/superadmin/cockpit-data-adapter.ts`, esta capa actúa como firewall de datos:
- Si detecta modo degradado, retorna inmediatamente payloads de fallback (0s y listas vacías).
- Si está en modo completo, ejecuta las queries en paralelo con `Promise.all` pero envuelve cada una en un `catch` individual.
- **Resultado:** Si el módulo de métricas falla, las alertas y la lista de organizaciones siguen funcionando.

### C. UI de Modo Seguro
- Reemplaza mensajes de error técnicos por estados informativos neutrales (ámbar).
- Bloquea visualmente componentes que requieren privilegios de `service_role` (ej. gráficas financieras consolidadas).
- Mantiene la navegación operativa para ajustes del sistema.

## 2. Variables de Entorno Requeridas

| Variable | Requerida | Propósito |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | SÍ | Conexión base Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | SÍ (para Full Mode) | Bypass de RLS y acceso multi-tenant consolidado. |
| `DATABASE_URL` | SÍ | Conexión directa Prisma para reportes complejos. |
| `SUPERADMIN_ALLOWLIST` | SÍ | Lista de correos con acceso raíz. |

## 3. Comportamiento por Entorno

### Modo Degradado (Preview / Local sin Key)
- **Dashboard:** Carga con 0s y banner de advertencia.
- **Alertas:** Muestra estado "En espera".
- **Métricas:** Muestra placeholder "Visualización Desactivada".
- **Logs:** Indica `[CockpitDataAdapter] Running in DEGRADED MODE`.

### Modo Completo (Producción / Preview con Key)
- **Dashboard:** Datos reales en tiempo real.
- **Alertas:** Listado activo del ecosistema.
- **Métricas:** Gráficas de rendimiento TechWise.
- **Auditoría:** Registra `SUPERADMIN_COCKPIT_VIEWED`.

## 4. Próximos Pasos
1. Configurar `SUPABASE_SERVICE_ROLE_KEY` en Vercel Dashboard para entornos de Preview si se requiere validación completa.
2. Implementar filtros avanzados en el Directorio Maestro.
3. Añadir Webhook Monitor para trazar salud de Stripe desde el Cockpit.

---
**Nota de Seguridad:** La `service_role_key` es exclusivamente para uso en servidor. Nunca se exporta en `NEXT_PUBLIC_` ni se usa en componentes con `'use client'`.
