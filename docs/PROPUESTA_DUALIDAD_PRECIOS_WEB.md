# Propuesta técnica: Modelo de Dualidad de Precios para la Web

**Objetivo de negocio:** Permitir que el cliente en la Web elija entre dos modalidades de precio:
- **Internacional (USD):** Precio original del POS, sin impuestos ni ajustes. Competitivo.
- **Nacional (Bs):** Precio inflado, expresado obligatoriamente en Bolívares. Cubre impuestos y ajustes.

---

## 1. Mapeo actual de precios

### Origen: `products.sale_price_usd`

| Campo | Ubicación | Descripción |
|-------|-----------|-------------|
| `sale_price_usd` | `products` | Precio base de venta. Es el precio que ve el cajero en el POS físico. |

### Ajustes: `system_settings`

| Campo | Descripción | Uso |
|-------|-------------|-----|
| `web_adjustment_method` | `'RATE'` o `'PERCENTAGE'` | Método de inflado para precio web |
| `web_adjustment_rate` | Ej. 50 | Para RATE: tasa interna |
| `manual_bcv_rate` | Ej. 40 | Tasa BCV pública (para conversión USD→Bs) |
| `web_tax_percentage` | Ej. 5 | Para PERCENTAGE: porcentaje de recargo |

### Fórmulas de inflado

- **RATE:** `precio_inflado = sale_price_usd × (web_adjustment_rate / manual_bcv_rate)`
- **PERCENTAGE:** `precio_inflado = sale_price_usd × (1 + web_tax_percentage / 100)`

### Flujo actual

```
products.sale_price_usd
         │
         ├──→ POS físico: usa directo (sin inflado, sin redondeo)
         │
         └──→ RPC get_public_web_products_catalog:
                    inflado (RATE o PERCENTAGE)
                    + ROUND al entero (Base 1) para price_nacional_usd
                    → sale_price_usd (alias), price_internacional_usd (POS), price_nacional_usd
```

**Resumen:** La Web recibe **price_internacional_usd** (POS) y **price_nacional_usd** (inflado + ROUND). `sale_price_usd` = alias de price_nacional_usd.

---

## 2. Lógica de la dualidad

### Los dos precios (regla de negocio)

| Modalidad | Significado | Moneda | Fórmula |
|-----------|-------------|--------|---------|
| **Internacional** | Precio POS original | USD | `products.sale_price_usd` (sin cambios) |
| **Nacional** | Precio inflado + impuestos | Bs | `ROUND(precio_inflado) × manual_bcv_rate` (Base 1) |

Solo existen dos precios: el del POS ($) y el maquillado (Bs).

### Propuesta de columnas en la RPC

**Opción recomendada: dos columnas explícitas + tasa BCV**

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `price_internacional_usd` | NUMERIC(15,2) | Precio POS, sin inflado. Coincide exactamente con lo que ve el cajero. |
| `price_nacional_usd` | NUMERIC(15,2) | Precio inflado + ROUND al entero (Base 1). La Web convierte a Bs. |
| `manual_bcv_rate` | NUMERIC(12,4) | Tasa BCV usada (para referencias o equivalencias en la web). |

**¿Mantener `sale_price_usd`?**

- La Web usa `sale_price_usd` = alias de price_nacional_usd (inflado + ROUND).
- Con la dualidad, pasaríamos a `price_internacional_usd` y `price_nacional_bs`.
- Se recomienda **añadir las nuevas columnas y deprecar `sale_price_usd`** en la siguiente versión de la API. Para migrar sin romper nada, se puede conservar `sale_price_usd` como `price_internacional_usd` (o como alias) durante un tiempo.

---

## 3. Consistencia administrativa

**Pregunta:** ¿El "Precio Internacional" en la Web coincide exactamente con lo que ve el cajero en el POS?

**Respuesta:** Sí, siempre que:

- `price_internacional_usd = products.sale_price_usd` (sin inflado).
- La Web consuma esa columna para la modalidad Internacional.

El POS lee `products.sale_price_usd` directamente; no usa `system_settings` ni redondeo. Por tanto, si la RPC devuelve `price_internacional_usd = p.sale_price_usd`, el precio Web Internacional será idéntico al del POS.

**Resumen de fuentes:**

| Canal | Precio | Fuente |
|-------|--------|--------|
| POS físico | $494.00 | `products.sale_price_usd` |
| Web Internacional | $494.00 | `price_internacional_usd` = `products.sale_price_usd` |
| Web Nacional | Bs XX.XX | `price_nacional_usd` (inflado + ROUND) × BCV |

---

## 4. Impacto en el redondeo (Base 1)

**¿Aplica redondeo a ambos precios?**

| Precio | Redondeo | Motivo |
|--------|----------|--------|
| **Internacional (USD)** | No | Debe ser idéntico al POS. |
| **Nacional (USD)** | Sí, ROUND al entero (Base 1) | La Web convierte price_nacional_usd a Bs. |

**Proceso:**

1. Calcular `precio_inflado_usd` (RATE o PERCENTAGE).
2. Aplicar ROUND: `price_nacional_usd = ROUND(precio_inflado_usd)` (Base 1).
3. La Web convierte a Bs: `price_nacional_usd × manual_bcv_rate`.

**Ejemplo:** `sale_price_usd = 494`, inflado = 741.3, ROUND = 741; la Web convierte a Bs con BCV.

---

## 5. Resumen de la propuesta técnica

### Cambios en la RPC `get_public_web_products_catalog`

1. `price_internacional_usd` = `p.sale_price_usd` (sin inflado).
2. `price_nacional_usd` = `ROUND(precio_inflado)` (Base 1). La Web convierte a Bs.
3. `sale_price_usd` = alias de `price_nacional_usd` (retrocompatibilidad).

### Cambios en la Web

1. Consumir `price_internacional_usd` para modalidad Internacional.
2. Consumir `price_nacional_usd` para modalidad Nacional; convertir a Bs con tasa BCV.
3. Usar el selector de modalidad (Internacional/Nacional) para decidir qué columna mostrar.

### Cambios en el Panel de Gestión Web

- Columna USD (WEB): precio inflado + ROUND al entero (coherente con RPC y PDF).
- Opcional: añadir columna "USD (POS)" = `sale_price_usd` para que el admin vea el precio Internacional.

---

## 6. Diagrama de flujo de precios (propuesta)

```
products.sale_price_usd
         │
         ├──→ price_internacional_usd (sin cambios)
         │         │
         │         └──→ Web: Modalidad Internacional ($)
         │         └──→ POS: idéntico
         │
         └──→ inflado (RATE o PERCENTAGE)
                   │
                   └──→ ROUND (Base 1) → price_nacional_usd
                             │
                             └──→ Web: Modalidad Nacional (convierte a Bs)
```

---

## 7. Checklist de implementación

- [x] Migración SQL: `price_internacional_usd`, `price_nacional_usd`, `sale_price_usd` (alias); redondeo Base 1 (ROUND).
- [x] RPC `get_public_web_products_catalog` con dualidad y ROUND (20250209250000_get_public_web_catalog_round_base1.sql).
- [x] Web: selector de modalidad Internacional/Nacional; `price_nacional_usd` × BCV para Bs.
- [x] Panel Gestión Web: columna USD (WEB) con `roundToInteger` (Base 1).
