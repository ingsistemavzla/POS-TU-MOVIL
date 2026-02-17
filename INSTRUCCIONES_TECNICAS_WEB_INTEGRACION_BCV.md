# Instrucciones Técnicas: Integración Web con Motor Dinámico de Precios

**Destinatario:** Cursor de la WEB (equipo frontend público)  
**Fecha:** Febrero 2025  
**Contexto:** El POS ya dispone de un motor dinámico de precios. La Web debe dejar de usar fuentes externas y consumir exclusivamente este backend.

---

## 1. Cambio de Endpoint de Tasa BCV

### Situación actual
- La Web obtiene la tasa BCV desde **DolarAPI** o fuentes externas.
- Eso genera incoherencia: el POS usa una tasa interna, la Web otra.

### Acción requerida

1. **Eliminar** cualquier llamada a DolarAPI o APIs externas para la tasa BCV.
2. **Usar exclusivamente** la RPC Supabase: `get_public_bcv_rate()`.
3. **Crear** un hook `useBCVRate` con React Query:

```ts
// useBCVRate.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useBCVRate() {
  return useQuery({
    queryKey: ['public-bcv-rate'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_bcv_rate');
      if (error) throw error;
      return data as number;
    },
    staleTime: 60 * 1000,  // 1 minuto - no refetch antes de 1 min
    gcTime: 120 * 1000,    // 2 minutos de caché (antes cacheTime en v4)
  });
}
```

**Nota:** `get_public_bcv_rate()` retorna el campo `manual_bcv_rate` de `system_settings` (BCV Público). Es la tasa oficial que el administrador configura en el POS y que el cliente debe ver.

---

## 2. Consumo de Precios – Sin Matemática Adicional

### Punto crítico

El campo `sale_price_usd` que devuelve la RPC `get_public_web_products_catalog` **ya viene con el ajuste aplicado en el servidor**.

- Si el método es **Tasa Inversa**: `P_final = P_base × (BCV_Interno / BCV_Público)`
- Si el método es **Porcentaje**: `P_final = P_base × (1 + Recargo% / 100)`

### Acción requerida

- **No aplicar** ninguna fórmula adicional de recargo, inflado o conversión sobre `sale_price_usd`.
- **Usar** `sale_price_usd` directamente como precio de venta en USD para el cliente.
- La única conversión permitida es USD → Bs usando la tasa de `get_public_bcv_rate()`.

---

## 3. Unificación de Bolívares – Utilidad Centralizada

### Problema
- El ChatBot, el Catálogo y los PDF pueden estar convirtiendo USD → Bs de forma distinta (redondeo, formato).

### Acción requerida

Crear una utilidad centralizada `toBs(usdAmount, rate)` que todos los módulos usen:

```ts
// utils/currency.ts (o similar)
/**
 * Convierte USD a Bolívares usando la tasa BCV pública.
 * Usar SIEMPRE esta función para mostrar precios en Bs.
 * @param usdAmount - Monto en USD
 * @param rate - Tasa BCV (de get_public_bcv_rate)
 */
export function toBs(usdAmount: number, rate: number): string {
  if (!rate || rate <= 0) return '—';
  const bs = usdAmount * rate;
  return bs.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
```

- **ChatBot:** usar `toBs(precio_usd, bcvRate)`.
- **Catálogo:** usar `toBs(product.sale_price_usd, bcvRate)`.
- **PDF / listas de precios:** usar la misma función o la misma lógica de redondeo y formato.

La tasa debe provenir siempre de `get_public_bcv_rate()` (via `useBCVRate` o equivalente).

---

## 4. Sincronización del Badge BCV

### Objetivo
El badge/tag que muestra la tasa BCV al usuario debe reflejar **exactamente** la tasa que se usa para convertir precios USD → Bs.

### Acción requerida

- El componente **BCVBadge** (o equivalente) debe consumir `get_public_bcv_rate()`.
- Si usas `useBCVRate`, el badge mostrará el mismo valor que el resto de la app.
- El cliente debe ver coherencia: si el badge dice "Bs 40.50", entonces todos los precios en Bs deben estar calculados con esa tasa.

**Ejemplo:**
```tsx
// BCVBadge.tsx
const { data: rate, isLoading } = useBCVRate();
return (
  <Badge>
    {isLoading ? '...' : `Bs ${rate?.toFixed(2) ?? '—'}`}
  </Badge>
);
```

---

## 5. Prueba de Coherencia

### Escenario

1. El administrador abre el **POS** → **Gestión Web**.
2. Cambia el método (Tasa Inversa ↔ Porcentaje) o modifica BCV Interno / Recargo %.
3. Guarda la configuración.
4. En la **Web pública**, los precios deben reflejar el nuevo ajuste.

### Acción requerida

1. Configurar `staleTime` de `useBCVRate` en 1–2 minutos (ya indicado arriba).
2. Configurar `staleTime` de la query del catálogo (`get_public_web_products_catalog`) de forma coherente (p. ej. 1–2 min).
3. **Verificar** que, tras el tiempo de caché, al recargar o al invalidar la query, la Web muestre los precios actualizados.
4. **Verificar** que el BCVBadge y los precios en Bs usen la misma tasa y formato (`toBs`).

### Checklist de coherencia

- [ ] El badge BCV muestra el valor de `get_public_bcv_rate()`.
- [ ] Los precios en USD del catálogo vienen de `get_public_web_products_catalog` sin transformaciones extra.
- [ ] Los precios en Bs usan `toBs(sale_price_usd, bcvRate)`.
- [ ] No hay llamadas a DolarAPI ni APIs externas para la tasa.
- [ ] Tras cambiar el método en el POS y esperar el `staleTime`, la Web muestra los nuevos precios.

---

## Resumen de Endpoints Supabase

| RPC | Uso |
|-----|-----|
| `get_public_bcv_rate()` | Tasa BCV pública (BCV Público). Usar para badge y conversión USD → Bs. |
| `get_public_web_products_catalog()` | Catálogo de productos con `sale_price_usd` ya ajustado. No aplicar fórmulas adicionales. |

---

*Documento redactado por el equipo POS. Para dudas técnicas, referirse a este documento y al código del backend.*
