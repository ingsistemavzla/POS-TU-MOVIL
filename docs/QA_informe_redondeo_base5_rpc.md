# QA – Redondeo Base 5 en `get_public_web_products_catalog`

**Nota:** La regla en producción fue actualizada a **Base 1 (ROUND al entero más cercano)**. Ver migración `20250209250000_get_public_web_catalog_round_base1.sql` y `docs/RESUMEN_FINAL_REDONDEO_BASE5_WEB.md`. Este informe documenta la QA histórica de Base 5.

## 1. Prueba de límites: precio exactamente múltiplo de 5 (ej. 100.00)

**Pregunta:** ¿`(100.00 % 5) > 2.5` devuelve correctamente 100 o hay riesgo de saltar al siguiente nivel (105)?

**Resultado:**

- En PostgreSQL, con tipo **numeric**, el operador `%` devuelve el resto de la división con precisión exacta.
- Para `100.00::numeric`: `100 % 5 = 0` (no hay error de punto flotante).
- La condición `(0 > 2.5)` es **FALSE** → se toma la rama **ELSE** → `FLOOR(100/5)*5 = 100`.
- Por tanto, **100 se mantiene en 100** y no salta a 105.

**Casos comprobados:**

| Precio calculado | Residuo (% 5) | > 2.5? | Rama      | Resultado Base 5 |
|------------------|---------------|--------|-----------|-------------------|
| 95.00            | 0             | No     | FLOOR     | 95                |
| 97.50            | 2.5           | No     | FLOOR     | 95                |
| **100.00**       | **0**         | **No** | **FLOOR** | **100**           |
| 102.50           | 2.5           | No     | FLOOR     | 100               |
| 103.00           | 3             | Sí     | CEIL      | 105               |

**Nota:** Si en algún tramo se usara `double precision`, valores como 100.0 podrían representarse como 99.999... o 100.000...1 y el residuo no sería exactamente 0. En esta función los cálculos son con `numeric` y literales `5.0` (numeric), por lo que el comportamiento en múltiplos exactos de 5 es correcto.

**Conclusión:** No hay riesgo de que un múltiplo exacto de 5 (p. ej. 100.00) salte al siguiente nivel; la lógica es correcta en el límite.

---

## 2. Consistencia de tipos: `numeric(15,4)` vs `numeric(15,2)`

**Situación actual:** La función declara `sale_price_usd NUMERIC(15,4)` y hace `::numeric(15,4)` en el resultado.

**Efecto:**

- Los valores se serializan en la API/JSON con 4 decimales: p. ej. `95.0000`, `100.0000`.
- La web/front suele formatear a enteros (Base 5), pero el contrato de la API sigue enviando 4 decimales.

**Recomendación:**

- Cambiar el tipo de retorno de la función a **`NUMERIC(15,2)`** para la columna `sale_price_usd`.
- Ventajas:
  - Salida más limpia en JSON: `95.00`, `100.00`.
  - Sigue siendo válido para precios con 2 decimales si en el futuro se usa para otros casos.
  - Coherente con “precio mostrado” (Base 5 = enteros, mostrados como XX.00).

**Implementación:** Crear migración que reemplace la función manteniendo la misma lógica y solo cambiando:

- En `RETURNS TABLE`: `sale_price_usd NUMERIC(15,2)`.
- En cada rama del `CASE`: `::numeric(15,2)` en lugar de `::numeric(15,4)`.

---

## 3. Rendimiento: CEIL, FLOOR y `%` con catálogos grandes

**Análisis:**

- Las operaciones por fila son: `%`, comparación con 2.5, `CEIL` o `FLOOR`, multiplicación. Todas O(1) y muy baratas en CPU.
- El coste real de la consulta viene de:
  - Acceso a tablas: `products`, `inventories`, `web_product_metadata`, `system_settings`.
  - JOINs y filtros (`WHERE`, `GROUP BY`).
  - `ORDER BY p.name`.

Para catálogos del orden de **miles de productos**, el tiempo extra por la aritmética de redondeo es despreciable (sub-milisegundos) frente al tiempo de I/O y JOINs.

**Conclusión:** No es necesario cambiar la lógica por rendimiento; CEIL/FLOOR/% no son un cuello de botella.

**Materialized View:**

- **Ahora:** No es necesario para “miles” de productos; la RPC suele ser suficiente.
- **Considerar MV en el futuro si:**
  - El catálogo se lee muy a menudo (muchas llamadas por minuto) y se actualiza poco (precios/visibilidad no cambian cada segundo).
  - Se observan latencias altas en producción (p. ej. > 200 ms para ~10k filas) y se ha descartado que el cuello de botella sea red o otros servicios.
  - Se quiere cachear el resultado durante minutos (p. ej. refresco cada 5–15 min).

Si se implementa MV, habría que definir política de refresco (REFRESH MATERIALIZED VIEW CONCURRENTLY) y mantenerla al actualizar precios o visibilidad.

---

## Resumen de acciones sugeridas

| Tema            | Estado / Riesgo | Acción recomendada                                      |
|-----------------|-----------------|---------------------------------------------------------|
| Límite × 5      | OK              | Ninguna; opcional: ejecutar `sql/QA_redondeo_base5_get_public_web_catalog.sql` en QA. |
| Tipo numeric    | Mejorable       | Cambiar retorno y casteos a `numeric(15,2)` en la RPC.  |
| Rendimiento     | Aceptable       | Mantener función actual; considerar MV solo si hay datos de latencia/uso. |

Script de verificación incluido en el repo: **`sql/QA_redondeo_base5_get_public_web_catalog.sql`**.
