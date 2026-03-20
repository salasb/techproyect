# Auditoría Forense del Sistema - TechProyect (v1.0)

## 1. Resumen Ejecutivo
Se ha realizado una radiografía técnica y de producto del sistema TechWise SaaS. El sistema presenta una arquitectura robusta basada en Next.js 15+ pero con signos claros de erosión estructural debido a la coexistencia de múltiples versiones de resolutores de identidad y lógica comercial distribuida en componentes de UI.

### Los 10 problemas más graves (Prioridad S0/S1)
1.  **Fuga de Identidad Comercial:** El Superadmin visualiza etiquetas de "TRIAL" y banners de venta, degradando la experiencia de operador.
2.  **Divergencia de Cálculo Financiero:** Los márgenes se calculan en `DashboardService` (UI) y `financialCalculator` (Backend) con reglas potencialmente distintas.
3.  **Ambigüedad en Aceptación:** Solapamiento funcional entre "Aceptación Digital" (configuración) y el botón "Aceptar" (estado comercial).
4.  **Huérfanos Zombies:** Las rutas `/purchases` y `/vendors` existen en el FS pero fueron dadas de baja en la UI, manteniendo deuda de mantenimiento.
5.  **Build Frágil:** Dependencia de `any` en servicios financieros críticos y falta de interfaces estrictas en el dominio de cotizaciones.
6.  **Performance del Dashboard:** Bloqueo de renderizado por fetch paralelo masivo sin priorización de streaming.
7.  **Entitlements Ignorados:** Algunas acciones de servidor validan rol (RBAC) pero no validan si el plan de la organización permite la feature (EBAC).
8.  **Empty States Mudos:** Visualización de "$0.0M" en reportes y dashboard que sugiere error del sistema en lugar de falta de datos.
9.  **Duplicidad de Constantes:** Definiciones de IVA y tasas de cambio dispersas en múltiples archivos.
10. **Fragmentación de Auth:** Coexistencia de `workspace-resolver`, `access-resolver` y `session-resolver`.

### Las 5 causas raíz más repetidas
1.  **Falta de una Capa de Dominio Pura:** Los componentes acceden directamente a Prisma o recalculan lógica de negocio.
2.  **Refactorizaciones Incompletas:** Se añaden resolutores nuevos (v3.0) sin retirar los antiguos (v1.0).
3.  **Invisibilidad del Rol Global:** El sistema no diferencia de forma nativa entre "Quién eres" (Operador) y "Qué miras" (Organización).
4.  **Enfoque en 'Happy Path':** Ausencia de flujos de error y estados de carga diseñados para organizaciones nuevas.
5.  **Deuda de Tipado:** El uso extensivo de `any` ha permitido que la lógica comercial se vuelva inconsistente.

---

## 2. Mapa Real del Sistema

| Módulo | Propósito Real | Estado | Fuente de Verdad | Riesgo |
| :--- | :--- | :--- | :--- | :--- |
| **Dashboard** | Centro de comando | Operativo (Lento) | DashboardService | Alto (Cálculos en UI) |
| **Proyectos** | Gestión operativa | Operativo | Prisma / Project | Medio |
| **Cotizaciones** | Propuestas comerciales | Operativo | Prisma / Quote | Alto (Doble estado) |
| **Facturación** | Gestión de cobro | Parcial | Stripe / Subscription | Crítico (Sync) |
| **Inventario** | Control stock | Operativo | InventoryService | Bajo |
| **Cockpit Global** | Gestión plataforma | Operativo | AccessContext | Medio (Fuga visual) |

---

## 3. Auditoría Contractual de Producto

| Concepto | Contrato Real | Contrato Implícito | Problema |
| :--- | :--- | :--- | :--- |
| **Proyecto EN_ESPERA** | No tiene cotización enviada | Cotización en borrador | Se marca como 'Trial' visualmente |
| **Aceptación Digital** | Flag de configuración | Cambio de estado comercial | Duplicidad de intención con 'Aceptar' |
| **Global Operator** | Superadmin/Creator | Usuario administrador local | Ve banners de upgrade innecesarios |
| **Módulos Opcionales** | Visibles para todos | Ocultos por plan | Sidebar sobrecargado |

---

## 4. Auditoría de Acceso y Entitlements
Se detectó que `AppHeader` y `SidebarContent` intentan resolver la identidad de forma independiente. Aunque existe `resolveCommercialDisplay`, la información llega fragmentada desde el `DashboardLayout`, lo que causa que el bypass de Superadmin no siempre sea efectivo en el renderizado inicial de banners.

---

## 5. Performance y Limpieza
- **Huérfanos Confirmados:** `/app/purchases`, `/app/vendors`.
- **Refactor ROI:** Unificar la lógica de márgenes en un solo servicio de dominio financiero.
- **Performance:** Implementar priorización de carga en el Dashboard mediante `Suspense` granular.
