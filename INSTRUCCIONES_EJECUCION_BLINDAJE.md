# 📋 INSTRUCCIONES EXACTAS: Ejecución del Script de Blindaje de Inventario

## 🎯 OBJETIVO
Ejecutar el script `fix_inventory_shield_final.sql` en Supabase para implementar el blindaje completo del sistema de inventario.

---

## 📝 PASOS EXACTOS

### **PASO 1: Acceder al Editor SQL de Supabase**

1. Abre tu navegador y ve a: **https://supabase.com**
2. Inicia sesión en tu cuenta de Supabase
3. Selecciona tu proyecto (el que corresponde a este POS)
4. En el menú lateral izquierdo, haz clic en **"SQL Editor"** (ícono de terminal/código)
5. Haz clic en el botón **"+ New query"** (Nueva consulta) en la parte superior

---

### **PASO 2: Abrir el Script**

1. Abre el archivo `fix_inventory_shield_final.sql` en tu editor de código (VS Code, Notepad++, etc.)
2. Selecciona **TODO el contenido** del archivo (Ctrl+A / Cmd+A)
3. **Copia** el contenido completo (Ctrl+C / Cmd+C)

---

### **PASO 3: Pegar y Ejecutar en Supabase**

1. En el Editor SQL de Supabase, **pega** el contenido copiado (Ctrl+V / Cmd+V)
2. **VERIFICA** que el script completo esté pegado (debe tener ~895 líneas)
3. Haz clic en el botón **"Run"** (Ejecutar) en la esquina inferior derecha
   - O presiona **Ctrl+Enter** (Windows/Linux) o **Cmd+Enter** (Mac)

---

### **PASO 4: Verificar Ejecución Exitosa**

**✅ Si la ejecución es exitosa, verás:**

```
✅ Módulo 1: transfer_inventory - CREADO
✅ Módulo 2: create_product_v3 - CREADO
✅ Módulo 3: process_sale - CREADO
✅ Módulo 4: Trigger on_store_created - CREADO
✅ Módulo 5: Smart Healer - EJECUTADO

🎯 BLINDAJE DE INVENTARIO COMPLETADO
Integridad Matemática: 1000%
```

**❌ Si hay errores:**

- Lee el mensaje de error completo
- Copia el mensaje de error
- Compártelo para que pueda corregirlo

---

### **PASO 5: Verificar Funciones Creadas (Opcional pero Recomendado)**

Ejecuta esta consulta para verificar que todas las funciones se crearon:

```sql
SELECT 
  proname as function_name,
  pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('transfer_inventory', 'create_product_v3', 'process_sale')
ORDER BY proname;
```

**Resultado esperado:**
- Debes ver 3 filas (una por cada función)

---

### **PASO 6: Verificar Trigger (Opcional)**

Ejecuta esta consulta para verificar que el trigger se creó:

```sql
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'on_store_created';
```

**Resultado esperado:**
- Debes ver 1 fila con el trigger `on_store_created`

---

## ⚠️ IMPORTANTE: ANTES DE EJECUTAR

### **Backup Recomendado (Opcional pero Altamente Recomendado)**

Si tienes datos importantes en producción, haz un backup antes:

1. En Supabase Dashboard, ve a **"Database"** → **"Backups"**
2. Crea un backup manual o verifica que el backup automático esté activo
3. **O** ejecuta esta consulta para exportar datos críticos:

```sql
-- Exportar productos e inventarios (ejemplo)
COPY (SELECT * FROM products) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM inventories) TO STDOUT WITH CSV HEADER;
```

---

## 🔍 QUÉ HACE EL SCRIPT (Resumen)

1. **Corrige `transfer_inventory`**: Agrega bloqueos de concurrencia y validaciones atómicas
2. **Crea `create_product_v3`**: Función que el Frontend busca, con Safety Count
3. **Corrige `process_sale`**: Agrega bloqueos para prevenir race conditions
4. **Crea Trigger**: Inicializa inventarios automáticamente al crear nuevas tiendas
5. **Ejecuta Sanación**: Repara productos huérfanos calculando stock teórico

---

## ✅ DESPUÉS DE EJECUTAR

1. **Prueba crear un producto** desde el Frontend
2. **Prueba una transferencia** entre tiendas
3. **Prueba una venta** desde el POS
4. **Verifica** que no haya errores en la consola del navegador

---

## 🆘 SI HAY ERRORES

**Error común 1: "function already exists"**
- **Solución**: El script ya intenta eliminar funciones anteriores, pero si persiste, ejecuta manualmente:
  ```sql
  DROP FUNCTION IF EXISTS public.transfer_inventory CASCADE;
  DROP FUNCTION IF EXISTS public.create_product_v3 CASCADE;
  ```
  Luego vuelve a ejecutar el script completo.

**Error común 2: "permission denied"**
- **Solución**: Asegúrate de estar usando una cuenta con permisos de administrador en Supabase.

**Error común 3: "relation does not exist"**
- **Solución**: Verifica que las tablas `inventories`, `products`, `stores`, `inventory_movements` existan.

---

## 📞 SOPORTE

Si encuentras algún error, comparte:
1. El mensaje de error completo
2. En qué línea del script falló (si aparece)
3. Qué módulo estaba ejecutando (1, 2, 3, 4 o 5)





