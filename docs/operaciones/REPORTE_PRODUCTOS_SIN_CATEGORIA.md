# Productos sin categoría (uncategorized)

## Qué significa en Estadísticas

El panel agrupa inventario en:

| Categoría panel | Valor en BD (`products.category`) |
|-----------------|-----------------------------------|
| Teléfonos | `phones` |
| Accesorios | `accessories` |
| Servicio Técnico | `technical_service` |
| **uncategorized** | `NULL`, vacío, o **cualquier otro texto** |

## Cifras actuales (certificadas en panel, 2026-06-02)

| Métrica | Valor |
|---------|--------|
| Productos | **3** |
| Unidades | **3** |
| Valor USD | **41,00** |

Estos productos **no aparecen** en el resumen por sucursal (solo Tel / Acc / Serv), pero **sí** en el total global de unidades (5.300 incluye esas 3 uds).

## Cómo identificarlos en Supabase

Ejecutar:

`sql/reporte_productos_sin_categoria.sql`

Devuelve:

1. **RESUMEN** — debe coincidir con 3 / 3 / ~41 USD  
2. **DETALLE** — SKU, nombre, valor de `category` en BD, motivo, stock por sucursal  

## Productos identificados (2026-06-02) — corrección manual en Artículos

| SKU | Producto | Sucursal con stock | Categoría sugerida |
|-----|----------|-------------------|-------------------|
| mic016 | micas iphone xs max tactil corto (E) | Tu Móvil Store | Accesorios |
| mic021 | micas iphone 11 tactil (E) | Tu Móvil Store | Accesorios |
| marc07 | marco pantalla iphone 14 pro (E) | Tu Móvil Store | Accesorios |

**Procedimiento:** Artículos → buscar por SKU → editar producto → asignar **Accesorios** (no usar SQL salvo auditoría).

## Corrección (alternativa SQL)

En **Almacén / Artículos**, editar cada producto y asignar categoría válida, o:

```sql
UPDATE products
SET category = 'accessories'  -- ajustar según producto
WHERE id = '...'::uuid;
```

Volver a ejecutar el reporte SQL hasta que el resumen dé **0** productos sin categoría.

## Informe público

URL (sin login): `/informe/productos-sin-categoria-inventario-2026`
