# OLA A: Estabilización Estructural y Flujos Core (v1.0)

## Resumen de la Intervención
Este batch resuelve la fragmentación de identidad en el Shell y estabiliza el flujo crítico de creación de proyectos, eliminando ruido visual para operadores globales y saneando módulos huérfanos.

## 1. Consolidación de Identidad (Shell Truth)
- **Causa Raíz:** Componentes como `SidebarContent` leían el estado de suscripción directamente del perfil, ignorando el bypass del Superadmin.
- **Solución:** Se forzó el uso de `useShellCommercialDisplay()` en todo el Shell. El `DashboardLayout` ahora provee este contexto basado en la fuente de verdad de alto nivel (`AccessContext`).
- **Resultado:** El Creator/Superadmin ya no ve banners de Trial ni etiquetas degradantes en ninguna parte del Shell.

## 2. Navegación por Entitlements (EBAC)
- **Causa Raíz:** El Sidebar mostraba módulos opcionales (Inventario, QR) basados en RBAC (rol), no en el plan contratado.
- **Solución:** Refactor de `SidebarContent.tsx` para filtrar ítems usando `visibleModules` proveniente del resolver de Entitlements.
- **Resultado:** Interfaz limpia que solo muestra lo que la organización tiene habilitado.

## 3. Estabilización de "Crear Proyecto"
- **Bug Detectado:** El formulario se quedaba "pegado" en estado "Creando" y limpiaba el título sin confirmar éxito.
- **Causa Raíz:** El manejador `action` no liberaba el estado `isLoading` si la Server Action devolvía un error de datos (no excepción). Además, el ciclo de vida de `action` en React causaba resets inesperados.
- **Solución:** Migración a `onSubmit` con control total de estado. Manejo explícito de respuestas de éxito y error.
- **Resultado:** Flujo estable, feedback inmediato vía Toast y redirección confiable.

## 4. Limpieza de Módulos Zombies
- Se confirmó la eliminación de rutas físicas para `/purchases` y `/vendors`.
- Se eliminaron renderizadores de banners trial duplicados en el Header.

## QA Ejecutado
- [x] Superadmin no ve "TRIAL" en Org Switcher ni banners azules.
- [x] Usuario normal sí ve experiencia Trial completa.
- [x] Sidebar oculta Inventario/QR si no hay plan Pro.
- [x] Formulario Crear Proyecto crea registros en DB y redirige sin bloquearse.
- [x] `npm run build` exitoso.
