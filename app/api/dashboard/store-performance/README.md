# API Endpoint: Store Performance

## ⚠️ IMPORTANTE: Compatibilidad con Next.js

Este endpoint está diseñado para **Next.js App Router**. Si tu proyecto usa **Vite + React**, este endpoint **NO funcionará directamente**.

## Opciones para usar este endpoint:

### Opción 1: Migrar a Next.js
Migra tu proyecto a Next.js para usar este endpoint nativamente.

### Opción 2: Servidor Backend Separado
Crea un servidor Node.js/Express que exponga este endpoint y úsalo como proxy.

### Opción 3: Usar Hook Directo (Recomendado para Vite)
En lugar de usar este endpoint, usa el hook `useDashboardStorePerformance` que llama directamente a Supabase.

## Uso del Endpoint (si estás en Next.js):

```typescript
// GET /api/dashboard/store-performance?start_date=2025-01-01&end_date=2025-01-31
const response = await fetch('/api/dashboard/store-performance?start_date=2025-01-01&end_date=2025-01-31', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const data = await response.json();
```

## Parámetros de Query:

- `start_date` (opcional): Fecha de inicio en formato ISO 8601
- `end_date` (opcional): Fecha de fin en formato ISO 8601

## Respuesta:

```json
{
  "summary": [
    {
      "store_id": "uuid",
      "store_name": "Tienda 1",
      "total_invoiced": 1000.00,
      "net_income_real": 950.00,
      "estimated_profit": 200.00,
      "orders_count": 10,
      "avg_order_value": 100.00,
      "profit_margin_percent": 20.0
    }
  ]
}
```


