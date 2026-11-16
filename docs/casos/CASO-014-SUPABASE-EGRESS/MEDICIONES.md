# MEDICIONES — CASO-014 (POS)

`Caso: CASO-014-SUPABASE-EGRESS`  
`Repositorio: POS-TU-MOVIL`  
`Fecha de actualización: 2026-11-16`

Separar siempre: **real (código/artefacto)** | **reportado (Dashboard/relato)** | **estimación/proyección**.

---

## 1. Parámetros reales verificados en código POS

| Métrica | Valor | Unidad | Procedencia | Tipo |
|---------|-------|--------|-------------|------|
| Max lado imagen | 1200 | px | `PRODUCT_IMAGE_MAX_SIDE` | Real (código) |
| Calidad WebP 1ª | 0.82 | ratio | `PRODUCT_IMAGE_WEBP_QUALITY` | Real (código) |
| Umbral 2ª pasada | 400 | KiB | `PRODUCT_IMAGE_ADAPTIVE_THRESHOLD_BYTES` | Real (código) |
| Calidad 2ª | 0.7 | ratio | `PRODUCT_IMAGE_SECOND_PASS_QUALITY` | Real (código) |
| Max lado 2ª | 1000 | px | `PRODUCT_IMAGE_SECOND_PASS_MAX_SIDE` | Real (código) |
| Max output | 1.5 | MiB | `PRODUCT_IMAGE_MAX_OUTPUT_BYTES` | Real (código) |
| cacheControl Storage | 86400 | s | `PRODUCT_IMAGE_CACHE_CONTROL` | Real (código) |
| upsert upload | false | bool | `productImageStorage.ts` | Real (código) |

## 2. Parámetros reales verificados en código WEB (referencia cruzada)

| Métrica | Valor | Procedencia | Tipo |
|---------|-------|-------------|------|
| Paginación catálogo | 12 | `ITEMS_PER_PAGE` | Real (código WEB) |
| Eager above-fold | 6 | `ABOVE_THE_FOLD_IMAGE_COUNT` | Real (código WEB) |
| URL imagen | canónica sin `?v=` | `productImageUrl.ts` post-`d458583` | Real (código WEB) |

---

## 3. Resultados de migración — artefactos históricos locales POS (VERIFICADO)

Fuente: JSON en `scripts/image-migration/out/` y `backups/` inspeccionados 2026-11-16 (Fase 1 documental).  
**No** están necesariamente en git remoto.  
**Son evidencia histórica del día de ejecución.** No sustituyen una comprobación **actual** de Supabase Storage Dashboard.

| Lote | url_updated | PNG deleted | originalBytes (report) | optimizedBytes (report) | reducción % | PNG liberados MiB (delete verify) |
|------|-------------|-------------|------------------------|-------------------------|-------------|-----------------------------------|
| Piloto | 5 | 5 | (ver manifiestos piloto) | (ver manifiestos) | — | 5.862 |
| 01 | 40 | 40 | 51 063 930 | 2 516 696 | 95.07 | 48.698 |
| 02 | 40 | 40 | 51 711 905 | 2 632 152 | 94.91 | 49.316 |
| 03 | 40 | 40 | 52 882 702 | 2 662 824 | 94.96 | 50.433 |
| 04 | 40 | 40 | 52 032 967 | 2 579 288 | 95.04 | 49.623 |
| 05 | 40 | 40 | 52 584 436 | 2 613 008 | 95.03 | 50.148 |
| 99 | 53 | 53 | 64 309 728 | 3 335 882 | 94.81 | 61.331 |
| **Σ** | **258** | **258** | **~324,6 MiB** (lotes 01–05+99 originals) + piloto | **~15,6 MiB** WebP (01–05+99) | ~95% | **~315,4 MiB** PNG borrados (suma delete) |

Notas:
- `batch-99` registration: `cumulativeMigrated: 258`, `remainingHistoricalEligible: 0`.  
- Backups: 5+40×5+53 = 258 PNG locales con `sha256_verified` por manifiesto de backup.  
- Integridad comercial: ver HISTORIAL (lote 01 con drifts de stock documentados).

**Nivel:** verificar que el script **fue ejecutado** y produjo estos archivos = **VERIFICADO** (histórico local).  
**No** verificar en esta sesión que Dashboard Storage refleja exactamente el mismo conteo = **PENDIENTE** (comprobación actual Storage).

---

## 3b. Despliegue código imagen POS (VERIFICADO)

| Campo | Valor | Tipo |
|-------|--------|------|
| Commit funcional | `2b7b649` | Real (git) |
| Servicio Render | `POS-TU-MOVIL` | **VERIFICADO** (captura Dashboard) |
| Rama / estado | `main` / `Live` | **VERIFICADO** |
| Modalidad | Auto-Deploy | **VERIFICADO** |

---

## 4. Cifras de Usage Supabase (REPORTADO)

| Métrica | Valor | Tipo |
|---------|-------|------|
| Cached Egress incidente | ~14,4 GB | **REPORTADO** |
| Egress (uncached) citado con incidente | ~2,075 GB | **REPORTADO** |
| Post-migración (ciclo citado): Cached ~0,98 GB; Egress ~0,029 GB; Storage ~0,265 GB | Relato operativo 16-nov | **REPORTADO** |

Cómo confirmar: Supabase Dashboard → Reports/Usage; capturar fecha y ventana.

---

## 5. Estimaciones / proyecciones (no fact)

| Idea | Tipo |
|------|------|
| WebP ~50–70 KiB vs PNG ~1,2 MiB → ~20× menos bytes/HIT | Estimación cualitativa alineada a artefactos de lote |
| URLs estables WEB → más HIT CDN, menos MISS por `?v=` | Proyección cualitativa |
| Lazy + 12/página → menos requests en primera vista | Estimación (viewport-dependent) |

---

## 6. Qué medir en adelante (sin ejecutar ahora)

### Supabase
- Cached Egress diario/semanal.  
- Uncached Egress.  
- Storage size bucket `product-images`.  
- API/RPC volume (contexto).

### Cloudflare Analytics (WEB)
- Visitas / pageviews (limitación SPA).  

### Condiciones de comparación
- Misma ventana de fechas.  
- Anotar deploys WEB (`d458583`, `31a9d81`, `6f920f3`, …).  
- Anotar deploy POS `2b7b649` Live (Render `POS-TU-MOVIL`).  
- Anotar que 16-nov incluye tráfico de migración (downloads/uploads/verifies).  
- No mezclar “egress total proyecto” con solo imágenes sin filtro.  
- No tratar artefactos locales 258 como snapshot Storage actual.

---

## 7. Huecos

- Dashboard **Supabase** Usage/Storage no leído en esta sesión documental (Render sí confirmado visualmente para `2b7b649`).  
- Artefactos migración **untracked** en git POS.  
- Sin telemetría “imágenes vistas” en WEB.  
- Residual PNG/`?t=` puntual no re-auditado aquí.
