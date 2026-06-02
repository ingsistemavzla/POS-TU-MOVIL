# Catálogo de slugs — Informes públicos (sin login)

Presentación uniforme en la app: cabecera verde, metadatos, tablas, pasos, veredicto y enlaces cruzados.

**Rutas base**

| Ruta | Descripción |
|------|-------------|
| `/informes` | Listado visual de informes |
| `/informe/<slug>` | Informe individual |

**Código:** `src/data/publicInformes/`, `src/pages/PublicInformePage.tsx`

---

## Slugs operación Tu Móvil Marino (2026)

| Slug | Categoría | Contenido |
|------|-----------|-----------|
| `catalogo-operaciones-sucursales-2026` | Índice | Tabla de todos los slugs y enlaces |
| **`operacion-marino-informe-absoluto-2026`** | **Consolidado** | **TODO en 1:** respaldo + SQL + validaciones + inventario final |
| **`respaldo-pre-sucursal-marino-2026`** | **Respaldo** | Git, dump, protocolo, procedimiento restore |
| `inventario-estado-actual-2026-06` | Inventario | Totales, categorías, 5 sucursales, filas BD |
| `operacion-marino-ejecuciones-2026` | Ejecución | Migración, RPC, SQL, archivos repo |
| `operacion-marino-validaciones-2026` | Validación | E2E, transferencia Centro, integridad |
| `operacion-marino-informe-final-2026` | Consolidado | Veredicto APROBADO y comparativa |

---

## URLs de ejemplo (producción)

Sustituir dominio por el desplegado del POS:

```
https://<tu-dominio>/informes
https://<tu-dominio>/informe/operacion-marino-informe-absoluto-2026
https://<tu-dominio>/informe/respaldo-pre-sucursal-marino-2026
https://<tu-dominio>/informe/inventario-estado-actual-2026-06
https://<tu-dominio>/informe/operacion-marino-ejecuciones-2026
https://<tu-dominio>/informe/operacion-marino-validaciones-2026
https://<tu-dominio>/informe/operacion-marino-informe-final-2026
```

---

## Informes públicos previos (rutas fijas, sin slug)

| Ruta | Página |
|------|--------|
| `/server` | Estado servidor / incidente |
| `/presupuesto-sistema-servicio-tecnico` | Propuesta servicio técnico |

---

## Markdown en repo (misma operación)

| Documento |
|-----------|
| `docs/operaciones/INFORME_FINAL_OPERACION_SUCURSALES_2026.md` |
| `docs/operaciones/ACTA_COMPLETA_SUCURSAL_TU_MOVIL_MARINO.md` |
| `sql/INDICE_SQL_EJECUTADOS_SUCURSAL_MARINO.md` |

---

## Añadir un informe nuevo

1. Definir objeto `PublicInforme` en `src/data/publicInformes/operacionSucursalMarino2026.ts` (o archivo nuevo).
2. Registrar en array `ALL_PUBLIC_INFORMES`.
3. Añadir fila en catálogo y `relacionados` de informes vecinos.
4. Documentar slug en este archivo.

No requiere login ni cambios en Supabase RLS.
