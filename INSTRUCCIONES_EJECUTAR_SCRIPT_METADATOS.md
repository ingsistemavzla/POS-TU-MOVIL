# 🚨 INSTRUCCIONES URGENTES: Ejecutar Script SQL para Totalizaciones Correctas

## ⚠️ PROBLEMA ACTUAL

El panel de ventas está mostrando **"Mostrando 15 de 15 ventas"** cuando debería mostrar el total real (ej: "Mostrando 15 de 570 ventas").

**Causa**: La RPC `get_sales_metadata_v2` no existe en la base de datos, por lo que el sistema usa un fallback temporal que solo cuenta la página actual.

## ✅ SOLUCIÓN

### PASO 1: Abrir Supabase Dashboard
1. Ve a https://supabase.com/dashboard
2. Selecciona tu proyecto
3. Ve a **SQL Editor** (menú lateral izquierdo)

### PASO 2: Ejecutar el Script SQL
1. Abre el archivo `sql/12_crear_rpc_metadatos_ventas.sql` en tu editor
2. Copia **TODO el contenido** del archivo
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **"Run"** o presiona `Ctrl+Enter`

### PASO 3: Verificar que se ejecutó correctamente
Deberías ver un mensaje de éxito. Si hay errores, compártelos.

### PASO 4: Recargar el Frontend
1. Recarga la página del panel de ventas
2. Aplica un rango de fechas (ej: 1-30 de diciembre)
3. Verifica que ahora muestre: **"Mostrando 15 de 570 ventas"** (o el total real)

## 📋 Qué hace el script

El script crea una función RPC (`get_sales_metadata_v2`) que:
- Cuenta el **total real** de ventas que cumplen los filtros (no solo la página actual)
- Calcula el **total real** en USD y BS desde todas las ventas filtradas
- Calcula **estadísticas por categoría** desde todas las ventas filtradas
- Respeta los mismos filtros que `get_sales_history_v2` (fecha, tienda)

## ⚠️ IMPORTANTE

**Sin este script SQL:**
- ❌ Muestra "15 de 15 ventas" (incorrecto)
- ❌ Estadísticas solo de la página actual (incorrecto)
- ❌ Totalizaciones incorrectas cuando hay filtros

**Con este script SQL:**
- ✅ Muestra "15 de 570 ventas" (correcto)
- ✅ Estadísticas desde todas las ventas filtradas (correcto)
- ✅ Totalizaciones correctas siempre

## 🔍 Verificación

Después de ejecutar el script, verifica en la consola del navegador:
- ✅ Debe aparecer: `✅ [RPC] Metadatos del servidor (TOTALES REALES)`
- ❌ NO debe aparecer: `⚠️ [FALLBACK] Calculando totales desde página actual`

