# PLAN DE ACCIÓN — CASO-014 (POS)

`Caso: CASO-014-SUPABASE-EGRESS`  
`Repositorio: POS-TU-MOVIL`  
`Fecha de actualización: 2026-11-16`

**No ejecutar** las tareas técnicas de este plan hasta autorización explícita.

---

## Estado de esta tarea documental

| Acción | Estado |
|--------|--------|
| Crear expediente POS `docs/casos/CASO-014-SUPABASE-EGRESS/` | **Hecho** (Fase 1 documental POS) |
| Reconciliar cifras 258 con artefactos locales | **Hecho** (elevado a VERIFICADO histórico local; ≠ Storage actual) |
| Confirmar deploy Render `2b7b649` Live (servicio `POS-TU-MOVIL`) | **Hecho** (captura visual Dashboard) |
| Publicar expediente documental en `origin/main` | **Autorizado** en cierre documental controlado |
| Informar diferencias para actualizar WEB | **Hecho** (ver DECISIONES.md § Diferencias) |

---

## Próxima sesión autorizable (solo lectura / docs salvo otro prompt)

1. Leer este expediente + el de WEB (`6f920f3`).  
2. Capturar Cached / Uncached Egress actuales (Dashboard) con fecha.  
3. Revisar Cloudflare Analytics si hay volumen.  
4. Actualizar `MEDICIONES.md` en **ambos** repos (manual, sin sync automático).  
5. Decidir política para artefactos `scripts/image-migration/` (¿backup externo / qué versionar sin secretos?).

---

## Seguimiento de siete días (pendiente — no iniciar)

| Ventana | Acción | Sistema |
|---------|--------|---------|
| D0–D7 | Anotar Cached/Uncached Egress | Supabase |
| D0–D7 | Anotar visitas Cloudflare | Cloudflare |
| Fin | Comparar tendencia excluyendo/anotando 16-nov (día migración) | Operación |
| Fin | Evaluar Free plan con criterios de DECISIONES.md | Operación |

---

## Mejoras que requieren evaluación (no autorizadas)

| Mejora | Dependencia |
|--------|-------------|
| Regreso a plan Free | Serie Usage estable |
| Image Transformations + srcset / thumbs | Plan + autorización |
| Migrar Storage a R2 | Infra CF + secretos + autorización |
| Metadata `source` en BCV RPC | POS/Supabase |
| Limpieza residual PNG/`?t=` puntual | Autorización Storage |

## Opcional no urgente

| Mejora | Notas |
|--------|-------|
| Pageviews SPA React Router | Cloudflare no desglosa bien SPA |
| Reducir `ITEMS_PER_PAGE` móvil | Ya hay 12 + lazy |
| Contadores visitas→Supabase | No recomendado (writes) |

---

## Tareas bloqueadas

| Tarea | Bloqueo |
|-------|---------|
| Confirmar Storage Dashboard = 258 WebP / 0 PNG migrados | Lectura Dashboard autorizada |
| Cifra 14,4 GB vs Usage actual | Lectura Dashboard |
| Re-ejecutar migración/DELETE | **Prohibido** sin autorización; `LIVE_HARD_BLOCK=true` |
| Implementar R2 | Infra + autorización |
| Modificar WEB / `productImageUrl.ts` | Fuera de alcance POS; ya cerrado en WEB |

---

## Matriz WEB / POS / Supabase

| Acción | WEB | POS | Supabase | Estado |
|--------|-----|-----|----------|--------|
| URLs estables | Hecho `d458583` | — | — | Completado |
| Lazy/paginación | Hecho | — | — | Completado |
| WebP upload nuevos | — | Hecho `2b7b649` Live Render | Storage | Completado (código + deploy) |
| Migración 258 + delete | — | Artefactos históricos locales | Storage (día ejecución) | Completado histórico local; Storage Dashboard actual = Pendiente |
| CF Analytics | Hecho | — | — | Completado |
| Observar egress 7d | — | — | Dashboard | Pendiente |
| R2 | — | Docs only | — | Propuesto |
| Expediente CASO-014 | Hecho | Hecho (+ publicación controlada) | — | Completado Fase 1 docs |
