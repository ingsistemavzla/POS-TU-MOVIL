# Plan de Implementación Web – Integración BCV y Precios

**Complemento de:** `INSTRUCCIONES_TECNICAS_WEB_INTEGRACION_BCV.md`  
**Basado en:** Cuestionario previo y `RESUMEN_ESTADO_WEB_BCV_PRECIOS.md`  
**Objetivo:** Mapeo concreto de archivos y acciones para Cursor Web.

---

## Pre-requisitos (verificar antes de empezar)

| # | Verificación | Acción si falla |
|---|--------------|-----------------|
| 1 | La Web y el POS usan el **mismo proyecto Supabase** | Si no, la Web debe conectarse al Supabase del POS o ejecutar las migraciones en su propio proyecto. |
| 2 | La RPC `get_public_bcv_rate()` existe en Supabase | Ejecutar `supabase/migrations/20250209120001_create_get_public_bcv_rate.sql` (o equivalente del POS) en el SQL Editor. |
| 3 | `system_settings` tiene fila con `manual_bcv_rate` para la company | El administrador debe haber guardado al menos una vez la configuración en Gestión Web del POS. Si no hay fila, la RPC puede retornar NULL. |
| 4 | React Query está instalado | Ya confirmado: `@tanstack/react-query` v5. |

---

## Checklist de archivos (orden sugerido)

### FASE 1: Crear infraestructura nueva

| Acción | Archivo | Descripción |
|--------|---------|-------------|
| **CREAR** | `src/hooks/useBCVRate.ts` | Hook con `useQuery` que llama a `supabase.rpc('get_public_bcv_rate')`. `staleTime: 60_000`, `gcTime: 120_000`. |
| **CREAR** | `src/utils/currency.ts` (o añadir a utils existente) | Función `toBs(usdAmount: number, rate: number): string` con `toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })`. Retornar `'—'` si `!rate \|\| rate <= 0`. |

### FASE 2: Eliminar DolarAPI

| Acción | Archivo | Descripción |
|--------|---------|-------------|
| **MODIFICAR** | `src/utils/fetchBCVRate.ts` | **Opción A:** Eliminar el archivo y todas sus importaciones. **Opción B:** Reemplazar el cuerpo por una llamada a `supabase.rpc('get_public_bcv_rate')` y exportar esa función (transición). Recomendado: Opción A + usar solo `useBCVRate`. |
| **BUSCAR** | Todo el proyecto | `fetchBCVRate`, `fetch('https://ve.dolarapi.com` – asegurarse de que no queden referencias. |

### FASE 3: Consumidores de la tasa

| Archivo | Cambio concreto |
|---------|-----------------|
| `src/components/BCVBadge.tsx` | Sustituir `fetchBCVRate` + `useState` + `setInterval` por `useBCVRate()`. Mostrar `data` (tasa) o "—" si `!data`. Eliminar el intervalo; React Query maneja el refresco por `staleTime`. |
| `src/components/PriceListModal.tsx` | Usar `useBCVRate()` en lugar de llamar `fetchBCVRate()` al abrir. Pasar `bcvRate` (de `data`) al generador de PDF. |
| `src/components/ChatBot.tsx` | Usar `useBCVRate()` en lugar de `fetchBCVRate()`. Sustituir todas las conversiones inline USD→Bs por `toBs(precioUSD, bcvRate)`. |

### FASE 4: Unificar conversión USD → Bs

| Archivo | Cambio concreto |
|---------|-----------------|
| `src/utils/generatePriceListPDF.ts` | Importar `toBs` y usarla para la columna "Precio BS (BCV)" en lugar de la lógica inline. Recibir `bcvRate` como parámetro (ya lo hace) y pasar a `toBs`. |
| `src/components/ChatBot.tsx` | Reemplazar cada `(precioUSD * bcvRate).toLocaleString('es-VE', ...)` por `toBs(precioUSD, bcvRate)`. |

### FASE 5: Validaciones (sin cambios en precios)

| Verificación | Dónde |
|--------------|-------|
| Catálogo sigue usando `get_public_web_products_catalog` | `src/hooks/useProducts.ts` – no tocar. |
| `sale_price_usd` se usa tal cual | Confirmar en Productos, ProductCard, etc. – no aplicar fórmulas. |
| `staleTime` del catálogo | Mantener 5 min o alinear con `useBCVRate` (1–2 min) si quieres mayor coherencia. |

---

## Forma de la RPC `get_public_bcv_rate`

- **Llamada:** `supabase.rpc('get_public_bcv_rate')`
- **Retorno:** Escalar numérico (el valor de `manual_bcv_rate`) o NULL si no hay configuración.
- **Ejemplo:** `const { data } = await supabase.rpc('get_public_bcv_rate'); // data: number | null`

---

## Manejo de tasa NULL

Si `get_public_bcv_rate()` retorna `null`:

- **BCVBadge:** Mostrar "—" o "N/D".
- **toBs(usdAmount, null):** Retornar `'—'` (ya contemplado si validas `!rate`).
- **PDF / ChatBot:** No mostrar Bs o mostrar "—" donde corresponda.

No usar fallback a DolarAPI; la única fuente es Supabase.

---

## Resumen de dependencias a eliminar

- Cualquier `import` de `fetchBCVRate` desde `src/utils/fetchBCVRate.ts`.
- Cualquier `fetch('https://ve.dolarapi.com/...')` para la tasa.
- `setInterval` en BCVBadge para refrescar la tasa (React Query lo hace con `staleTime`).

---

## Orden sugerido para Cursor Web

1. Crear `useBCVRate.ts` y `toBs` en `currency.ts`.
2. Modificar BCVBadge para usar `useBCVRate`.
3. Modificar PriceListModal para usar `useBCVRate`.
4. Modificar ChatBot para usar `useBCVRate` y `toBs`.
5. Modificar `generatePriceListPDF.ts` para usar `toBs`.
6. Eliminar `fetchBCVRate.ts` y limpiar importaciones.
7. Probar: badge, catálogo, ChatBot, PDF con tasa desde Supabase.

---

*Usar junto con `INSTRUCCIONES_TECNICAS_WEB_INTEGRACION_BCV.md` para contexto y requisitos técnicos.*
