# Productos sin categoría – Registro pendiente de corrección

**Fecha del reporte:** 2026-02-09  
**Origen:** Consulta en base de datos (productos con `category` NULL o vacío).

A partir de la migración `20250209100000_create_product_v3_validation.sql`, los productos nuevos **deben** tener categoría; estos son los únicos casos anteriores que quedaron sin categoría y deben corregirse cuando se pueda.

---

## Resumen

| Concepto           | Cantidad |
| ------------------ | -------- |
| Productos sin categoría | 5        |
| Productos sin sucursal  | 0        |

**Nota:** No hay productos sin sucursal (todos tienen al menos un registro en `inventories`). Los 5 casos listados son **casos aislados** a corregir; no se crearán más productos sin categoría gracias a la validación en `create_product_v3` y en el formulario.

---

## Listado de productos sin categoría

| id | sku | name | category | created_at |
| --- | --- | --- | --- | --- |
| 697543eb-d54a-4dec-8840-3762750f09fb | 10229 | pantalla honor x8b org | null | 2026-02-03 00:16:54 |
| dffd51ca-3318-4a19-bee7-28a9fb4dd6b7 | marc07 | marco pantalla iphone 14 pro (E) | null | 2026-02-03 00:00:41 |
| 7f641791-3fdc-422e-8dd3-869739c6dc40 | mic016 | micas iphone xs max tactil corto (E) | null | 2026-02-02 23:35:26 |
| 2c66c32a-3911-421a-9e59-bcb991f1e5b9 | mic021 | micas iphone 11 tactil (E) | null | 2026-02-02 23:28:11 |
| 05d52d1d-be86-49b6-9024-9bd255cedf25 | 060 | MINI UPS 12000 MAH WAKE | null | 2025-12-11 01:02:35 |

---

## Cómo corregirlos después

- **Desde la app:** Editar cada producto en el formulario de Artículos/Almacén y asignar una categoría (Teléfonos, Accesorios o Servicio Técnico).
- **Desde SQL (opcional):** Ejecutar un `UPDATE` en `public.products` asignando `category = 'phones'`, `'accessories'` o `'technical_service'` según corresponda para los `id` de la tabla anterior.

---

*Documento generado para seguimiento interno. Eliminar o archivar cuando los 5 productos hayan sido corregidos.*
