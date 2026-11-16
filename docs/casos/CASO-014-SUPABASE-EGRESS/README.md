# CASO-014 — Cached Egress Supabase (POS + WEB)

`Caso: CASO-014-SUPABASE-EGRESS`  
`Repositorio de origen de este expediente: POS-TU-MOVIL`  
`Fecha de actualización: 2026-11-16`  
`Alineado con cierre documental WEB: commit 6f920f3`  
`Deploy POS confirmado: commit 2b7b649 Live en Render (captura visual Dashboard)`

---

## Identidad

| Campo | Valor |
|-------|--------|
| **ID** | `CASO-014-SUPABASE-EGRESS` |
| **Título** | Incidente y mitigación de Cached Egress en Supabase Storage / catálogo web |
| **Repos** | POS (`POS-TU-MOVIL`) + WEB (`tu-movil-web`) + Supabase compartido |
| **Supabase project_id / ref** | `swsqmsbyikznalrvydny` |
| **Bucket** | `product-images` (público) |
| **Estado del expediente** | **EN SEGUIMIENTO — SIN NUEVAS INTERVENCIONES TÉCNICAS AUTORIZADAS** |
| **Fase 1** | **CONTENCIÓN INICIAL Y PREPARACIÓN DE MEDICIÓN: COMPLETADA** |
| **Deploy código imagen POS** | **VERIFICADO** — `2b7b649` Live en Render (servicio `POS-TU-MOVIL`, Auto-Deploy `main`) |

## Problema (resumen)

Consumo elevado de **Cached Egress** en Supabase, asociado al bucket público de imágenes del catálogo y a patrones que reducían la eficacia de la caché CDN o multiplicaban bytes por solicitud.

| Cifra | Clasificación | Nota |
|-------|---------------|------|
| ~**14,4 GB** Cached Egress (incidente / período anterior citado) | **REPORTADO** | Relato operativo / Dashboard; no revalidado en esta sesión documental |
| Período posterior citado en operación (16-nov → …): Cached ~0,98 GB / Egress ~0,029 GB / Storage ~0,265 GB | **REPORTADO** | Incluye día de migración; no sustituye serie de 7 días |

## Objetivo

1. Reducir egress sin romper catálogo, precios, stock ni visibilidad.  
2. Trazabilidad permanente POS↔WEB.  
3. Decidir con datos si es viable regresar a plan Free.  
4. Evitar regresiones (cache-bust en WEB, PNG pesados, sobrescritura de path, writes no autorizados).

## Arquitectura involucrada

| Pieza | Rol |
|-------|-----|
| **POS-TU-MOVIL** | Escribe productos / `web_product_metadata`; optimiza y sube imágenes (Gestión Web); ejecuta migración histórica PNG→WebP vía `scripts/image-migration` (local, hard-blocked). |
| **tu-movil-web** | Solo lectura: RPC `anon` + render de `web_image_url`; paginación/lazy; URLs estables (sin `?v=`). |
| **Supabase** | Proyecto compartido. Storage `product-images`. RPCs públicas: `get_public_web_products_catalog`, `get_public_web_product_stock_by_store`, `get_public_bcv_rate`. RPC admin imagen: `update_web_product_image_url`. |

## Repositorios

| Repo | Ruta local | Rol |
|------|------------|-----|
| `POS-TU-MOVIL` | `C:\Users\Dell\Documents\POS-TU-MOVIL` | Este expediente + evidencia de migración/Storage |
| `tu-movil-web` | `C:\Users\Dell\Documents\tu-movil-web` | Expediente espejo; intervenciones del sitio público |

**No hay sincronización automática** entre repos.

## Documentos del expediente

| Archivo | Contenido |
|---------|-----------|
| [HISTORIAL.md](./HISTORIAL.md) | Cronología técnica, lotes, commits |
| [ESTADO_ACTUAL.md](./ESTADO_ACTUAL.md) | Mitigaciones, verificaciones, riesgos |
| [MEDICIONES.md](./MEDICIONES.md) | Valores históricos, locales y pendientes |
| [PLAN_DE_ACCION.md](./PLAN_DE_ACCION.md) | Pendientes (sin ejecutar) |
| [DECISIONES.md](./DECISIONES.md) | Decisiones y restricciones |

## Despliegue POS (Render)

| Campo | Valor | Clasificación |
|-------|--------|---------------|
| Servicio Render | `POS-TU-MOVIL` | **VERIFICADO** (captura visual Dashboard, operador) |
| Repositorio | `ingsistemavzla/POS-TU-MOVIL` | **VERIFICADO** |
| Rama | `main` | **VERIFICADO** |
| Commit Live | `2b7b649` | **VERIFICADO** |
| Estado | `Live` | **VERIFICADO** |
| Modalidad | `Auto-Deploy` | **VERIFICADO** |

Push a GitHub ≠ deploy por sí solo; la confirmación anterior cierra la verificación de publicación del código funcional de imágenes.

## Evidencia POS prioritaria

### A) Código publicado y desplegado (git + Render)

| Ubicación | Contenido |
|-----------|-----------|
| `src/utils/optimizeProductImage.ts` | WebP, límites, path versionado, strip `?t=` — en `2b7b649` Live |
| `src/utils/productImageStorage.ts` | Upload `cacheControl` 86400, `upsert: false` — en `2b7b649` Live |
| `docs/PREPARACION_CLOUDFLARE_R2_IMAGENES.md` | Solo docs; R2 no implementado |

### B) Evidencia histórica local de migración (artefactos; no equivalen a lectura actual de Storage)

| Ubicación | Contenido |
|-----------|-----------|
| `scripts/image-migration/` | Pipeline, runners, manifiestos, reportes, backups SHA-256 (258 PNG→WebP) |
| `sql/update_web_product_image_url.sql` | RPC CAS de URL de imagen (local / referencia) |

**Distinción obligatoria:** los artefactos de migración (258, backups SHA-256, deletes) son **evidencia histórica local verificada el día de ejecución**. **No** constituyen una comprobación actual del Dashboard de Supabase Storage. Una relectura Storage/Usage sigue **PENDIENTE** si se exige en sesión futura.

## Leyenda de evidencia

- **VERIFICADO** — código, commit, manifiesto/reporte local inspeccionado, o deploy confirmado (p. ej. captura Render Dashboard).  
- **REPORTADO** — afirmado en operación/Dashboard/docs sin revalidación en esta sesión.  
- **PENDIENTE** — requiere medición o acción externa autorizada.

## Estado que debe conservarse

**FASE 1 — CONTENCIÓN INICIAL Y PREPARACIÓN DE MEDICIÓN: COMPLETADA.**  
Las intervenciones iniciales están implementadas y el código POS de imágenes está **publicado y desplegado** (`2b7b649` Live). **No** implica reducción sostenida demostrada del Cached Egress.

**CASO-014: EN SEGUIMIENTO — SIN NUEVAS INTERVENCIONES TÉCNICAS AUTORIZADAS.**
