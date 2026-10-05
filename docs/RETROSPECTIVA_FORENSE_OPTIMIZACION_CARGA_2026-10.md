# Retrospectiva forense — Optimización de carga POS TU MÓVIL (2026-10)

**Tipo:** evidencia técnica bidireccional (NO especificación de implementación)  
**Alcance:** Estadísticas / Almacén / Artículos — campaña L1-04 → Auth fix → cleanup  
**HEAD certificado documentado:** `28155fe8d1fbd4b2b3d5ce059b339dc4d6afd752`  
**Baseline pre-campaña:** `36877e312a9c23f4f22942027de7802e69f48e3f`

---

## 0. Cómo leer este documento

### Hacia adelante (problema → solución)

Síntoma multi-sucursal lento → mitigaciones cache/concurrency → instrumentación →
separación pre-fetch vs HTTP → hallazgo Auth lock → fix defer → cleanup diag → QA.

### Hacia atrás (estado actual → origen)

`28155fe` (sin diag) ← `a0bb074` (Auth defer) ← evidencia G.6/J ←
instrumentación G ← mitigaciones L1-04/A/B/H ← síntoma 15–38 s ← baseline `36877e3`.

### Glosario

| Término | Significado |
|---------|-------------|
| **CAUSA** | Mecanismo que produce el síntoma (evidencia causal) |
| **SÍNTOMA** | Observación de UX/tiempo |
| **MITIGACIÓN** | Acelera o enmascara sin eliminar la causa residual |
| **INSTRUMENTACIÓN** | Solo observabilidad (retirada en `28155fe`) |
| **FIX FUNCIONAL** | Cambia comportamiento correcto del runtime |

---

## 1. Resumen ejecutivo

| | |
|--|--|
| **A_HISTORICAL** | `36877e3` — multi-sucursal presente; sin serie L1-04…Auth |
| **B_OPTIMIZED** | `28155fe` — caches + concurrency + H + Auth defer; diag retirada |
| **Cold limpio post-mitigaciones** | ~2–4 s (N≈875, 6 chunks, conc. 3) |
| **Degradación sesión larga** | ~14–38 s observados (no explicados solo por chunks) |
| **Causa residual certificada** | Trabajo async bajo `navigator.lock` de Auth (callbacks / getSession / profile) |
| **Fix causal** | `a0bb074` — defer `setTimeout(0)`, epoch, `applyEffects:false` |
| **C.1** | WIP local `83fd477` — **no** en producción |

Las capas L1-04/A/B/H son **mitigaciones/aceleradores**. No sustituyen el hallazgo Auth.

---

## 2. Cadena hacia adelante (fases)

### Baseline — `36877e3`

- **Estado:** estadísticas multi-sucursal / catálogo aislado por tienda ya en producto.
- **Síntoma posterior:** cargas de módulo percibidas ~20–30+ s en frío/sesión.
- **Estado del cambio:** BASELINE_EVIDENCIA.

### `27497c2` — estabilizar cargas + cache por sucursal

- **Tipo:** MITIGACIÓN / FUNCTIONAL_OPTIMIZATION  
- **Qué:** page cache dual-slot + `inventoryCatalogFetch` estabilizado.  
- **Estado:** ACTIVO en `28155fe`.

### L1-04 — `a759585` paralelizar chunks

- **Tipo:** MITIGACIÓN  
- **Qué:** `PRODUCT_ID_CHUNK=150`, concurrency 3/sweep.  
- **Esperado:** cold más corto.  
- **Real:** base ~2–4 s en cold limpio; no elimina 15–38 s.  
- **Estado:** ACTIVO.

### L1-05A — `abcee3a` mem multi-key TTL 3m

- **Tipo:** MITIGACIÓN  
- **Qué:** `inventoryMem` Map + LRU; productsMem TTL 3m.  
- **Estado:** ACTIVO.

### L1-05B — `75cb685` page cache fresh skip

- **Tipo:** MITIGACIÓN  
- **Qué:** fresh ~5m (inv) / ~8m (stats); stale SWR; miss loader.  
- **Síntoma residual:** tras TTL, cold vuelve; F5 puede parecer rápido por sessionStorage.  
- **Estado:** ACTIVO.

### L1-05C / C.1 — invalidación granular

- **Tipo:** WIP_NOT_DEPLOYED (`83fd477` en `wip/l1-05c1-selective-invalidation`)  
- **Qué:** invalidar mem/page cache por sucursal post-venta.  
- **Estado:** LOCAL ONLY.

### L1-05D/F — evidencia

- Hard refresh ≠ cold servidor si page cache fresh.  
- N≈875 → 6 chunks **no** explican 15–38 s.  
- Hipótesis amplificación: abort/solape / deuda sesión / cola Auth.

### L1-05G…G.6 — instrumentación (retirada)

| Commit | Rol |
|--------|-----|
| `8257cc5` | ciclo INV_LOAD_DIAG |
| `a2f0522` | DURATION_MS |
| `ee33079` | STORES_* Estadísticas |
| `161a24e` | FETCH_ENTER/RESPONSE (custom fetch) |

- **Evidencia clave G.6:** gap pre-fetch (stores ~11.6 s / products ~6.5 s) ≫ HTTP (~2 s / ~0.77 s).  
- **Estado:** DIAGNÓSTICO RETIRADO (`28155fe`).

### H — `29eb469` resolveCatalogStores

- **Tipo:** MITIGACIÓN / FUNCTIONAL_OPTIMIZATION  
- **Qué:** reutilizar StoreContext; menos query `stores` redundante.  
- **Estado:** ACTIVO.

### J / J.3 — instrumentación Auth (retirada)

| Commit | Rol |
|--------|-----|
| `4470e13` | authLoadDiagnostics |
| `890caaf` | `__POS_SUPABASE_DIAG__` |

- **Estado:** DIAGNÓSTICO RETIRADO.

### Auth fix — `a0bb074`

- **Tipo:** FIX FUNCIONAL  
- **Qué:** callback sync; `scheduleAuthDeferredWork` (`setTimeout(0)`); epoch; `applyEffects:false`; loading ownership.  
- **Esperado:** liberar `navigator.lock` antes de PostgREST.  
- **Real (QA prod):** SPA estable ~minutos; módulos ~pocos segundos; sin stalls 8–38 s.  
- **Estado:** ACTIVO.

### Cleanup — `28155fe`

- **Tipo:** CLEANUP  
- **Qué:** retira G/J/J.3; preserva Auth defer y H.  
- **Estado:** ACTIVO (tip certificado).

### Unrelated (NO son “paquete perf”)

| Commit | Rol | Rollback |
|--------|-----|----------|
| `61707f2` | PRINT_FIX | NO revertir con paquete opt |
| `6ced0e7` | UI modal producto | NO revertir con paquete opt |

---

## 3. Cadena hacia atrás

1. **Hoy:** `28155fe` — UX rápida certificada, sin diag.  
2. **Sostiene la UX residual:** `a0bb074` (Auth).  
3. **Evidencia que lo justificó:** G.6 pre-fetch ≫ HTTP + prueba lock + J.  
4. **Mitigaciones previas:** H, L1-05B/A, L1-04, `27497c2`.  
5. **Síntoma original:** 15–38 s / 20–30+ s percibidos.  
6. **Baseline:** `36877e3`.

---

## 4. Tabla ANTES | DURANTE | DESPUÉS

| Dimensión | ANTES (`36877e3`→pre L1-04) | DURANTE (opt+diag) | DESPUÉS (`28155fe`) |
|-----------|----------------------------|--------------------|---------------------|
| Cold limpio | lento percibido | ~2–4 s con N≈875 | ~pocos s |
| Sesión larga | 14–38 s | instrumentado | estable post-Auth |
| Diag | no | G/J activos | retirada |
| Auth under lock | bloqueante | medido | deferido |
| C.1 | no | local | WIP no publicado |

---

## 5. HIPÓTESIS | EVIDENCIA | VEREDICTO

| Hipótesis | Evidencia | Veredicto |
|-----------|-----------|-----------|
| Supabase/Postgres inherentemente lento | HTTP inventories cientos de ms; G.6 HTTP ≪ await | DESCARTADA como causa 15–38s |
| Demasiados productos (~875) | 6 chunks → cold ~2–4 s | DESCARTADA como causa 15–38s |
| Chunking/concurrency insuficientes | L1-04 mejora cold; stalls persisten | MITIGACIÓN, no causa residual |
| Solo TTL | TTL dispara cold; no crea 30s solos | PARCIAL (trigger, no amplitud) |
| Cache invalidation wipe | C.1 corrige granularidad; no explica Auth gap | WIP / ortogonal |
| Query stores lenta | H reduce; G.6 pre-fetch stores grande | PARCIAL + síntoma de cola |
| Session aging genérico | correlación sesión larga | DÉBIL sin traza |
| **Auth/session lock** | G.6 gaps; auth-js lock; Fix A QA | **CONFIRMADA (residual)** |

---

## 6. Mediciones de referencia (documentadas)

- Page cache fresh: ~5 min (Almacén/Artículos), ~8 min (Estadísticas)  
- Mem catalog TTL: ~3 min  
- N≈875 productos; chunk 150; conc. 3  
- Stalls reportados: ~14 / 18 / 28 / 38 s  
- Post-opt cold limpio: ~3 s en recorridos QA  
- G.6 (sesión diag): stores pre-fetch ~11.6 s + HTTP ~2 s; products ~6.5 s + ~0.77 s  

---

## 7. Fuentes

- `docs/ESTADO_OPTIMIZACION_CARGA_Y_CONTINUIDAD.md` (congelado ~6ced0e7; pre-G.6/Auth)  
- Git: `36877e3`…`28155fe`  
- Tests Auth defer / resolveCatalogStores  
- QA productivo post-`a0bb074` / post-`28155fe`

---

## 8. Estado de cambios (checklist)

| Cambio | Estado |
|--------|--------|
| L1-04 / A / B / H | ACTIVO |
| Auth `a0bb074` | ACTIVO |
| Diag G/J/J.3 | RETIRADO |
| Print / modal producto | ACTIVO (unrelated) |
| C.1 | WIP NO PUBLICADO |
