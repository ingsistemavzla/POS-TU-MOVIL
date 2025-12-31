# 🗺️ HOJA DE RUTA: Aplicación Limpia de Correcciones IMEI e Impresión

## 📋 OBJETIVO
Aplicar las correcciones de IMEI e impresión de forma segura, sin afectar funcionalidades críticas del sistema.

---

## ✅ VERIFICACIÓN PREVIA: Funcionalidades Críticas que NO deben afectarse

### 1. Gestión de Stock
- ✅ Actualización de stock al procesar venta
- ✅ Validación de stock antes de vender
- ✅ Bloqueo pesimista (SELECT FOR UPDATE)
- ✅ Reintegración de stock al eliminar venta

### 2. Procesamiento de Ventas
- ✅ Generación de número de factura
- ✅ Cálculo de totales (USD y BS)
- ✅ Registro de pagos
- ✅ Manejo de financiamiento (Krece/Cashea)
- ✅ Pagos mixtos

### 3. Facturación
- ✅ Impresión de facturas térmicas
- ✅ Generación de PDF
- ✅ Envío por correo

### 4. Reportes y Consultas
- ✅ Historial de ventas
- ✅ Reportes por categoría
- ✅ Reportes por sucursal
- ✅ Exportación de datos

### 5. Integraciones
- ✅ Relaciones entre tablas (sales, sale_items, inventories, products)
- ✅ Integridad referencial
- ✅ Balances financieros

---

## 🔍 ANÁLISIS DE IMPACTO DE LA MIGRACIÓN SQL

### Cambio en `process_sale`: Agregar campo `imei` al INSERT

**Línea modificada:** 273-282 en `20250131000001_fix_process_sale_stock_validation.sql`

```sql
-- ANTES:
INSERT INTO sale_items (
    sale_id, product_id, product_name, product_sku, qty, price_usd, subtotal_usd
) VALUES (...);

-- DESPUÉS:
INSERT INTO sale_items (
    sale_id, product_id, product_name, product_sku, qty, price_usd, subtotal_usd, imei
) VALUES (..., CASE WHEN ... THEN NULL ELSE ... END);
```

### ✅ VERIFICACIÓN DE IMPACTO

#### ✅ NO AFECTA:
1. **Stock Management:**
   - El INSERT de `sale_items` es INDEPENDIENTE de la actualización de stock
   - La actualización de `inventories` ocurre ANTES del INSERT (línea 263-269)
   - El bloqueo pesimista NO se ve afectado

2. **Procesamiento de Ventas:**
   - El cálculo de totales ocurre ANTES del loop de items (líneas 104-130)
   - La generación de factura NO depende de `sale_items` (línea 162)
   - Los pagos se registran DESPUÉS de los items (líneas 317-342)

3. **Funciones de Eliminación:**
   - `delete_sale_and_restore_inventory` lee `sale_items` pero NO depende del campo `imei`
   - La reintegración de stock usa `qty` que NO se modifica

4. **Reportes:**
   - Las consultas pueden incluir o excluir `imei` sin afectar otros campos
   - Los cálculos de totales NO dependen de `imei`

5. **Integridad de Datos:**
   - El campo `imei` es NULLABLE (permite NULL)
   - NO tiene constraints que afecten otras operaciones
   - NO es clave foránea ni índice único

#### ⚠️ CONSIDERACIONES:
- Las ventas anteriores tendrán `imei = NULL` (esperado)
- Las consultas deben manejar NULL correctamente (ya implementado con fallback)

---

## 📦 PASO 1: DESCARGAR VERSIÓN ESTABLE

### 1.1 Verificar estado actual
```bash
git status
git log --oneline -10
```

### 1.2 Identificar rama estable
- **Rama de producción:** `main` o `master`
- **Rama de pruebas:** `prueba`

### 1.3 Guardar cambios locales (si existen)
```bash
# Crear backup de cambios locales
git stash push -m "backup_cambios_locales_antes_de_limpiar"
```

### 1.4 Limpiar directorio de trabajo
```bash
# Verificar que no hay cambios sin commitear
git status

# Si hay cambios, decidir: commitear o descartar
# Para descartar cambios locales:
git reset --hard HEAD
git clean -fd
```

### 1.5 Traer versión estable de la nube
```bash
# Asegurarse de estar en la rama correcta
git checkout main  # o la rama que corresponda

# Traer última versión
git fetch origin
git pull origin main

# Verificar que está limpio
git status
```

---

## 📝 PASO 2: PREPARAR ARCHIVOS DE DESPLIEGUE

### 2.1 Crear carpeta de despliegue
```bash
mkdir despliegue_imei_impresion
cd despliegue_imei_impresion
```

### 2.2 Copiar archivos necesarios

#### Archivos SQL (Base de Datos):
1. `crear_campo_imei.sql` - Crear campo IMEI
2. `supabase/migrations/20250131000001_fix_process_sale_stock_validation.sql` - Migración completa

#### Archivos Frontend (ya están en el código):
1. `src/pages/SalesPage.tsx`
2. `src/components/sales/SaleDetailModal.tsx`
3. `src/lib/reports/salesReport.ts`
4. `src/utils/pdfGenerator.ts`

### 2.3 Crear script de verificación
```sql
-- verificar_antes_aplicar.sql
-- Ejecutar ANTES de aplicar cambios
```

---

## 🔧 PASO 3: APLICAR CORRECCIONES EN ORDEN

### 3.1 Base de Datos - Paso 1: Crear Campo IMEI

**Archivo:** `crear_campo_imei.sql`

**Ejecutar en Supabase SQL Editor:**
```sql
-- 1. Verificar que el campo NO existe
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'sale_items' AND column_name = 'imei';

-- 2. Si no existe, crear el campo
ALTER TABLE public.sale_items 
ADD COLUMN IF NOT EXISTS imei TEXT DEFAULT NULL;

-- 3. Crear índice
CREATE INDEX IF NOT EXISTS idx_sale_items_imei 
ON public.sale_items(imei) 
WHERE imei IS NOT NULL;

-- 4. Verificar que se creó
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sale_items' AND column_name = 'imei';
```

**✅ Verificación esperada:**
- Campo `imei` existe
- Tipo: TEXT
- Nullable: YES
- Índice creado

---

### 3.2 Base de Datos - Paso 2: Aplicar Migración Completa

**Archivo:** `supabase/migrations/20250131000001_fix_process_sale_stock_validation.sql`

**⚠️ IMPORTANTE:** Esta migración reemplaza la función `process_sale` completa.

**Ejecutar en Supabase SQL Editor:**
- Copiar TODO el contenido del archivo
- Ejecutar completo
- Verificar que no hay errores

**✅ Verificación esperada:**
- Función `process_sale` actualizada
- El INSERT incluye campo `imei`
- No hay errores de sintaxis

**Verificar función actualizada:**
```sql
SELECT 
    CASE 
        WHEN pg_get_functiondef(oid) LIKE '%imei%' THEN '✅ IMEI incluido'
        ELSE '❌ IMEI NO incluido'
    END as estado_imei
FROM pg_proc
WHERE proname = 'process_sale'
ORDER BY oid DESC
LIMIT 1;
```

---

### 3.3 Frontend - Paso 3: Aplicar Cambios de Código

**Los archivos ya están modificados en el código local.**

**Verificar que los cambios están presentes:**

1. **`src/pages/SalesPage.tsx`:**
   - Línea 873-922: Consulta con fallback para IMEI
   - Línea 1727-1734: Visualización de IMEI en tabla

2. **`src/components/sales/SaleDetailModal.tsx`:**
   - Línea 396-442: Función `handlePrintInvoice` corregida
   - Línea 836-853: Botón "Imprimir Factura" agregado
   - Línea 810-814: Visualización de IMEI

3. **`src/lib/reports/salesReport.ts`:**
   - Línea 115-134: Resumen por categorías con IMEI
   - Línea 380-393: Items con IMEI en reporte

4. **`src/utils/pdfGenerator.ts`:**
   - Línea 754-783: Items con IMEI en PDF

**Si los cambios NO están, aplicar manualmente desde el resumen.**

---

## 🧪 PASO 4: PRUEBAS DE VERIFICACIÓN

### 4.1 Prueba 1: Verificar Campo IMEI
```sql
-- Ejecutar en Supabase
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'sale_items' AND column_name = 'imei';
-- Debe retornar: imei | text
```

### 4.2 Prueba 2: Verificar Función process_sale
```sql
-- Verificar que incluye IMEI
SELECT 
    CASE 
        WHEN pg_get_functiondef(oid) LIKE '%imei%' THEN '✅ OK'
        ELSE '❌ FALTA'
    END
FROM pg_proc WHERE proname = 'process_sale';
```

### 4.3 Prueba 3: Procesar Venta de Prueba
1. Ir al POS
2. Agregar un teléfono al carrito
3. Ingresar IMEI
4. Procesar venta
5. Verificar en base de datos:
```sql
SELECT id, product_name, imei 
FROM sale_items 
WHERE sale_id = '[ID_DE_LA_VENTA]';
```

### 4.4 Prueba 4: Verificar Visualización
1. Ir a Panel de Gestión de Ventas
2. Expandir la venta de prueba
3. Verificar que el IMEI aparece: `"Producto (IMEI)"`

### 4.5 Prueba 5: Verificar Impresión
1. Abrir modal de detalles de venta
2. Hacer clic en "Imprimir Factura"
3. Verificar que se abre la ventana de impresión

### 4.6 Prueba 6: Verificar Funcionalidades Críticas

#### Stock:
```sql
-- Verificar que el stock se actualiza correctamente
SELECT product_id, qty 
FROM inventories 
WHERE product_id = '[ID_PRODUCTO_PRUEBA]';
```

#### Eliminación de Venta:
1. Eliminar la venta de prueba
2. Verificar que el stock se reintegra:
```sql
SELECT qty 
FROM inventories 
WHERE product_id = '[ID_PRODUCTO_PRUEBA]';
```

#### Reportes:
1. Generar reporte PDF
2. Verificar que incluye IMEI en productos de teléfonos

---

## 📋 CHECKLIST DE VERIFICACIÓN FINAL

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
- [ ] Stock se actualiza correctamente al vender
- [ ] Stock se reintegra al eliminar venta
- [ ] Facturación funciona correctamente
- [ ] Reportes generan correctamente
- [ ] Financiamiento (Krece/Cashea) funciona
- [ ] Pagos mixtos funcionan

---

## 🚨 ROLLBACK (Si algo falla)

### Revertir Campo IMEI:
```sql
-- SOLO si es necesario revertir
ALTER TABLE public.sale_items DROP COLUMN IF EXISTS imei;
DROP INDEX IF EXISTS idx_sale_items_imei;
```

### Revertir Función:
- Restaurar desde backup de la función anterior
- O aplicar migración anterior

### Revertir Frontend:
```bash
git checkout HEAD -- src/pages/SalesPage.tsx
git checkout HEAD -- src/components/sales/SaleDetailModal.tsx
git checkout HEAD -- src/lib/reports/salesReport.ts
git checkout HEAD -- src/utils/pdfGenerator.ts
```

---

## 📝 NOTAS FINALES

1. **Las ventas anteriores NO tendrán IMEI** (esperado, el campo no existía)
2. **Solo las nuevas ventas** tendrán IMEI guardado
3. **El frontend maneja NULL** correctamente (no rompe si no hay IMEI)
4. **Todas las funcionalidades críticas se mantienen intactas**

---

## 🎯 ORDEN DE EJECUCIÓN RECOMENDADO

1. ✅ Descargar versión estable
2. ✅ Crear campo IMEI (SQL)
3. ✅ Aplicar migración completa (SQL)
4. ✅ Verificar función actualizada
5. ✅ Probar venta de prueba
6. ✅ Verificar visualización
7. ✅ Verificar impresión
8. ✅ Verificar funcionalidades críticas
9. ✅ Commit y push

---

**Fecha de creación:** 2025-01-31
**Versión:** 1.0
**Estado:** Listo para ejecución

