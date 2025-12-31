# 📋 INSTRUCCIONES PARA EJECUCIÓN LIMPIA DE CORRECCIONES

## 🎯 OBJETIVO
Aplicar correcciones de IMEI e impresión de forma segura, sin afectar funcionalidades críticas.

---

## ✅ VERIFICACIÓN DE SEGURIDAD

### Análisis de Impacto del Campo IMEI

#### ✅ NO AFECTA Funcionalidades Críticas:

1. **Gestión de Stock:**
   - ✅ El campo `imei` es NULLABLE (permite NULL)
   - ✅ NO es clave foránea
   - ✅ NO tiene constraints que afecten otras operaciones
   - ✅ La actualización de stock ocurre ANTES del INSERT de sale_items
   - ✅ El bloqueo pesimista (SELECT FOR UPDATE) NO se ve afectado

2. **Función `delete_sale_and_restore_inventory`:**
   - ✅ Lee `sale_items` pero NO depende del campo `imei`
   - ✅ Solo usa `qty` para reintegrar stock
   - ✅ La reintegración de stock NO se ve afectada

3. **Procesamiento de Ventas:**
   - ✅ Cálculo de totales ocurre ANTES del loop de items
   - ✅ Generación de factura NO depende de sale_items
   - ✅ Registro de pagos ocurre DESPUÉS de items

4. **Reportes y Consultas:**
   - ✅ Las consultas pueden incluir o excluir `imei` sin afectar otros campos
   - ✅ Los cálculos NO dependen de `imei`

---

## 📦 PASO 1: PREPARAR ENTORNO LIMPIO

### 1.1 Verificar Estado Actual
```bash
# Ver qué cambios hay localmente
git status

# Ver últimos commits
git log --oneline -10
```

### 1.2 Identificar Rama Estable
- **Rama de producción:** `main` o `master`
- **Rama de pruebas:** `prueba`

### 1.3 Guardar Cambios Locales (si existen)
```bash
# Si hay cambios importantes, guardarlos
git stash push -m "backup_cambios_locales_$(date +%Y%m%d_%H%M%S)"
```

### 1.4 Limpiar Directorio de Trabajo
```bash
# Descartar TODOS los cambios locales (CUIDADO: esto elimina cambios no guardados)
git reset --hard HEAD

# Limpiar archivos no rastreados
git clean -fd

# Verificar que está limpio
git status
# Debe mostrar: "nothing to commit, working tree clean"
```

### 1.5 Traer Versión Estable de la Nube
```bash
# Asegurarse de estar en la rama correcta
git checkout main  # o la rama que corresponda

# Traer última versión de la nube
git fetch origin
git pull origin main

# Verificar que está actualizado
git status
git log --oneline -1
```

---

## 📝 PASO 2: PREPARAR ARCHIVOS DE DESPLIEGUE

### 2.1 Crear Carpeta de Despliegue
```bash
# Crear carpeta
mkdir despliegue_imei_impresion
cd despliegue_imei_impresion

# Crear subcarpetas
mkdir sql
mkdir frontend
```

### 2.2 Copiar Archivos SQL

#### Archivo 1: Crear Campo IMEI
**Origen:** `crear_campo_imei.sql`  
**Destino:** `sql/01_crear_campo_imei.sql`

**Contenido a copiar:**
```sql
-- ✅ PASO 1: Crear campo IMEI en sale_items
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que el campo NO existe
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'sale_items' AND column_name = 'imei';

-- 2. Crear el campo
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS imei TEXT DEFAULT NULL;

-- 3. Agregar comentario
COMMENT ON COLUMN public.sale_items.imei IS 'IMEI del teléfono vendido (solo para productos de categoría phones)';

-- 4. Crear índice
CREATE INDEX IF NOT EXISTS idx_sale_items_imei 
ON public.sale_items(imei) 
WHERE imei IS NOT NULL;

-- 5. Verificar que se creó
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sale_items' AND column_name = 'imei';
```

#### Archivo 2: Migración Completa
**Origen:** `supabase/migrations/20250131000001_fix_process_sale_stock_validation.sql`  
**Destino:** `sql/02_aplicar_migracion_process_sale.sql`

**⚠️ IMPORTANTE:** Copiar TODO el contenido del archivo completo.

### 2.3 Crear Script de Verificación
**Archivo:** `sql/03_verificar_aplicacion.sql`

```sql
-- ✅ VERIFICACIÓN POST-APLICACIÓN
-- Ejecutar DESPUÉS de aplicar las migraciones

-- 1. Verificar que el campo existe
SELECT 
    'Campo IMEI' as verificacion,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ EXISTE'
        ELSE '❌ NO EXISTE'
    END as resultado
FROM information_schema.columns
WHERE table_name = 'sale_items' AND column_name = 'imei';

-- 2. Verificar que la función incluye IMEI
SELECT 
    'Función process_sale' as verificacion,
    CASE 
        WHEN pg_get_functiondef(oid) LIKE '%imei%' THEN '✅ IMEI INCLUIDO'
        ELSE '❌ IMEI NO INCLUIDO'
    END as resultado
FROM pg_proc
WHERE proname = 'process_sale'
ORDER BY oid DESC
LIMIT 1;

-- 3. Verificar estructura de sale_items
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'sale_items'
ORDER BY ordinal_position;
```

---

## 🔧 PASO 3: APLICAR CORRECCIONES EN ORDEN

### 3.1 Base de Datos - Paso 1: Crear Campo IMEI

**Archivo:** `sql/01_crear_campo_imei.sql`

**Acción:**
1. Abrir Supabase Dashboard
2. Ir a SQL Editor
3. Copiar y pegar el contenido de `01_crear_campo_imei.sql`
4. Ejecutar
5. Verificar que no hay errores

**✅ Resultado Esperado:**
- Mensaje: "ALTER TABLE" ejecutado exitosamente
- La última consulta debe mostrar: `imei | text | YES`

**⚠️ Si hay error:**
- Si dice "column already exists" → OK, el campo ya existe
- Si hay otro error → Detener y revisar

---

### 3.2 Base de Datos - Paso 2: Aplicar Migración Completa

**Archivo:** `sql/02_aplicar_migracion_process_sale.sql`

**⚠️ CRÍTICO:** Esta migración reemplaza la función `process_sale` completa.

**Acción:**
1. Abrir Supabase Dashboard
2. Ir a SQL Editor
3. Copiar TODO el contenido de `02_aplicar_migracion_process_sale.sql`
4. Revisar que el INSERT incluye `imei` (líneas 273-282)
5. Ejecutar
6. Verificar que no hay errores

**✅ Resultado Esperado:**
- Mensaje: "CREATE OR REPLACE FUNCTION" ejecutado exitosamente
- No hay errores de sintaxis

**⚠️ Si hay error:**
- Revisar el mensaje de error
- Verificar que la función anterior existe
- Verificar permisos

---

### 3.3 Base de Datos - Paso 3: Verificar Aplicación

**Archivo:** `sql/03_verificar_aplicacion.sql`

**Acción:**
1. Ejecutar el script de verificación
2. Verificar que ambos resultados muestran "✅"

**✅ Resultado Esperado:**
```
verificacion          | resultado
----------------------|------------------
Campo IMEI            | ✅ EXISTE
Función process_sale  | ✅ IMEI INCLUIDO
```

---

### 3.4 Frontend - Paso 4: Verificar Cambios en Código

**Los cambios ya están en el código local. Verificar que están presentes:**

#### Archivo 1: `src/pages/SalesPage.tsx`
**Verificar líneas 873-922:**
- Debe tener consulta con fallback para IMEI
- Debe tener `imeiMap` y mapeo de IMEIs

**Verificar líneas 1727-1734:**
- Debe mostrar IMEI junto al nombre del producto

#### Archivo 2: `src/components/sales/SaleDetailModal.tsx`
**Verificar líneas 396-442:**
- Función `handlePrintInvoice` debe usar `sale.invoice_number`

**Verificar líneas 836-853:**
- Debe tener botón "Imprimir Factura" con icono Printer

**Verificar líneas 810-814:**
- Debe mostrar IMEI en la tabla de items

#### Archivo 3: `src/lib/reports/salesReport.ts`
**Verificar líneas 380-393:**
- Debe incluir IMEI en el nombre del producto para teléfonos

#### Archivo 4: `src/utils/pdfGenerator.ts`
**Verificar líneas 754-783:**
- Debe incluir IMEI en items del PDF

**Si los cambios NO están:**
- Aplicar manualmente desde `RESUMEN_CAMBIOS_IMEI_IMPRESION.md`

---

## 🧪 PASO 4: PRUEBAS DE VERIFICACIÓN

### 4.1 Prueba de Venta con IMEI

1. **Ir al POS**
2. **Agregar un teléfono al carrito**
3. **Ingresar IMEI** (15 dígitos)
4. **Procesar la venta**
5. **Verificar en base de datos:**
```sql
SELECT id, product_name, imei, qty
FROM sale_items 
WHERE sale_id = '[ID_DE_LA_VENTA]';
```
**✅ Debe mostrar el IMEI ingresado**

### 4.2 Prueba de Visualización

1. **Ir a Panel de Gestión de Ventas**
2. **Expandir la venta de prueba**
3. **Verificar que aparece:** `"Producto (IMEI)"`
**✅ El IMEI debe aparecer junto al nombre**

### 4.3 Prueba de Impresión

1. **Abrir modal de detalles de la venta**
2. **Hacer clic en "Imprimir Factura"**
3. **Verificar que se abre ventana de impresión**
**✅ Debe abrirse el diálogo de impresión**

### 4.4 Prueba de Funcionalidades Críticas

#### Stock:
```sql
-- Antes de la venta
SELECT qty FROM inventories WHERE product_id = '[ID_PRODUCTO]';

-- Después de la venta
SELECT qty FROM inventories WHERE product_id = '[ID_PRODUCTO]';
-- ✅ Debe haber disminuido en la cantidad vendida
```

#### Eliminación de Venta:
1. **Eliminar la venta de prueba**
2. **Verificar que el stock se reintegra:**
```sql
SELECT qty FROM inventories WHERE product_id = '[ID_PRODUCTO]';
-- ✅ Debe volver al valor original
```

#### Reportes:
1. **Generar reporte PDF**
2. **Verificar que incluye IMEI** en productos de teléfonos
**✅ El IMEI debe aparecer en el PDF**

---

## 📋 CHECKLIST FINAL

### Base de Datos
- [ ] Campo `imei` existe en `sale_items`
- [ ] Función `process_sale` incluye IMEI en INSERT
- [ ] Índice `idx_sale_items_imei` creado
- [ ] No hay errores en la función

### Frontend
- [ ] IMEI se muestra en panel de gestión
- [ ] IMEI se muestra en modal de detalles
- [ ] Botón "Imprimir Factura" funciona
- [ ] IMEI aparece en reportes PDF

### Funcionalidades Críticas
- [ ] Stock se actualiza al vender
- [ ] Stock se reintegra al eliminar venta
- [ ] Facturación funciona
- [ ] Reportes generan correctamente
- [ ] Financiamiento (Krece/Cashea) funciona
- [ ] Pagos mixtos funcionan

---

## 🚨 ROLLBACK (Si algo falla)

### Revertir Campo IMEI:
```sql
-- SOLO si es necesario
ALTER TABLE public.sale_items DROP COLUMN IF EXISTS imei;
DROP INDEX IF EXISTS idx_sale_items_imei;
```

### Revertir Función:
- Restaurar función anterior desde backup
- O aplicar migración anterior

### Revertir Frontend:
```bash
git checkout HEAD -- src/pages/SalesPage.tsx
git checkout HEAD -- src/components/sales/SaleDetailModal.tsx
git checkout HEAD -- src/lib/reports/salesReport.ts
git checkout HEAD -- src/utils/pdfGenerator.ts
```

---

## 📝 NOTAS IMPORTANTES

1. **Las ventas anteriores NO tendrán IMEI** (esperado)
2. **Solo las nuevas ventas** tendrán IMEI guardado
3. **El frontend maneja NULL** correctamente
4. **Todas las funcionalidades críticas se mantienen intactas**

---

## 🎯 ORDEN DE EJECUCIÓN

1. ✅ Limpiar directorio de trabajo
2. ✅ Traer versión estable de la nube
3. ✅ Crear campo IMEI (SQL)
4. ✅ Aplicar migración completa (SQL)
5. ✅ Verificar aplicación (SQL)
6. ✅ Verificar código frontend
7. ✅ Probar venta con IMEI
8. ✅ Verificar visualización
9. ✅ Verificar impresión
10. ✅ Verificar funcionalidades críticas
11. ✅ Commit y push (si todo está bien)

---

**Fecha:** 2025-01-31  
**Versión:** 1.0  
**Estado:** Listo para ejecución limpia

