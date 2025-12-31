# 🔄 CREAR PUNTO DE RESTAURACIÓN - ANTES DE APLICAR ÍNDICES

## 🎯 OBJETIVO
Crear un backup/restore point antes de aplicar cambios en la base de datos (índices).

---

## 📋 OPCIONES DISPONIBLES EN SUPABASE

### Opción 1: Backup Manual desde Dashboard (RECOMENDADO) ⭐

**Ventajas:**
- ✅ Más fácil y visual
- ✅ Incluye todos los datos
- ✅ Se puede restaurar fácilmente

**Pasos:**

1. **Ir a Supabase Dashboard**
   - https://app.supabase.com
   - Seleccionar tu proyecto

2. **Ir a Settings → Database**
   - Menú lateral izquierdo
   - Settings → Database

3. **Crear Backup**
   - Buscar sección "Backups" o "Database Backups"
   - Click en "Create Backup" o "New Backup"
   - Esperar a que se complete (1-5 minutos)

4. **Verificar Backup**
   - Debe aparecer en la lista de backups
   - Anotar la fecha/hora del backup

**Nota:** Si no tienes plan Pro, esta opción puede no estar disponible.

---

### Opción 2: Exportar Estructura de Base de Datos (SIEMPRE DISPONIBLE)

**Ventajas:**
- ✅ Disponible en todos los planes
- ✅ Documenta el estado actual
- ✅ Se puede versionar en Git

**Pasos:**

1. **Ir a SQL Editor en Supabase**

2. **Ejecutar script de exportación:**

```sql
-- ============================================================================
-- EXPORTAR ESTRUCTURA DE BASE DE DATOS (SCHEMA)
-- ============================================================================
-- Este script genera el SQL necesario para recrear la estructura
-- Ejecutar y guardar el resultado
-- ============================================================================

-- 1. Exportar todas las tablas
SELECT 
    '-- Tabla: ' || tablename || E'\n' ||
    pg_get_tabledef('public.' || tablename) || E'\n\n'
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Exportar todas las funciones
SELECT 
    '-- Función: ' || proname || E'\n' ||
    pg_get_functiondef(oid) || E'\n\n'
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;

-- 3. Exportar todos los índices existentes
SELECT 
    '-- Índice: ' || indexname || E'\n' ||
    indexdef || E';\n\n'
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 4. Exportar todas las secuencias
SELECT 
    '-- Secuencia: ' || sequence_name || E'\n' ||
    'CREATE SEQUENCE IF NOT EXISTS ' || sequence_name || 
    ' START WITH ' || last_value || E';\n\n'
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;
```

3. **Guardar el resultado**
   - Copiar todo el output
   - Guardar en archivo: `backup_schema_YYYYMMDD.sql`
   - Subir a Git o guardar localmente

---

### Opción 3: Backup usando pg_dump (AVANZADO)

**Ventajas:**
- ✅ Backup completo (estructura + datos)
- ✅ Más control

**Requisitos:**
- Tener `pg_dump` instalado
- Tener conexión directa a la base de datos

**Pasos:**

1. **Obtener connection string de Supabase**
   - Settings → Database → Connection string
   - Copiar "Connection string" (URI)

2. **Ejecutar pg_dump:**

```bash
# Backup completo (estructura + datos)
pg_dump "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > backup_completo_$(date +%Y%m%d_%H%M%S).sql

# Solo estructura (sin datos)
pg_dump --schema-only "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > backup_estructura_$(date +%Y%m%d_%H%M%S).sql

# Solo datos (sin estructura)
pg_dump --data-only "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" > backup_datos_$(date +%Y%m%d_%H%M%S).sql
```

---

### Opción 4: Documentar Estado Actual (MÍNIMO)

**Ventajas:**
- ✅ Rápido (5 minutos)
- ✅ Documenta qué índices existen antes
- ✅ Permite revertir manualmente

**Pasos:**

1. **Ejecutar en SQL Editor:**

```sql
-- ============================================================================
-- DOCUMENTAR ESTADO ACTUAL - ANTES DE CREAR ÍNDICES
-- ============================================================================
-- Ejecutar y guardar el resultado
-- ============================================================================

-- 1. Listar todos los índices existentes
SELECT 
    'Índice existente: ' || indexname || E'\n' ||
    'Tabla: ' || tablename || E'\n' ||
    'Definición: ' || indexdef || E'\n\n'
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('sales', 'sale_items', 'inventories', 'products')
ORDER BY tablename, indexname;

-- 2. Contar registros en tablas principales
SELECT 
    'Tabla: ' || tablename || E'\n' ||
    'Registros: ' || n_tup_ins || E'\n\n'
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN ('sales', 'sale_items', 'inventories', 'products')
ORDER BY relname;

-- 3. Tamaño de las tablas
SELECT 
    'Tabla: ' || tablename || E'\n' ||
    'Tamaño: ' || pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) || E'\n\n'
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('sales', 'sale_items', 'inventories', 'products')
ORDER BY tablename;
```

2. **Guardar el resultado**
   - Copiar output
   - Guardar en: `estado_antes_indices_YYYYMMDD.txt`

---

## 🎯 RECOMENDACIÓN PARA TU CASO

### Para Índices (cambios seguros):

**Opción 4 (Documentar Estado) es suficiente** porque:
- ✅ Los índices son seguros (no cambian datos)
- ✅ Se pueden eliminar fácilmente si hay problemas
- ✅ Es rápido (5 minutos)

**Script mínimo:**

```sql
-- ============================================================================
-- PUNTO DE RESTAURACIÓN - ANTES DE CREAR ÍNDICES
-- Fecha: 2025-01-31
-- ============================================================================

-- 1. Listar índices existentes en tablas que vamos a modificar
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('sales', 'sale_items', 'inventories', 'products')
ORDER BY tablename, indexname;

-- 2. Guardar este resultado para referencia futura
```

**Guardar el resultado** en un archivo de texto o documentación.

---

## 🔄 CÓMO RESTAURAR (SI ES NECESARIO)

### Si algo sale mal con los índices:

**Opción A: Eliminar índices creados**

```sql
-- Eliminar índices que creamos
DROP INDEX IF EXISTS idx_sales_company_date;
DROP INDEX IF EXISTS idx_sale_items_sale_id;
DROP INDEX IF EXISTS idx_inventories_product_store;
DROP INDEX IF EXISTS idx_inventories_company_store;
DROP INDEX IF EXISTS idx_products_company_active;
-- ... etc
```

**Opción B: Restaurar desde backup (si creaste uno)**

1. Ir a Supabase Dashboard
2. Settings → Database → Backups
3. Seleccionar el backup
4. Click en "Restore"

**Opción C: Recrear estructura (si exportaste schema)**

1. Ejecutar el archivo SQL exportado
2. Esto recreará toda la estructura

---

## ✅ CHECKLIST ANTES DE APLICAR ÍNDICES

- [ ] Documentar índices existentes (Opción 4)
- [ ] Anotar fecha/hora actual
- [ ] Verificar que no hay procesos críticos ejecutándose
- [ ] Tener acceso a Supabase Dashboard
- [ ] Saber cómo eliminar índices si es necesario

---

## 📝 SCRIPT COMPLETO DE RESTAURACIÓN

```sql
-- ============================================================================
-- PUNTO DE RESTAURACIÓN COMPLETO
-- Fecha: [FECHA_ACTUAL]
-- Antes de: Crear índices de performance
-- ============================================================================

-- 1. ÍNDICES EXISTENTES
SELECT 
    '-- Índice: ' || indexname || E'\n' ||
    indexdef || E';\n\n'
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('sales', 'sale_items', 'inventories', 'products')
ORDER BY tablename, indexname;

-- 2. ESTADÍSTICAS DE TABLAS
SELECT 
    schemaname,
    tablename,
    n_live_tup as registros,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as tamaño
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND relname IN ('sales', 'sale_items', 'inventories', 'products')
ORDER BY relname;

-- 3. FUNCIONES CRÍTICAS (verificar que existen)
SELECT 
    '-- Función: ' || proname || E'\n' ||
    'EXISTS: ' || CASE WHEN oid IS NOT NULL THEN 'SÍ' ELSE 'NO' END || E'\n\n'
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('process_sale', 'delete_sale_and_restore_inventory')
ORDER BY proname;
```

---

## 🚨 IMPORTANTE

### Los índices son SEGUROS porque:
- ✅ No cambian datos
- ✅ No afectan funcionalidad
- ✅ Se pueden eliminar fácilmente
- ✅ Solo mejoran performance

### Pero es buena práctica:
- ✅ Documentar estado antes de cambios
- ✅ Saber cómo revertir
- ✅ Tener backup si es posible

---

## 🎯 PASOS RECOMENDADOS (5 MINUTOS)

1. **Abrir Supabase SQL Editor**

2. **Ejecutar script de documentación:**
   ```sql
   SELECT 
       tablename,
       indexname,
       indexdef
   FROM pg_indexes
   WHERE schemaname = 'public'
     AND tablename IN ('sales', 'sale_items', 'inventories', 'products')
   ORDER BY tablename, indexname;
   ```

3. **Copiar y guardar el resultado**
   - En un archivo de texto
   - O en un comentario en Git

4. **Listo para aplicar índices** ✅

---

**¿Quieres que creemos el script SQL completo para documentar el estado actual?**

