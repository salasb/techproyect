# Hallazgos Priorizados - TechProyect (v1.0)

## Matriz de Hallazgos

| ID | Categoría | Módulo | Hallazgo | Severidad | Impacto Negocio | Complejidad | Orden |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **H-01** | Auth / Access | Global Shell | Fuga de TRIAL para Superadmin | **S0** | Alto (UX/Op) | Media | 1 |
| **H-02** | Comm. Logic | Finance | Divergencia de cálculos de margen | **S1** | Alto (Inconsist) | Alta | 2 |
| **H-03** | Dead Code | FS / Routes | Rutas /purchases y /vendors zombies | **S2** | Bajo (Manten) | Baja | 3 |
| **H-04** | Auth / Access | Resolvers | Múltiples fuentes de verdad de identidad | **S1** | Medio (Bugs) | Alta | 4 |
| **H-05** | Performance | Dashboard | Bloqueo de render por 10+ fetches | **S1** | Medio (UX) | Media | 5 |
| **H-06** | UX / Shell | Sidebar | Sidebar sobrecargado (EBAC ignorado) | **S2** | Medio (UX) | Baja | 6 |
| **H-07** | Data Integrity | Constants | Duplicidad de constantes (IVA/FX) | **S2** | Bajo (Consist) | Baja | 7 |
| **H-08** | QA / Integrity | Build | Exceso de 'any' en dominio financiero | **S1** | Medio (Fragil) | Alta | 8 |

---

## Roadmap de Reparación Recomendado

### OLA A — Bloqueos Estructurales (Semana 1)
*   **Meta:** Limpiar el ruido visual del operador y unificar el acceso.
*   **Acciones:**
    1.  Consolidar `ShellCommercialDisplay` en el layout raíz para inyectar una sola versión de la verdad comercial.
    2.  Ocultar físicamente los módulos de Inventario/Catálogo si el Plan no los incluye (EBAC Real).
    3.  Eliminar carpetas `/purchases` y `/vendors`.

### OLA B — Verdad Comercial y Dashboard (Semana 2)
*   **Meta:** Garantizar que los números coincidan en todas las pantallas.
*   **Acciones:**
    1.  Migrar cálculos de `DashboardService` a un servicio de dominio financiero compartido.
    2.  Implementar interfaces estrictas para Proyectos y Cotizaciones eliminando el uso de `any`.
    3.  Alinear el estado `EN_ESPERA` con la existencia de una cotización emitida.

### OLA C — Optimización y Limpieza (Semana 3)
*   **Meta:** Mejorar velocidad percibida y reducir deuda técnica.
*   **Acciones:**
    1.  Refactorizar el Sidebar para usar un config dinámico basado en Entitlements.
    2.  Unificar constantes globales en `src/config`.
    3.  Implementar Smoke Tests básicos en CI/CD para evitar regresiones en el bypass de Superadmin.
