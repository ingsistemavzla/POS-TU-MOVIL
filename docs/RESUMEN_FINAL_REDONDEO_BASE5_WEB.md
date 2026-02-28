# Resumen final – Redondeo de precios web (Base 1)

**Estado:** Implementado y verificado  
**Fecha:** Febrero 2025  
**Actualización:** Redondeo cambiado de Base 5 (múltiplos de 5) a **Base 1 (entero más cercano)** en toda la cadena.

---

## 1. Objetivo

Los precios aumentados para la web (precio público nacional) se muestran **redondeados al entero más cercano** en todos los canales:

- Web pública
- Panel de Gestión Web
- PDF lista de precios

Regla: decimal **≥ 0.50** → sube; **< 0.50** → baja. Resultado siempre en formato XX.00 (ej. 17.00, 742.00).

---

## 2. Regla de redondeo (Base 1)

```
ROUND(precio_inflado)  →  entero más cercano
Decimal ≥ 0.50  →  sube (CEIL)
Decimal < 0.50  →  baja (FLOOR)
```

| Precio inflado | Resultado |
|----------------|-----------|
| 97.3           | 97        |
| 97.5           | 98        |
| 100.0          | 100       |
| 742.30         | 742       |
| 742.50         | 743       |

---

## 3. Dónde está implementado

| Componente | Archivo | Descripción |
|------------|---------|-------------|
| **RPC catálogo público** | `supabase/migrations/20250209250000_get_public_web_catalog_round_base1.sql` | Inflado + `ROUND(...)::numeric(15,2)` para `price_nacional_usd` y `sale_price_usd`. `price_internacional_usd` = POS sin redondeo. |
| **Panel Gestión Web** | `src/pages/GestionWebPage.tsx` | `roundToInteger` (Math.round) + `computeWebPriceFinalFromSettings`. Columna USD (WEB). |
| **PDF lista precios** | `src/utils/priceListPdfGenerator.ts` | `roundToInteger(applyWebInflation(...))` para modo NACIONAL. |

---

## 4. Inflado antes del redondeo

- **RATE:** `P_final = P_base × (web_adjustment_rate / manual_bcv_rate)`
- **PERCENTAGE:** `P_final = P_base × (1 + web_tax_percentage / 100)`

Luego se aplica **ROUND** (Base 1) solo al precio nacional. El precio internacional no se redondea (decimales del POS intactos).

---

## 5. Checklist final

- [x] RPC `get_public_web_products_catalog`: inflado + ROUND para `price_nacional_usd`
- [x] RPC: `price_internacional_usd` = POS (decimales intactos)
- [x] Panel Gestión Web: `roundToInteger` para columna USD (WEB)
- [x] PDF lista precios: `roundToInteger` cuando modo NACIONAL
- [x] Migración `20250209250000_get_public_web_catalog_round_base1.sql` aplicada

---

## 6. Archivos de referencia

| Archivo | Uso |
|---------|-----|
| `sql/QA_redondeo_base5_get_public_web_catalog.sql` | Pruebas históricas (Base 5); lógica actual es Base 1 en RPC |
| `docs/QA_informe_redondeo_base5_rpc.md` | Informe QA (origen Base 5); regla vigente = ROUND en BD |
