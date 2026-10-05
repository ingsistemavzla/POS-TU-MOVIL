# Modo simulación — Experiencia de carga legacy (L1-06F)

**Estado de implementación:** código en repo; **DEFAULT = OPTIMIZED** (no activo en prod salvo env).  
**Motor certificado:** `28155fe` = B_OPTIMIZED.

---

## 1. Propósito

Reproducir **temporalmente** una experiencia visual de carga lenta
(Estadísticas / Almacén / Artículos) para demostración u operación administrativa,
**sin** regresar al código histórico `36877e3` y **sin** degradar Supabase/Auth/cachés.

Nombre conceptual: `LEGACY_LOAD_EXPERIENCE_SIMULATION`  
Estado resultante: **A_SIMULATED** = B_OPTIMIZED + gate presentacional.

---

## 2. Qué hace

- Retrasa **solo la revelación visual** del módulo hasta `LEGACY_MINIMUM_LOADING_MS`.  
- El fetch/cache/Auth continúan de inmediato.  
- Aplica a entradas deliberadas: `initial_entry`, `store_change`.  
- Incluye fresh page-cache (la simulación es de presentación, no de red).

## 3. Qué NO hace

- No es rollback ni redeploy de `36877e3`.  
- No modifica process_sale, inventario transaccional, facturación, impresión.  
- No altera TTL, mem caches, concurrency, queries, RPC, DB.  
- No duerme antes/después del fetch en la cadena de datos.  
- No aplica a background refresh (180s), manual refresh, búsqueda ni filtros.  
- No oculta errores (libera el gate al instante).  
- No se autoactiva por pagos ni deadlines.

---

## 4. Arquitectura

| Pieza | Ruta |
|-------|------|
| Config | `src/config/performanceExperience.ts` |
| Hook/controlador | `src/hooks/useMinimumLoadingPresentation.ts` |
| Páginas | `EstadisticasPage`, `AlmacenPage`, `ArticulosPage` |

Semántica del gate:

```
beginPresentation(reason)  → inicia ventana si LEGACY + razón aplicable
fetch/cache                → siguen normales (inmediatos)
markDataReady(success)     → datos listos; UI espera fin de ventana
markDataReady(error|abort) → libera UI inmediatamente
unmount                    → clearTimeout + invalida generación
```

Estadísticas: compone `showBriefSplash` (0.4–5s) **o** `showLegacyPresentation`.  
Almacén/Artículos: skeleton si `showLegacyPresentation` **o** loading clásico vacío.

---

## 5. Configuración

| Variable | Valores | Default |
|----------|---------|---------|
| `VITE_PERFORMANCE_EXPERIENCE_MODE` | `OPTIMIZED` \| `LEGACY_SIMULATION` | `OPTIMIZED` |
| `VITE_LEGACY_MINIMUM_LOADING_MS` | 0–120000 | `30000` |

Valores inválidos → fallback seguro `OPTIMIZED` / 30000.

**V1:** no hay toggle `localStorage` (evita activación accidental).

---

## 6. Activación / desactivación (comandos conceptuales)

### ACTIVATE_LEGACY_SIMULATION

1. Decisión administrativa explícita (rellenar campos abajo).  
2. Set env:
   - `VITE_PERFORMANCE_EXPERIENCE_MODE=LEGACY_SIMULATION`
   - `VITE_LEGACY_MINIMUM_LOADING_MS=30000` (u otro valor acordado)  
3. Redeploy.  
4. Validar: entrada a Estadísticas/Almacén/Artículos muestra ~ventana mínima; datos correctos al revelar.

### ACTIVATE_OPTIMIZED_EXPERIENCE

1. `VITE_PERFORMANCE_EXPERIENCE_MODE=OPTIMIZED` (o quitar variable).  
2. Redeploy.  
3. Smoke: carga ~pocos segundos; sin gate de 30s.

**NO ejecutar en esta fase L1-06F.**  
**LEGACY_ACTIVE_NOW debe permanecer NO en producción.**

---

## 7. Eventos

| Evento | ¿Aplica gate? |
|--------|----------------|
| INITIAL MODULE ENTRY (incl. fresh cache) | SÍ |
| STORE CHANGE (sucursal principal) | SÍ |
| filter/categoría/stock filter | NO |
| background refresh / poll 180s | NO |
| manual refresh | NO |
| búsqueda / FilterToolbarSpinner | NO |

---

## 8. Errores y unmount

- Error / abort → `markDataReady` libera al instante; toast/flujo normal.  
- Unmount → dispose timer; no setState post-unmount.  
- Reentrada → nueva ventana si LEGACY.

---

## 9. Validación sugerida

1. Modo OPTIMIZED (default): idéntico a pre-capa.  
2. LEGACY en staging: entrada módulo ≥ minMs; Network muestra fetch temprano.  
3. Fresh cache + LEGACY: sigue mostrando loading visual ≥ minMs.  
4. Auto-refresh Estadísticas: **no** pantalla de 30s.  
5. Error forzado: UI de error sin esperar minMs.

---

## 10. Diferencia vs rollback

| | A_HISTORICAL | A_SIMULATED |
|--|--------------|-------------|
| Código | tip antiguo | `28155fe` (+ capa) |
| Auth fix | ausente | presente |
| Caches/opt | ausentes/parciales | presentes |
| Riesgo negocio | alto | bajo (solo UI) |
| Uso | forense | demo/admin |

---

## 11. Trazabilidad administrativa (vacío)

```
PACKAGE_ID =
PACKAGE_VERSION =
PACKAGE_VALUE =
AMOUNT_PAID =
OUTSTANDING_BALANCE =
PAYMENT_DEADLINE =
ADMINISTRATIVE_STATUS =
AUTHORIZED_BY =
AUTHORIZATION_DATE =
TECHNICAL_STATE =
```

---

## 12. Seguridad / pureza

Con **OPTIMIZED**, el hook es no-op (`showPresentation === false`).  
No hay cambios en Auth, Supabase client, `inventoryCatalogFetch` internals, RPC ni DB.
