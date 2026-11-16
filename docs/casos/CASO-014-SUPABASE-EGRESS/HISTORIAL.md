# HISTORIAL — CASO-014 (POS)

`Caso: CASO-014-SUPABASE-EGRESS`  
`Repositorio: POS-TU-MOVIL`  
`Fecha de actualización: 2026-11-16`  
`Referencia WEB alineada: commit 6f920f3`

Cronología técnica. Distinguir: existencia de script ≠ ejecución ≠ resultado vigente en producción.

---

## Fase 0 — Contexto del incidente (REPORTADO)

| Elemento | Valor | Clasificación |
|----------|-------|---------------|
| Cached Egress citado (período anterior) | ~14,4 GB | **REPORTADO** |
| Uncached / Egress citado (mismo relato) | ~2,075 GB | **REPORTADO** |
| Hipótesis principales | PNG ~1–1,4 MiB/objeto; CDN HIT costoso; URLs con query (`?t=` histórico / `?v=updated_at` en WEB); catálogo público sirviendo full-size | Mixto: código **VERIFICADO**; magnitud GB **REPORTADA** |

---

## Fase A — WEB: cache-bust (contexto cruzado)

| Fecha | Acción | Evidencia | Clasificación |
|-------|--------|-----------|---------------|
| 2026-02-20 | WEB `9c83a41` — `getProductImageUrl` añade `?v=` desde `updated_at` | git WEB | **VERIFICADO** (en expediente WEB) |
| 2026-11-16 | WEB `d458583` — URLs estables sin `?v=` | git WEB HEAD incluye commit | **VERIFICADO** |

**Efecto:** `updated_at` del RPC público es `GREATEST(products.updated_at, wpm.updated_at)` → cambios de precio/metadata invalidaban clave CDN aunque el path Storage no cambiara.  
**Atribución:** intervención WEB; no es código POS.

---

## Fase B — POS: optimización de upload (Gestión Web)

| Fecha | Acción | Evidencia | Clasificación |
|-------|--------|-----------|---------------|
| 2026-11-16 08:24 -0400 | Commit `2b7b649` — `optimizeProductImage` + `productImageStorage` + doc R2 | `git log` POS | **VERIFICADO** |
| 2026-11-16 | Push `2b7b649` → `origin/main` (~09:20 -0400) | `git reflog origin/main` | **VERIFICADO** (push ≠ deploy) |
| 2026-11-16 | Deploy Render **Live** del commit `2b7b649` | Captura visual Render Dashboard (operador): servicio `POS-TU-MOVIL`, repo `ingsistemavzla/POS-TU-MOVIL`, rama `main`, Auto-Deploy | **VERIFICADO** |
| — | Max lado 1200 px; WebP q=0.82; 2ª pasada q=0.7 / lado 1000; umbral 400 KiB; max out 1.5 MiB | `optimizeProductImage.ts` | **VERIFICADO** |
| — | Path `{companyId}/{productId}_{Date.now()}.webp` | `buildVersionedProductImagePath` | **VERIFICADO** |
| — | Upload `cacheControl: '86400'`, `upsert: false` | `productImageStorage.ts` | **VERIFICADO** |
| — | Canonicalización: strip `?t=` solo en URLs Storage públicas | `toCanonicalProductImageUrl` | **VERIFICADO** |
| — | R2 / CDN externo | `docs/PREPARACION_CLOUDFLARE_R2_IMAGENES.md` | **VERIFICADO** (solo documentación; no implementado) |

---

## Fase C — POS: migración histórica PNG→WebP (2026-11-16)

Herramienta: `scripts/image-migration/` (árbol **local untracked** en git status POS; **no** versionado en el commit `2b7b649`).

### C.1 Política de ejecución (código)

| Control | Valor actual | Clasificación |
|---------|--------------|---------------|
| `LIVE_HARD_BLOCK` | `true` en `lib/live-gate.mjs` (restaurado tras ventanas autorizadas) | **VERIFICADO** |
| DELETE PNG | Requiere `ALLOW_DELETE_ORIGINAL_PNGS=YES` + hard block off | **VERIFICADO** (código) |
| RPC URL | `update_web_product_image_url` con JWT admin + anon (no service_role como ACCESS_TOKEN) | **VERIFICADO** (README + SQL) |
| Storage write/delete | service_role local en `.env` (gitignored) | **VERIFICADO** (existencia de flujo; secretos no documentados aquí) |

### C.2 Operaciones ejecutadas (artefactos locales)

Suma de verificaciones post-delete inspeccionadas: **258 migradas / 258 PNG eliminados**.

| Lote | Migradas | PNG eliminados | Bytes PNG liberados (MiB) | Reducción reportada lote | Estado verificación | Backup local PNG + SHA-256 |
|------|----------|----------------|---------------------------|--------------------------|---------------------|----------------------------|
| Piloto | 5 | 5 | 5.862 | — | SUCCESS | `backups/pilot-png-2026-11-16` (5/5 sha) |
| 01 | 40 | 40 | 48.698 | ~95.07% (report) | SUCCESS | `batch-01-png-2026-11-16` (40/40) |
| 02 | 40 | 40 | 49.316 | 94.91% | SUCCESS | `batch-02-png-2026-11-16` (40/40) |
| 03 | 40 | 40 | 50.433 | 94.96% | SUCCESS | `batch-03-png-2026-11-16` (40/40) |
| 04 | 40 | 40 | 49.623 | 95.04% | SUCCESS | `batch-04-png-2026-11-16` (40/40) |
| 05 | 40 | 40 | 50.148 | 95.03% | SUCCESS | `batch-05-png-2026-11-16` (40/40) |
| 99 (final unificado) | 53 | 53 | 61.331 | 94.81% | SUCCESS; `remainingHistoricalEligible: 0` | `batch-99-png-2026-11-16` (53/53) |
| **Total** | **258** | **258** | **~315.4 MiB** PNG eliminados (suma bytesDeleted) | ~95% por lote típico | — | 7 carpetas backup |

**Clasificación de la migración 258:** **VERIFICADO** contra artefactos **históricos locales** (día de ejecución):

- `out/pilot-png-delete-verification.json`
- `out/batches/batch-0{1-5}-report.json` + `*-png-delete-verification.json`
- `out/batches/batch-99-report.json` + `batch-99-png-delete-verification.json` (`cumulativeMigrated: 258`)
- `backups/*/BACKUP_MANIFEST.json` (SHA-256 verificados)

**Distinción obligatoria:** evidencia histórica local ≠ comprobación **actual** de Supabase Storage Dashboard.  
**No equivale a:** “revalidado hoy en Dashboard Storage de producción” → eso sigue **PENDIENTE** si se exige lectura Dashboard en sesión futura.

### C.3 Procedimiento por imagen (diseño ejecutado)

1. Download PNG  
2. Optimize → WebP  
3. Upload path versionado (`upsert: false`)  
4. Verify HTTP WebP  
5. RPC `update_web_product_image_url` (CAS; strip `?t=` en Storage)  
6. Manifiesto / report  
7. Backup local PNG + SHA-256  
8. DELETE PNG solo si WebP OK, sin refs activas, deleteReady  
9. Post-verify: Storage list/HEAD (evitar falso positivo de Range GET) + integridad comercial  
10. Restaurar `LIVE_HARD_BLOCK=true`

### C.4 Notas de integridad comercial

- Lotes 02–05 y 99: commercial 40/40 o 53/53 en verificaciones citadas.  
- Lote 01: post-delete commercial “all” 38/40 con stock drift documentado en verificación (no atribuido a cambio de precio/categoría/visibilidad por migración).  
- Batch report 01: `commercialIntact: 39` en un recheck intermedio — **discrepancia interna de artefactos**; conservar ambas cifras.

### C.5 Residuales

| Ítem | Clasificación |
|------|---------------|
| 1 metadata con PNG + `?t=` y archivo ausente (`1e26b24f-…`) observado en diagnóstico | **REPORTADO** en sesión diagnóstico (no reconsultado en esta Fase 1 documental) |
| Orphans Storage históricos (p. ej. listados en migrate stats) | **PENDIENTE** limpieza; fuera del alcance 258 |

---

## Fase D — Diagnóstico egress / auditoría WEB (misma jornada operativa)

| Acción | Repo | Clasificación |
|--------|------|---------------|
| Diagnóstico Cached Egress (POS chat) — sin polling de imágenes en POS | POS docs/sesión | **REPORTADO** / análisis |
| Auditoría catálogo público `tu-movil-web` — `?v=updated_at` | WEB código | **VERIFICADO** (corregido en `d458583`) |
| GET público WebP: `cache-control: public, max-age=86400`, `cf-cache-status: HIT` | Sesión diagnóstico | **REPORTADO** (medición puntual; no repetida aquí) |

---

## Fase E — Cierre documental WEB

| Commit WEB | Mensaje | Clasificación |
|------------|---------|---------------|
| `d458583` | fix: URLs estables sin cache-bust | **VERIFICADO** (en árbol WEB local) |
| `13e1909` | docs + etiqueta BCV | **VERIFICADO** |
| `31a9d81` | Cloudflare Web Analytics | **VERIFICADO** |
| `6f920f3` | docs: cerrar Fase 1 documental CASO-014 | **VERIFICADO** (HEAD WEB local contiene ancestro) |

---

## Fase F — Confirmación de despliegue POS (Render)

| Fecha | Acción | Evidencia | Clasificación |
|-------|--------|-----------|---------------|
| 2026-11-16 | Verificación READ-ONLY local: `build-id` prod ≠ SHA Git; deploy **no** confirmable solo desde repo | Comprobación previa POS | Indicio temporal; insuficiente |
| 2026-11-16 | Confirmación visual Render: `2b7b649` **Live** | Dashboard servicio `POS-TU-MOVIL`, Auto-Deploy `main` | **VERIFICADO** |

---

## Clasificación por sistema

### POS — VERIFICADO
- Código upload WebP + versionado + `upsert: false` + `cacheControl` 86400 (`2b7b649`).  
- **Deploy Live** de `2b7b649` en Render (servicio `POS-TU-MOVIL`, captura Dashboard).  
- Pipeline y runners de migración (código local).  
- Ejecución histórica 258 PNG→WebP + delete + backups SHA-256 (artefactos `out/` + `backups/` — no relectura Storage actual).  
- `LIVE_HARD_BLOCK=true` restaurado en código actual.

### WEB — VERIFICADO (vía repo WEB, no modificado en esta tarea)
- URLs estables, lazy/paginación, analytics, expediente `6f920f3`.

### Supabase Dashboard Usage / Storage actual
- Usage (14,4 GB / Free plan): **REPORTADO** / **PENDIENTE** de captura formal en `MEDICIONES.md`.  
- Conteos Storage actuales vs 258: **PENDIENTE** (distinto de artefactos históricos locales).

---

## Commit POS clave (funcional) + deploy

```
2b7b649  feat(gestion-web): optimize product images and isolate storage  (2026-11-16)
         → Live en Render servicio POS-TU-MOVIL (Auto-Deploy main) — VERIFICADO por captura Dashboard
```

## Artefactos de migración (paths relativos a `scripts/image-migration/`)

```
out/pilot-png-delete-verification.json
out/batches/batch-01 … batch-05 … batch-99  (-report, -manifest, -png-delete-*)
backups/pilot-png-2026-11-16/
backups/batch-0{1-5}-png-2026-11-16/
backups/batch-99-png-2026-11-16/
```
