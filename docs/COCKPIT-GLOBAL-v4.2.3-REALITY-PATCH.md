# Cockpit Global - Fase 2.3: Reality Patch (v4.2.3)

Este parche operacional consolida la resiliencia del portal Superadmin, erradicando filtraciones de objetos técnicos en la UI y estableciendo un contrato estricto de trazabilidad.

## 1. Erradicación de `[object Object]`
Se ha refinado el `normalizeOperationalError` para garantizar que NINGÚN error técnico se renderice como un objeto serializado de forma predeterminada.
- **Causa Raíz Identificada:** Interpolación directa de objetos de error de Supabase/Postgrest en componentes de banner sin pasar por normalización de strings.
- **Solución:** Consumo obligatorio de `message: string` en todos los bloques del Cockpit y subpáginas.

## 2. Contrato Operacional v4.2.3
Se establece un contrato tipado compartido en `src/lib/superadmin/cockpit-data-adapter.ts`:

### Bloques de Datos (`OperationalBlockResult`)
```ts
interface OperationalBlockResult<T> {
  status: "ok" | "empty" | "degraded_config" | "degraded_service";
  data: T;
  message: string;      // Siempre legible
  code: string;         // Código de trazabilidad
  meta: {
    traceId: string;     // Obligatorio
    durationMs: number;
  };
}
```

### Acciones del Servidor (`OperationalActionResult`)
```ts
interface OperationalActionResult<T = undefined> {
  ok: boolean;
  code: "OK" | "UNAUTHORIZED" | "DEGRADED_CONFIG" | "PREVIEW_LOCKED" | "SERVICE_FAILURE";
  message: string;
  data?: T;
  meta?: { traceId: string };
}
```

## 3. Resiliencia por Bloques
El dashboard principal carga ahora cada sección (KPIs, Orgs, Alertas, Métricas) con aislamiento total. Un fallo en el motor de métricas ya no detiene la renderización del directorio de empresas.

## 4. Preview Lock (Settings)
Se ha formalizado el comportamiento de bloqueo en entornos de Preview/Dev:
- **UI:** El botón "Persistir Cambios" se deshabilita con un mensaje explícito: *"Preview Lock: Edición bloqueada en este entorno"*.
- **Acción:** Las acciones sensibles devuelven `PREVIEW_LOCKED` si se invocan fuera de Producción.

## 5. Checklist de Verificación (v4.2.3)
- [ ] /admin (Dashboard) -> Sin [object Object] | **PASS**
- [ ] /admin/orgs -> Sin [object Object] | **PASS**
- [ ] /admin/plans -> Sin [object Object] | **PASS**
- [ ] /admin/subscriptions -> Sin [object Object] | **PASS**
- [ ] /admin/users -> Sin [object Object] | **PASS**
- [ ] /admin/settings -> Preview Lock explícito | **PASS**
- [ ] Recalcular Salud -> Contrato OperationalActionResult | **PASS**
