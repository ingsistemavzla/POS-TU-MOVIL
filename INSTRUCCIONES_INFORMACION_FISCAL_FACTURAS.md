# Configuración de Información Fiscal en Facturas

## Descripción del Problema

Las facturas del sistema POS deben mostrar en el header la información fiscal de la tienda que está seleccionada o que tiene asignada el cajero. Esta información incluye:

- **RIF**: Número de identificación fiscal de la tienda
- **Razón Social**: Nombre legal de la empresa
- **Nombre de la Tienda**: Nombre comercial de la tienda
- **Dirección Fiscal**: Dirección legal de la tienda
- **Teléfono Fiscal**: Teléfono de contacto fiscal
- **Email Fiscal**: Email de contacto fiscal

## Solución Implementada

### 1. Estructura de la Base de Datos

La tabla `stores` ya tiene los campos necesarios para la información fiscal:

```sql
-- Campos agregados por la migración 20250827200000_add_fiscal_info_to_stores.sql
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS business_name VARCHAR(255),      -- Razón Social
ADD COLUMN IF NOT EXISTS tax_id VARCHAR(20),              -- RIF
ADD COLUMN IF NOT EXISTS fiscal_address TEXT,             -- Dirección Fiscal
ADD COLUMN IF NOT EXISTS phone_fiscal VARCHAR(20),        -- Teléfono Fiscal
ADD COLUMN IF NOT EXISTS email_fiscal VARCHAR(255);       -- Email Fiscal
```

### 2. Asignación de Tiendas a Usuarios

Los usuarios tienen un campo `assigned_store_id` que determina a qué tienda están asignados:

```sql
-- Agregado por la migración 20250827042900_enforce_store_assignment.sql
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS assigned_store_id uuid REFERENCES public.stores(id);
```

### 3. Lógica de Obtención de Información

En el archivo `src/pages/POS.tsx`, se implementó la siguiente lógica:

1. **Verificar tienda asignada**: Se busca la tienda asignada al usuario cajero
2. **Obtener información fiscal**: Se consulta la tabla `stores` para obtener todos los datos fiscales
3. **Fallback**: Si no hay tienda asignada, se busca la primera tienda activa de la empresa
4. **Logging**: Se agregaron console.log para debuggear el proceso

### 4. Generación de Facturas

En el archivo `src/utils/printInvoice.ts`, se implementó:

1. **Header mejorado**: Se muestra toda la información fiscal disponible
2. **Manejo robusto**: Se verifica que la información exista antes de mostrarla
3. **Estilos optimizados**: Se mejoró la presentación visual de la información fiscal

## Pasos para Configurar

### Paso 1: Verificar Migraciones

Asegúrate de que las siguientes migraciones estén aplicadas:

```bash
# Verificar que existan estos archivos:
supabase/migrations/20250827042900_enforce_store_assignment.sql
supabase/migrations/20250827200000_add_fiscal_info_to_stores.sql
```

### Paso 2: Configurar Información Fiscal de la Tienda

1. Ve a la página de **Configuración** → **Tiendas**
2. Selecciona la tienda que quieres configurar
3. Completa los siguientes campos:
   - **Razón Social**: Nombre legal de la empresa
   - **RIF**: Número de identificación fiscal
   - **Dirección Fiscal**: Dirección legal completa
   - **Teléfono Fiscal**: Teléfono de contacto
   - **Email Fiscal**: Email de contacto

### Paso 3: Asignar Tienda al Usuario

1. Ve a la página de **Usuarios**
2. Selecciona el usuario cajero
3. Asigna la tienda correspondiente en el campo **Tienda Asignada**

### Paso 4: Verificar Funcionamiento

1. Inicia sesión como cajero
2. Realiza una venta
3. Imprime la factura
4. Verifica que aparezca la información fiscal en el header

## Debugging

### Console Logs

El sistema incluye logs detallados para debuggear:

```javascript
// En la consola del navegador verás:
console.log('Verificando información de la tienda para el usuario:', {...});
console.log('Obteniendo información de la tienda con ID:', storeId);
console.log('Respuesta de la consulta de tienda:', {storeData, storeError});
console.log('Información de la tienda obtenida exitosamente:', storeInfo);
```

### Verificación de Datos

Para verificar que los datos estén correctos:

```sql
-- Verificar información de la tienda
SELECT id, name, business_name, tax_id, fiscal_address, phone_fiscal, email_fiscal 
FROM stores 
WHERE id = 'ID_DE_LA_TIENDA';

-- Verificar usuario asignado
SELECT id, name, assigned_store_id 
FROM users 
WHERE id = 'ID_DEL_USUARIO';
```

## Problemas Comunes

### 1. No aparece información fiscal

**Causa**: La tienda no tiene información fiscal configurada
**Solución**: Completar los campos fiscales en la configuración de la tienda

### 2. Usuario sin tienda asignada

**Causa**: El usuario no tiene `assigned_store_id` configurado
**Solución**: Asignar una tienda al usuario en la configuración

### 3. Información parcial

**Causa**: Solo algunos campos fiscales están completados
**Solución**: Completar todos los campos fiscales necesarios

### 4. Error de permisos

**Causa**: El usuario no tiene permisos para ver la información de la tienda
**Solución**: Verificar las políticas RLS en la tabla `stores`

## Estructura de la Factura

La factura ahora muestra la información fiscal en el siguiente orden:

```
[LOGO]
RIF: J-12345678-9
RAZÓN SOCIAL DE LA EMPRESA
Nombre de la Tienda (si es diferente)
Dirección Fiscal Completa
Tel: +58 212 123 4567
Email: fiscal@empresa.com
FACTURA #FAC-20250101-1234
```

## Notas Técnicas

- **Tipos TypeScript**: Los tipos actuales no incluyen `assigned_store_id`, se usa `any` temporalmente
- **Fallback**: Si no hay tienda asignada, se busca la primera tienda activa de la empresa
- **Validación**: Se valida que la información exista antes de mostrarla
- **Estilos**: Se optimizaron los estilos para máxima legibilidad en impresoras térmicas

## Próximos Pasos

1. **Actualizar tipos TypeScript**: Regenerar los tipos después de aplicar las migraciones
2. **Validación de datos**: Agregar validación en el frontend para campos fiscales obligatorios
3. **Plantillas personalizables**: Permitir personalizar el diseño de las facturas
4. **Múltiples formatos**: Soporte para diferentes formatos de factura (A4, térmica, etc.)
