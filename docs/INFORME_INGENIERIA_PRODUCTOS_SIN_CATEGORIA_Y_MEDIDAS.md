# Informe de ingeniería – Productos sin categoría y medidas aplicadas

**Clasificación:** Interno  
**Fecha:** 9 de febrero de 2026  
**Sistema:** POS TU MÓVIL (inventario y productos)  
**Responsable:** Ingeniería / Desarrollo  

---

## 1. Resumen ejecutivo

Se detectó la existencia de productos en base de datos con el campo **categoría** en NULL, lo que afecta reportes por categoría (Teléfonos, Accesorios, Servicio Técnico), cierres diarios de inventario y estadísticas por sucursal. Se aplicaron medidas correctivas en backend y frontend para impedir nuevos casos y se documentó el estado actual y las acciones recomendadas sobre los registros ya existentes sin categoría.

---

## 2. Qué ocurrió y cómo ocurrió

### 2.1 Situación detectada

- En el modelo de datos, el campo **`category`** de la tabla `products` era opcional (nullable).
- No existía validación obligatoria en la creación/edición de productos desde la aplicación ni en la función RPC de creación (`create_product_v3` o equivalente).
- Como consecuencia, se generaron **5 productos** con `category` en NULL en distintos momentos (entre diciembre de 2025 y febrero de 2026), quedando “huérfanos” de categoría.

### 2.2 Impacto

- **Reportes y dashboards:** Las agregaciones por categoría (Teléfonos, Accesorios, Servicios) no contabilizaban correctamente estos productos o los excluían.
- **Cierres diarios de inventario (snapshots):** La función de cierre por categoría depende de `products.category`; los productos sin categoría no se asignaban a ninguna categoría y podían distorsionar totales o quedar fuera de los totales por tipo.
- **Consistencia:** Riesgo de incoherencia entre inventario físico, reportes y cierres si no se corrige el dato.

### 2.3 Origen técnico

- Diseño inicial del esquema y de la UI sin restricción explícita de “categoría obligatoria”.
- Creación/edición de productos sin validación en frontend (formulario) ni en backend (RPC) que exigiera categoría no vacía.

---

## 3. Medidas tomadas

### 3.1 Backend (base de datos)

- **Migración `20250209100000_create_product_v3_validation.sql`:**
  - Validación en la función de creación de producto: `p_name`, `p_sku` y **`p_category`** no pueden ser NULL ni cadenas vacías (tras TRIM).
  - Validación de `p_cost_usd` y `p_sale_price_usd` > 0.
  - Con ello, **a partir de la aplicación de esta migración no se pueden crear productos nuevos sin categoría** vía la RPC afectada.

### 3.2 Frontend (aplicación)

- **Formulario de producto (Artículos/Almacén):**
  - Categoría tratada como campo obligatorio en crear y editar.
  - Validación en envío del formulario: si no hay categoría seleccionada, se muestra mensaje de error y no se envía la petición.
  - Etiqueta del campo actualizada a “Categoría *” para dejar claro que es obligatorio.

### 3.3 Documentación y seguimiento

- **`docs/PRODUCTOS_SIN_CATEGORIA_PENDIENTES.md`:**
  - Listado exacto de los 5 productos con `category` NULL (id, sku, name, created_at).
  - Instrucciones para corregirlos desde la app o vía SQL.
  - Referencia a la migración que evita nuevos casos.

---

## 4. Estado actual

| Aspecto | Estado |
|--------|--------|
| Nuevos productos sin categoría | **Impedido** por validación en RPC y en formulario. |
| Productos ya existentes sin categoría | **5 registros** pendientes de corrección (listados en `PRODUCTOS_SIN_CATEGORIA_PENDIENTES.md`). |
| Reportes por categoría / cierres | Funcionan correctamente para todos los productos que **sí** tienen categoría; los 5 sin categoría no se asignan a Teléfonos/Accesorios/Servicios hasta que se les asigne una. |
| Riesgo de nuevos “huérfanos” | **Eliminado** en el flujo actual (creación/edición controlada por la app y la RPC validada). |

---

## 5. Productos actualmente sin categoría (huérfanos)

Los siguientes 5 productos tienen `category` en NULL y deben ser corregidos para alinearlos con reportes y cierres:

| # | SKU | Nombre |
|---|-----|--------|
| 1 | 10229 | pantalla honor x8b org |
| 2 | marc07 | marco pantalla iphone 14 pro (E) |
| 3 | mic016 | micas iphone xs max tactil corto (E) |
| 4 | mic021 | micas iphone 11 tactil (E) |
| 5 | 060 | MINI UPS 12000 MAH WAKE |

Detalle completo (ids, fechas) en **`docs/PRODUCTOS_SIN_CATEGORIA_PENDIENTES.md`**.

---

## 6. Qué se debe hacer / Recomendaciones

### 6.1 Corrección de los 5 productos (recomendado a corto plazo)

- **Opción A – Desde la aplicación (recomendada):**
  - Acceder a **Artículos** o **Almacén**.
  - Editar cada uno de los 5 productos y asignar una categoría:
    - **Teléfonos** (`phones`): solo si el ítem es un equipo completo.
    - **Accesorios** (`accessories`): pantallas, marcos, micas, cargadores, UPS, etc. (recomendado para los 5 listados).
    - **Servicio Técnico** (`technical_service`): solo si aplica a servicios, no a estos SKU.
  - Guardar. A partir de ese momento quedarán incluidos correctamente en reportes y cierres por categoría.

- **Opción B – Desde SQL (si se prefiere corrección masiva):**
  - Ejecutar en Supabase (SQL Editor) los `UPDATE` sobre `public.products` para los `id` indicados en `PRODUCTOS_SIN_CATEGORIA_PENDIENTES.md`, asignando por ejemplo `category = 'accessories'` para los 5, o la categoría que corresponda por tipo de producto.

### 6.2 Verificación posterior

- Tras asignar categoría a los 5:
  - Revisar en **Estadísticas** y en **Cierres diarios** que los totales por categoría y por tienda reflejen los cambios.
  - Opcional: volver a ejecutar un cierre de inventario (snapshot) y comprobar que no queden líneas con categoría NULL en las consultas de negocio.

### 6.3 Cierre del tema

- Cuando los 5 productos tengan categoría asignada:
  - Archivar o actualizar **`PRODUCTOS_SIN_CATEGORIA_PENDIENTES.md`** indicando que ya no hay productos huérfanos.
  - Este informe puede conservarse como registro de la incidencia y de las medidas aplicadas.

---

## 7. Conclusiones

- La causa fue la ausencia de validación de categoría obligatoria en modelo, RPC y formulario.
- Se implementaron validaciones en backend y frontend que evitan nuevos productos sin categoría.
- Quedan **5 productos huérfanos** que se recomienda corregir desde la app (o vía SQL) en el corto plazo para mantener coherencia en reportes y cierres de inventario.

---

*Documento generado como registro formal de la incidencia y de las medidas tomadas. Mantener en carpeta `docs/` hasta cierre de los 5 casos.*
