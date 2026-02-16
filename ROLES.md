# Guía de Roles y Permisos - TechWise

Esta guía detalla el alcance y las responsabilidades de cada rol dentro de la plataforma.

---

## 🔐 SUPERADMIN (Global)
El rol de gestión total del sistema. Generalmente reservado para el equipo de soporte de TechWise.

- **Alcance**: Global (Todas las organizaciones).
- **Capacidades**:
    - Crear, editar y suspender organizaciones.
    - Definir planes de suscripción y sus límites.
    - Cambiar roles de cualquier usuario en el sistema.
    - Ver métricas globales de uso y facturación.
    - Acceso total a todas las configuraciones del sistema.

## 🏢 ADMIN (Organización)
El administrador de una empresa específica. Tiene control total sobre su propio entorno.

- **Alcance**: Una sola organización.
- **Capacidades**:
    - Invitar y gestionar usuarios de su organización.
    - Configurar datos de la empresa (RUT, Dirección, Logo).
    - Gestionar bodegas y ubicaciones.
    - Ver reportes financieros y de inventario de su empresa.
    - Editar y eliminar cualquier recurso (Proyectos, Cotizaciones, Productos).

## 👷 USER (Operativo)
El usuario estándar que realiza el trabajo diario en la plataforma.

- **Alcance**: Una sola organización.
- **Capacidades**:
    - Crear y editar Proyectos.
    - Gestionar el Inventario (Movimientos, Stock).
    - Crear Cotizaciones y Facturas.
    - Gestionar el CRM (Leads e Interacciones).
    - **No puede**: Eliminar usuarios, cambiar configuraciones de la organización o ver reportes financieros críticos (dependiendo de la configuración).

## 👁️ VIEWER (Visualizador)
Acceso de solo lectura para supervisión o auditoría.

- **Alcance**: Una sola organización.
- **Capacidades**:
    - Ver listados de inventario y proyectos.
    - Consultar estados de cotizaciones.
    - Ver el muro de actividades.
    - **No puede**: Realizar NINGUNA modificación (Crear, Editar o Eliminar).

---

> [!IMPORTANT]
> Los cambios de rol de un **SUPERADMIN** solo pueden ser realizados por otro **SUPERADMIN**.
> Los cambios de rol dentro de una organización deben ser realizados por un **ADMIN** de esa organización.
