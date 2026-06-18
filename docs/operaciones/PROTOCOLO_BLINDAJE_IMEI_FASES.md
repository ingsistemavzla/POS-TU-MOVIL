# Protocolo de blindaje IMEI / variantes (SKU)

Diagnóstico: el POS descuenta inventario por **SKU** (`product_id` del carrito). Un error de variante (128 GB vs 256 GB) es error humano de selección, no falla de contabilidad total.

## Fases

| Fase | Objetivo | Estado en repo |
|------|----------|----------------|
| **Auditoría** | Medir integridad (sin IMEI, IMEI duplicado, variantes) | `sql/auditoria_integridad_ventas_inventario.sql` |
| **Fase 1** | Bloquear venta de teléfonos sin IMEI (POS + RPC) | `POS.tsx`, migración `20260602120000_require_phone_imei_process_sale.sql` |
| **Fase 2** | Maestro `phone_inventory_units` (IMEI → SKU) | Diferido post estabilización sucursal |

## Paso 1 — Hoy (operación)

1. Abrir Supabase SQL Editor.
2. Ejecutar por bloques `sql/auditoria_integridad_ventas_inventario.sql`:
   - **A** — Teléfonos sin IMEI (90 días)
   - **C** — IMEI duplicado
   - **D** — Variantes por SKU/tienda (ajustar filtro `ILIKE` del modelo)
   - **E** — Resumen ejecutivo
3. Si hay desbalances puntuales, corregir inventario/facturación **una vez** con criterio documentado.

## Paso 2 — Fase 1 (despliegue)

1. Aplicar migración en Supabase (o `supabase db push`).
2. Desplegar frontend (Render): el botón de venta queda deshabilitado si faltan IMEI en teléfonos.
3. Capacitar cajeros: cada unidad de teléfono = un IMEI de 15–17 dígitos antes de confirmar.

## Paso 3 — Fase 2 (después)

Entrada por lote → registro de IMEIs por unidad → venta validada IMEI contra SKU físico.
