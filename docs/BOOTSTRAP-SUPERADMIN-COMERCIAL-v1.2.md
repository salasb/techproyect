# BOOTSTRAP SUPERADMIN COMERCIAL v1.2

## Objetivo y Filosofía
Este documento consagra la arquitectura desacoplada de identidad vs entorno de trabajo comercial para la versión v1.2 de TechProyect.

La regla de oro es: **"El rol define al usuario en el sistema global; la cookie define dónde trabaja hoy"**. El rol de Superadmin es jerárquicamente superior a cualquier espacio de trabajo (organización) y no debe depender de la existencia temporal de la misma.

## 1. Fuentes de Verdad (Sources of Truth)

- **Identidad Global (IsSuperadmin):**
  Solo dictaminado por `Profile.role === 'SUPERADMIN'`.
  Este valor proviene estrictamente de la base de datos (PostgreSQL/Prisma), lo que significa que el nivel de confianza es total. No reside en cookies alterables ni tokens de sesión jwt vulnerables a spoofing local.
  
- **Contexto Operativo Local:**
  Las acciones estándar están gobernadas por la intersección de membresías comprobadas (`activeMemberships`) más la cookie de preferencia temporal (`app-org-id`), resultando en el `activeOrgId`. 
  Sin embargo, una operación en `/admin/...` no exige `activeOrgId`, únicamente exige identidad global `SUPERADMIN`.

## 2. Matriz de Comportamiento Comercial

- **SUPERADMIN (Con o Sin Org):**
  Un usuario cuyo `Profile.role` es `SUPERADMIN` nunca queda bloqueado por la falta de un entorno de trabajo.
  - Podrá operar sobre `/admin` ilimitadamente para aprobar o proveer licencias COMP a otros clientes.
  - En Dashboard, verá su banner privilegiado de navegación o diagnóstico sin forzar el onboarding comercial de *TRIAL*.

- **CLIENTE NORMAL (Sin Org):**
  - Entra en flujo de onboarding riguroso (Banner Setup -> Creación / Selección). 

- **CLIENTE NORMAL (Múltiples Orgs & Domain Hop):**
  - Se le exige el selector `ORG_MULTI_NO_SELECTION` forzosamente, protegiendo las acciones posteriores de mutaciones "a ciegas".

## 3. Superadmin Bootstrap (Promoción a Cero)
Dado que un sistema en frío no tiene SUPERADMIN, la "Primera Sangre" (Zero-to-One) ocurre controlada:
- Una *Allowlist* en variables de entorno (ej. `SUPERADMIN_ALLOWLIST=correo@ejemplo.com`) rige la posibilidad de escalar una cuenta.
- El Dashboard/UI puede presentar un "Botón Bomba" (Bootstrap Control) discretamente solo si el email autenticado hace match con la Allowlist pero el usuario aún tiene el rol base de systema (`MEMBER` o `OWNER`).
- Al ejecutarse, una transacción idempotente muta `Profile.role = 'SUPERADMIN'` en Prisma y redirige con acceso maestro consolidado. No expone tokens estáticos vulnerables en el DOM.

## 4. Hardening Adicional 
Las capas de middleware y server wrappers (`requireSuperadmin`) han sido endurecidas para depender exclusivamente de `workspace-resolver.ts` devolviendo `isSuperadmin: true` de forma atómica y explícita para evitar suposiciones inseguras o fugas de elevación.
