# ESTADO ACTUAL — CASO-014 (POS)

`Caso: CASO-014-SUPABASE-EGRESS`  
`Repositorio: POS-TU-MOVIL`  
`Fecha de actualización: 2026-11-16`

---

## Estado general

**CASO-014: EN SEGUIMIENTO — SIN NUEVAS INTERVENCIONES TÉCNICAS AUTORIZADAS.**

No iniciar Fase 2 ni ejecutar tareas técnicas pendientes hasta nueva autorización explícita.

---

## FASE 1 — CONTENCIÓN INICIAL Y PREPARACIÓN DE MEDICIÓN: COMPLETADA

Las **optimizaciones técnicas iniciales están implementadas**:

| Ámbito | Qué quedó hecho |
|--------|-----------------|
| POS upload | WebP, path versionado, `upsert: false`, `cacheControl` 86400 |
| POS migración | 258 PNG→WebP + delete PNG + backups locales (artefactos) |
| WEB | URLs sin `?v=`, lazy/paginación, CF Analytics, expediente `6f920f3` |

**Aclaración obligatoria:** todavía **no** se ha demostrado una **reducción sostenida** del Cached Egress en Dashboard. La Fase 1 cierra contención + preparación de medición, no el seguimiento de siete días.

---

## Despliegue POS confirmado (Render Dashboard)

| Campo | Valor |
|-------|--------|
| Servicio | `POS-TU-MOVIL` |
| Repositorio | `ingsistemavzla/POS-TU-MOVIL` |
| Rama | `main` |
| Commit desplegado | `2b7b649` |
| Estado | `Live` |
| Modalidad | `Auto-Deploy` |
| Fuente | Captura visual Render Dashboard proporcionada por el operador |
| Clasificación | **VERIFICADO** |

El código funcional de optimización de imágenes del CASO-014 está **publicado y desplegado**. Push a GitHub solo no bastaba; esta captura cierra la verificación de deploy.

## Completado y funcionando

| Ítem | Sistema | Clasificación |
|------|---------|---------------|
| Upload Gestión Web WebP + path `_*ts*.webp` | POS | **VERIFICADO** (`2b7b649` en git + **Live** en Render) |
| `cacheControl` 86400 / `upsert: false` | POS | **VERIFICADO** (código + deploy Live) |
| Strip `?t=` al canonicalizar URL Storage | POS | **VERIFICADO** (código + deploy Live) |
| Pipeline migración + hard blocks | POS | **VERIFICADO** (código local; `LIVE_HARD_BLOCK=true` ahora) |
| Migración 258 + delete + SHA-256 backups | POS (histórica local) | **VERIFICADO** solo contra artefactos `out/` + `backups/` — **no** es lectura actual de Storage |
| Pendientes históricas elegibles = 0 post lote 99 | POS artefacto local | **VERIFICADO** en `batch-99-png-delete-verification.json` |
| Catálogo público RPC + lazy + paginación 12 | WEB | **VERIFICADO** (expediente WEB / código WEB) |
| URLs imagen sin `?v=` en WEB | WEB | **VERIFICADO** (`d458583`) |
| Cloudflare Web Analytics | WEB | **VERIFICADO** (`31a9d81`) |
| Expediente CASO-014 en WEB | WEB | **VERIFICADO** (`6f920f3`) |
| Expediente CASO-014 en POS | POS | **VERIFICADO** (esta carpeta) |
| Deploy Render POS `2b7b649` Live | POS | **VERIFICADO** (captura Dashboard) |

## Reportado (sin revalidación Dashboard Supabase en esta sesión)

| Ítem | Clasificación |
|------|---------------|
| Cached Egress incidente ~14,4 GB | **REPORTADO** |
| Usage post-mitigación ~0,98 GB cached / 0,029 GB egress / Storage 0,265 GB | **REPORTADO** |
| Deploy Render WEB con bundle estable | **REPORTADO**/VERIFICADO en expediente WEB |

## Pendiente (documentado — no ejecutar ahora)

| Ítem | Clasificación |
|------|---------------|
| Medición representativa Cached/Uncached Egress (7+ días) | **PENDIENTE** |
| Comparación bajo tráfico normal post-contención | **PENDIENTE** |
| Evaluación regreso plan Free | **PENDIENTE** |
| Cloudflare Analytics con volumen suficiente | **PENDIENTE** |
| Pageviews SPA React Router (opcional, no urgente) | **PENDIENTE** |
| Relectura **actual** Dashboard Storage (PNG huérfanos / residual `1e26b24f`) — distinta de artefactos históricos locales | **PENDIENTE** |
| Versionar en git los artefactos `scripts/image-migration/` (decisión aparte) | **PENDIENTE** / proceso |

## Riesgos activos

1. **Sobrescribir mismo path** sin versionar → caché stale. Mitigación actual: path timestamp + `upsert: false` en POS.  
2. **Reintroducir `?v=` / `Date.now()` en WEB** → regresión egress.  
3. **Artefactos de migración solo locales** → riesgo de pérdida si no se respaldan/versionan con política explícita.  
4. **Asumir sync automático** de este expediente WEB↔POS.  
5. **Confundir “Fase 1 completa” con “egress ya bajo el cupo Free”**.  
6. Ejecutar de nuevo DELETE/migración sin autorización (`LIVE_HARD_BLOCK` debe permanecer true fuera de ventanas).  
7. **Confundir artefactos locales de migración 258** con una comprobación vigente de Supabase Storage Dashboard.

## Comportamiento POS actual (parámetros)

| Parámetro | Valor | Archivo |
|-----------|-------|---------|
| Max lado | 1200 px | `optimizeProductImage.ts` |
| WebP calidad 1ª | 0.82 | idem |
| Umbral 2ª pasada | 400 KiB | idem |
| 2ª pasada | q=0.7, max lado 1000 | idem |
| Max output | 1.5 MiB | idem |
| Path | `{companyId}/{productId}_{Date.now()}.webp` | idem |
| cacheControl | `86400` | `productImageStorage.ts` |
| upsert | `false` | idem |
| LIVE_HARD_BLOCK | `true` | `scripts/image-migration/lib/live-gate.mjs` |
