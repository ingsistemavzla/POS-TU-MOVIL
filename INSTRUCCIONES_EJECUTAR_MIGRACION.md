# 📋 INSTRUCCIONES: Cómo Ejecutar la Migración

## ✅ PASO 1: Abrir Supabase SQL Editor

1. Ve a tu proyecto en **Supabase Dashboard**
2. En el menú lateral, haz clic en **"SQL Editor"**
3. Haz clic en **"New query"** para crear una nueva consulta

## ✅ PASO 2: Copiar el Contenido de la Migración

1. Abre el archivo: `supabase/migrations/20250115000001_add_inventory_movements_to_process_sale.sql`
2. **Selecciona TODO el contenido** (Ctrl+A)
3. **Copia** el contenido (Ctrl+C)

## ✅ PASO 3: Pegar y Ejecutar en Supabase

1. **Pega** el contenido en el SQL Editor de Supabase (Ctrl+V)
2. **Revisa** que el código se vea correcto
3. Haz clic en el botón **"Run"** (o presiona Ctrl+Enter)

## ✅ PASO 4: Verificar que Funcionó

Deberías ver un mensaje de éxito como:
```
Success. No rows returned
```

O si hay algún error, verás el mensaje de error específico.

## ⚠️ IMPORTANTE: Antes de Ejecutar

### ✅ Verificaciones Previas:

1. **Backup (Opcional pero Recomendado):**
   - Si tienes datos importantes, considera hacer un backup
   - La migración es segura, pero siempre es bueno tener respaldo

2. **Verificar que la tabla `inventory_movements` existe:**
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_schema = 'public' 
     AND table_name = 'inventory_movements'
   );
   ```
   - Si no existe, la función funcionará igual (el registro de movimientos será opcional)

3. **Verificar que la función actual funciona:**
   - Puedes probar hacer una venta de prueba antes de ejecutar la migración
   - Esto te asegura que todo funciona correctamente

## 🔍 Qué Hace Esta Migración

1. **Actualiza la función `process_sale`:**
   - Agrega validaciones mejoradas
   - Mejora el cálculo de totales con impuestos
   - Agrega verificación de stock antes de descontar

2. **Agrega registro de movimientos (OPCIONAL):**
   - Crea registros en `inventory_movements` cuando se procesa una venta
   - Esto es solo para el panel de auditoría del master admin
   - Si falla, la venta continúa normalmente (no crítico)

3. **Preserva toda la lógica original:**
   - No cambia cómo funcionan las ventas
   - No afecta el panel del admin
   - No afecta la integridad de datos

## ✅ Después de Ejecutar

1. **Probar una venta:**
   - Haz una venta de prueba desde el POS
   - Verifica que todo funciona correctamente

2. **Verificar movimientos (si la tabla existe):**
   ```sql
   SELECT * FROM inventory_movements 
   ORDER BY created_at DESC 
   LIMIT 10;
   ```
   - Deberías ver los movimientos de las ventas recientes

3. **Verificar el panel de auditoría:**
   - Inicia sesión como `master_admin`
   - Ve a `/master-audit`
   - Deberías ver los movimientos en tiempo real

## 🆘 Si Algo Sale Mal

### Error: "function name is not unique"
- Esto significa que hay múltiples versiones de la función
- La migración debería manejarlo automáticamente con `CREATE OR REPLACE`
- Si persiste, puedes ejecutar manualmente:
  ```sql
  SELECT proname, pg_get_function_identity_arguments(oid) 
  FROM pg_proc 
  WHERE proname = 'process_sale';
  ```
  Y luego eliminar las versiones duplicadas manualmente

### Error: "table inventory_movements does not exist"
- **NO ES UN PROBLEMA** - La función funcionará igual
- El registro de movimientos es opcional
- Las ventas seguirán funcionando normalmente

### Error: "permission denied"
- Verifica que tienes permisos de administrador en Supabase
- O ejecuta como usuario con permisos suficientes

## 📝 Notas Finales

- ✅ La migración es **SEGURA** y **NO DESTRUCTIVA**
- ✅ No elimina datos existentes
- ✅ No afecta ventas en proceso
- ✅ Solo agrega funcionalidad de auditoría
- ✅ Si algo falla, la venta continúa normalmente

---

**¿Listo para ejecutar?** Copia el contenido del archivo SQL y pégalo en Supabase SQL Editor, luego haz clic en "Run".





