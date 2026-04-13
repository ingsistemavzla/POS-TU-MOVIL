# Checklist seguro: filtro por categoría en historial de ventas

**Objetivo:** aplicar `20260209120000_fix_sales_category_filter_consistency.sql` y el cambio en `useSalesData.ts` sin afectar ventas, inventario, facturación ni eliminaciones.

**Alcance del cambio:** solo RPC de **lectura** (`get_sales_history_v2`, `get_sales_metadata_v2`). No modifica `process_sale`, borrado de ventas ni movimientos de inventario.

---

## Antes del despliegue

1. **Ventana de bajo tráfico** (si es posible), aunque el riesgo de datos es bajo porque no hay escrituras nuevas en este SQL.
2. **Backup o snapshot** del proyecto Supabase (opcional pero recomendable en producción).
3. **Confirmar** que en el repo están:
   - `supabase/migrations/20260209120000_fix_sales_category_filter_consistency.sql`
   - `src/hooks/useSalesData.ts` (pasa `p_category` a ambas RPC).

---

## Orden obligatorio (evita errores de “RPC no coincide”)

1. **Primero: base de datos (Supabase)**  
   - Aplicar la migración completa (CLI `supabase db push` o pegar el SQL en **SQL Editor** y ejecutar).  
   - Verificar que no haya error en consola.

2. **Después: frontend (Render / build)**  
   - Commit + push del código que usa `p_category`.  
   - Esperar deploy **Live**.

> Si subes el front **antes** del SQL, las llamadas pueden fallar hasta que exista la nueva firma de las funciones.

---

## Verificación inmediata post-SQL (Dashboard Supabase)

En **SQL Editor** (como usuario con rol que use la app, o revisando definición):

- Debe existir `get_sales_history_v2` con parámetro `p_category` (TEXT).
- Debe existir `get_sales_metadata_v2` con parámetro `p_category` (TEXT).

---

## Pruebas funcionales (regresión corta)

Hacer en el entorno ya actualizado (BD + front):

| # | Acción | Resultado esperado |
|---|--------|---------------------|
| 1 | Abrir **Ventas** / registro de ventas | Lista carga sin error. |
| 2 | Mismo rango de fechas: **Todas las categorías** | Tarjetas de categoría coherentes. |
| 3 | Mismo rango: filtro **solo Servicio técnico** | Unidades de servicio técnico = las del paso 2 para esa categoría (no un número menor por paginación). |
| 4 | Filtro otra categoría + volver a **Todas** | Sin errores; totales estables. |
| 5 | **Una venta de prueba** en POS | Se registra; stock y totales normales. |
| 6 | Si aplica: **eliminar** venta de prueba | Stock se restituye como siempre; sin errores nuevos. |

---

## Si algo falla

1. **Solo falla la pantalla de ventas tras actualizar front:** suele ser SQL no aplicado o aplicado a otro proyecto. Reaplicar migración en el proyecto correcto.
2. **Error de función / argumentos:** comprobar que la versión desplegada del front coincide con la migración (mismos nombres de parámetros en RPC).

---

## Rollback (solo si hace falta)

- **Frontend:** volver al commit anterior y redesplegar.
- **Base de datos:** restaurar desde backup o volver a crear las funciones con la firma anterior (requiere el SQL de la migración previa guardado en el repo). Planificar rollback solo en emergencia; lo habitual es corregir y redeploy.

---

## Resumen en una frase

**SQL primero, front después, luego 6 pruebas rápidas** — así el filtro por categoría queda alineado con los totales sin tocar el flujo de venta ni inventario.
