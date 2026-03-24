# Contrato de Dominio: Project ↔ Quote (v2.0)

## 1. Fuente de Verdad Única
- **El `Project` es el contenedor maestro.** 
- **La `Quote` es el compromiso comercial.** 
- Una vez que una cotización es **ACEPTADA**, sus términos (items, precios, costos) se sincronizan de vuelta al `Project` para asegurar que el Dashboard, los Reportes y la Facturación vean la "realidad aceptada".

## 2. Ciclo de Vida de la Cotización
- **DRAFT:** Versión en preparación. No afecta métricas de "Revenue Pulse" pero sí el "Margin Proyectado".
- **SENT:** Versión enviada al cliente. El proyecto entra en estado `EN_ESPERA`.
- **ACCEPTED:** Versión aprobada. Activa el proyecto (`EN_CURSO`), genera la primera factura automáticamente y congela los items en el proyecto.
- **REJECTED:** Versión rechazada. Si es la única o la última, el proyecto pasa a `CANCELADO`.
- **REVISED:** Cuando se crea una nueva versión (vN+1), la anterior queda como histórico pero la nueva hereda los items para seguir editando.

## 3. Sincronización Obligatoria (OLA 2A)
- **Acción: ACEPTAR**
  - `Quote.status` -> `ACCEPTED`
  - `Project.status` -> `EN_CURSO`
  - `Project.acceptedAt` -> `now()`
  - `Quote.items` -> Clonados a `Project.quoteItems` (donde `quoteId is null`).
- **Acción: RECHAZAR**
  - `Quote.status` -> `REJECTED`
  - `Project.status` -> `CANCELADO`

## 4. Identificación de la "Cotización Vigente"
En cualquier pantalla de resumen, la cotización vigente se determina por:
1. La que tenga estado `ACCEPTED`.
2. Si no hay ninguna, la más reciente con estado `SENT`.
3. Si no hay ninguna, la más reciente con estado `DRAFT`.

Esta jerarquía elimina la ambigüedad de "cuál versión manda".
