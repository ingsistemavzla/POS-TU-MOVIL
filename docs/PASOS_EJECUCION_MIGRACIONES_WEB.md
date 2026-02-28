# Pasos para ejecutar migraciones (Storage + Redondeo Base 5)

**Contexto:** Has validado la arquitectura pero aún no aplicaste cambios.  
**Orden:** Primero Storage (imágenes), luego Base 5 (precios web).

---

## Paso 1: Abrir Supabase SQL Editor

1. Entra a **[Supabase Dashboard](https://supabase.com/dashboard)**
2. Selecciona tu proyecto
3. Menú lateral → **SQL Editor**
4. Haz clic en **+ New query**

---

## Paso 2: Ejecutar migración de Storage (imágenes)

1. Abre el archivo: `supabase/migrations/20250209200000_storage_product_images_rls.sql`
2. Copia **todo** el contenido
3. Pégalo en el SQL Editor de Supabase
4. Haz clic en **Run** (o Ctrl+Enter)
5. Verifica que aparezca **Success**

**Qué hace:** Permite que usuarios autenticados suban imágenes al bucket `product-images` (corrige el error "new row violates row-level security policy").

---

## Paso 3: Probar subida de imagen (opcional pero recomendado)

1. Entra al POS → **Gestión Web**
2. Edita un producto
3. Sube una imagen
4. Guarda

**Esperado:** La imagen se sube sin error.

---

## Paso 4: Ejecutar migración de Redondeo Base 5

1. En SQL Editor, haz clic en **+ New query** (nueva pestaña)
2. Abre el archivo: `supabase/migrations/20250209220000_get_public_web_products_catalog_base5.sql`
3. Copia **todo** el contenido
4. Pégalo en el SQL Editor
5. Haz clic en **Run**
6. Verifica **Success**

**Qué hace:** Los precios que devuelve `get_public_web_products_catalog` pasan a ser múltiplos de 5 (10, 15, 20, etc.).

---

## Paso 5: Verificar que los precios son múltiplos de 5

Ejecuta en SQL Editor:

```sql
SELECT id, name, sale_price_usd,
  (sale_price_usd::numeric % 5) AS residuo
FROM public.get_public_web_products_catalog()
ORDER BY name
LIMIT 20;
```

**Esperado:** La columna `residuo` debe ser 0 (o muy cercano por precisión numérica) en todos los productos.

---

## Paso 6: Verificar integridad POS

| Prueba | Dónde | Qué hacer |
|--------|-------|-----------|
| Ventas | POS | Realiza una venta → debe usar el precio base del producto, sin Base 5 |
| Almacén | Almacén / Artículos | Revisa el precio de un producto → debe coincidir con `products.sale_price_usd` |
| Gestión Web | Gestión Web | Edita precio de un producto y guarda → debe guardarse en BD como antes |

---

## Resumen

| Paso | Archivo / acción | Propósito |
|------|------------------|-----------|
| 1 | SQL Editor | Preparar entorno |
| 2 | `20250209200000_storage_product_images_rls.sql` | Permitir subida de imágenes |
| 3 | POS → Gestión Web | Probar subida |
| 4 | `20250209220000_get_public_web_products_catalog_base5.sql` | Redondeo Base 5 en catálogo web |
| 5 | Query de verificación | Confirmar precios Base 5 |
| 6 | Pruebas manuales | Confirmar que POS no se afecta |

---

## Si usas Supabase CLI

Alternativa a pasos 2 y 4 (copiar/pegar manualmente):

```bash
npx supabase db push
```

Esto aplica **todas** las migraciones pendientes según el orden de fechas en los nombres de archivo.
