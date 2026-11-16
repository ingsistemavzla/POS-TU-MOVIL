# DECISIONES — CASO-014 (POS)

`Caso: CASO-014-SUPABASE-EGRESS`  
`Repositorio: POS-TU-MOVIL`  
`Fecha de actualización: 2026-11-16`

---

## Decisiones tomadas

| ID | Decisión | Alcance | Evidencia |
|----|----------|---------|-----------|
| D-01 | WEB no escribe productos ni Storage; solo RPC `anon` | Arquitectura | Código WEB + docs |
| D-02 | WEB: eliminar cache-bust `?v=`; URLs canónicas | WEB | `d458583` |
| D-03 | POS: nuevas imágenes WebP + path versionado + `cacheControl` 86400 + `upsert: false` | POS | `2b7b649` |
| D-04 | Migración histórica PNG→WebP por lotes autorizados con hard-block, backup SHA-256 y delete solo post-verificación | POS | `scripts/image-migration` + artefactos |
| D-05 | No DELETE PNG sin WebP OK + backup verificado + sin refs activas | POS | runners + prepare-cleanup |
| D-06 | No modificar precios/stock/categoría/visibilidad en migración (solo `image_url`) | POS | RPC `update_web_product_image_url` |
| D-07 | Etiqueta BCV pública provisional “Sistema BCV” (WEB) | WEB | `13e1909` |
| D-08 | Analytics visitas vía Cloudflare Web Analytics (WEB), no Supabase | WEB | `31a9d81` |
| D-09 | Expediente permanente `CASO-014` en WEB y POS; sin sync automático | Docs | `6f920f3` + esta carpeta |
| D-10 | Fase 1 contención + prep. medición = **COMPLETADA**; caso **EN SEGUIMIENTO** sin nuevas intervenciones técnicas | Proceso | Ambos expedientes |
| D-11 | R2 = solo preparación documental; no implementación | POS | `PREPARACION_CLOUDFLARE_R2_IMAGENES.md` |
| D-12 | Deploy POS `2b7b649` confirmado **Live** en Render (servicio `POS-TU-MOVIL`, Auto-Deploy `main`); push ≠ deploy | POS / Render | Captura visual Dashboard (operador) |
| D-13 | Artefactos migración 258 = evidencia **histórica local**; no equivalen a comprobación actual de Supabase Storage | Docs / proceso | HISTORIAL + MEDICIONES |

---

## Restricciones operativas vigentes

1. Publicación documental: solo los seis archivos de `docs/casos/CASO-014-SUPABASE-EGRESS/` (sin código funcional, sin migración, sin dirty ajenos). Auto-Deploy incidental de docs: observar, no intervenir.  
2. No ejecutar scripts de migración ni DELETE.  
3. No alterar `scripts/image-migration/` artefactos ni `.env`.  
4. No modificar dashboard u otros dirty files ajenos al caso.  
5. No modificar WEB ni reabrir `productImageUrl.ts`.  
6. No SQL/RLS/Storage policies sin autorización.  
7. No exponer secretos (`service_role`, JWT) en docs.  
8. `LIVE_HARD_BLOCK` debe permanecer `true` fuera de ventanas autorizadas.  
9. No bajar a Free plan por “sensación”; solo con Usage medido.  
10. No afirmar conteo Storage actual solo por artefactos históricos locales.

---

## Criterios para evaluar regreso a Supabase Free

| Criterio | Estado |
|----------|--------|
| Cached Egress semanal estable bajo cupo Free con margen | **PENDIENTE DE CONFIRMACIÓN** |
| Sin regresiones (`?v=`, PNG masivos nuevos) | Verificar en código/deploy |
| Storage size aceptable | Verificar Dashboard |
| Visitas Cloudflare conocidas para correlacionar | Verificar panel |

---

## Decisiones explícitamente no tomadas

- No migrar aún a Cloudflare R2.  
- No instrumentar pageviews SPA.  
- No thumbs/srcset todavía.  
- No afirmar reducción sostenida de egress solo por migración.  
- No versionar automáticamente backups binarios PNG en git (política pendiente).  
- No re-leer Storage/Usage Supabase en este cierre documental (queda PENDIENTE).

---

## DIFERENCIAS Y ACTUALIZACIONES NECESARIAS EN WEB

Para reconciliar el expediente WEB (`6f920f3`) con evidencia POS local. **No aplicado a WEB en esta tarea.**

### Diff-01 — Cifra 258 migraciones

| Campo | Valor |
|-------|--------|
| **Documento WEB afectado** | `HISTORIAL.md`, `ESTADO_ACTUAL.md`, `MEDICIONES.md`, `PLAN_DE_ACCION.md` |
| **Información anterior (WEB)** | ~258 **REPORTADO**; “sin manifiesto 258 en git”; DELETE “PENDIENTE DE CONFIRMACIÓN” / hard-blocked en README |
| **Evidencia POS** | Artefactos locales: verificaciones piloto+01–05+99 = **258/258** SUCCESS; backups SHA-256 258 PNG; `batch-99` `cumulativeMigrated: 258`, `remainingHistoricalEligible: 0` |
| **Corrección propuesta** | Elevar migración 258 + delete PNG a **VERIFICADO (artefactos locales POS)**; aclarar que **no** están en git remoto POS; separar “Dashboard Storage no re-leído” como PENDIENTE |
| **Nivel** | VERIFICADO local / PENDIENTE Dashboard |

### Diff-02 — Hard-block vs deletes ejecutados

| Campo | Valor |
|-------|--------|
| **Documento WEB afectado** | `HISTORIAL.md` / `ESTADO_ACTUAL.md` (énfasis en DELETE bloqueado) |
| **Información anterior** | DELETE hard-blocked en README (correcto como estado **actual** del código) |
| **Evidencia POS** | Deletes **sí** se ejecutaron en ventanas autorizadas el 2026-11-16; código volvió a `LIVE_HARD_BLOCK=true` |
| **Corrección propuesta** | Distinguir: (a) política vigente = bloqueado; (b) histórico = deletes autorizados y verificados |
| **Nivel** | VERIFICADO |

### Diff-03 — Replicación expediente POS

| Campo | Valor |
|-------|--------|
| **Documento WEB afectado** | `PLAN_DE_ACCION.md` ítem “Replicar carpeta en POS” |
| **Información anterior** | Pendiente manual |
| **Evidencia POS** | Carpeta `POS-TU-MOVIL/docs/casos/CASO-014-SUPABASE-EGRESS/` creada en esta sesión |
| **Corrección propuesta** | Marcar replicación POS como hecha; mantener sync futuro manual |
| **Nivel** | VERIFICADO |

### Diff-04 — Bytes / reducción

| Campo | Valor |
|-------|--------|
| **Documento WEB afectado** | `MEDICIONES.md` |
| **Información anterior** | Sin tabla por lote |
| **Evidencia POS** | Ver `MEDICIONES.md` POS (por lote, ~315 MiB PNG liberados, ~95% reducción) |
| **Corrección propuesta** | Incorporar resumen numérico o enlace “ver expediente POS” |
| **Nivel** | VERIFICADO (artefactos) |
