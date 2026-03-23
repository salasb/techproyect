# Contrato de Dominio: Project ↔ Quote (v1)

## 1. Jerarquía Comercial y Fuente de Verdad
- **El `Project` es el contenedor principal y la fuente de verdad del ciclo de vida del negocio.** Todo prospecto de venta que se busca ejecutar se crea como un `Project`.
- **La `Quote` (Cotización) es una *versión formal* y un *documento* enviado al cliente.** Un proyecto puede existir sin una Quote (etapa temprana).
- La fuente de verdad financiera del proyecto depende de su estado:
  - Si el proyecto **no tiene QuoteItems** (es un proyecto genérico/temprano), su valor está determinado por el `budgetNet` del `Project`.
  - Si el proyecto **tiene QuoteItems** (se ha empezado a cotizar en detalle), la suma de los `QuoteItems` es la ÚNICA fuente de verdad de sus ingresos (`priceNet` y `priceGross`), y el `budgetNet` actúa meramente como un "presupuesto base referencial".

## 2. Definición de "Draft"
- **"Draft" ya no es una entidad independiente paralela.** Un "Draft" de cotización es simplemente un `Project` que se encuentra en la etapa inicial de `COTIZACION` o un proyecto en `EN_ESPERA` pero que todavía no se ha marcado como enviado (`quoteSentDate` es nulo).
- Cuando la UI muestra "Cotizaciones en Draft", en realidad está filtrando `Project` donde `status = 'EN_ESPERA'` y `quoteSentDate = null`.

## 3. Nacimiento de una Quote Formal
- Una Quote formal "nace" cuando el usuario decide **Enviar** la propuesta al cliente. En este momento:
  - Se registra el `quoteSentDate` en el `Project`.
  - Se puede generar un registro histórico inmutable si se desea (versiones), pero el estado del `Project` pasa a `EN_ESPERA` (Esperando respuesta del cliente) si no lo estaba ya.

## 4. Aceptación de la Cotización
- Cuando el cliente acepta una cotización (ya sea digitalmente por el portal público o de forma manual por un agente), se desencadena una sincronización obligatoria.
- La aceptación implica:
  - Establecer `Project.acceptedAt = NOW()`.
  - Cambiar automáticamente el `Project.status` de `EN_ESPERA` a `EN_CURSO` (o equivalente operativo).
  - Los `QuoteItems` en ese momento se "congelan" y representan el alcance acordado.

## 5. Pantallas y Entidades (Single Source of Truth)
- **Projects List y Dashboard:** Siempre leen desde `Project` (con sus `QuoteItems` y `costEntries` incluidos). Utilizan `FinancialDomain.getProjectSnapshot(project)` para el cálculo del valor total. Nunca leen la tabla `Quote` por separado para sumar valores.
- **Quotes List:** Lee desde la tabla `Project`, filtrando por aquellos que están en etapa comercial (`EN_ESPERA` o que tienen items de cotización). Muestra la fecha de envío (`quoteSentDate`) y la versión de la última propuesta.

Este contrato asegura que no existan discrepancias financieras y que la transición entre el proceso de venta (Quote) y la operación (Project) sea natural y sincronizada en la misma entidad contenedora.
