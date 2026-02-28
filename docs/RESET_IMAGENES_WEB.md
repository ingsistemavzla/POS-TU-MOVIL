# Reset completo de imágenes web

Guía para limpiar todas las imágenes subidas en Supabase Storage y resetear los metadatos en la base de datos. Útil para empezar con un catálogo limpio.

---

## Estructura actual

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| **Storage** | `product-images/{company_id}/{product_id}.{ext}` | Archivos físicos en Supabase Storage |
| **Metadatos** | `web_product_metadata.image_url` | URL almacenada por producto |
| **Metadatos** | `web_product_metadata.visible` | Visibilidad en catálogo web |

---

## Pasos para reset completo

### Paso 1: Vaciar el bucket `product-images` (Storage)

**Opción A – Script Node (recomendado):**

```bash
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key node scripts/reset-web-product-images.js
```

O usando npm:

```bash
SUPABASE_SERVICE_ROLE_KEY=tu_key npm run reset:web-images
```

**Opción B – Supabase Dashboard:**

1. Ir a **Storage** → bucket `product-images`
2. Entrar en cada carpeta (company_id) y borrar los archivos
3. O borrar el bucket completo y recrearlo como público (si no hay otros datos)

---

### Paso 2: Limpiar metadatos en la base de datos

1. Ir a **SQL Editor** en Supabase
2. Ejecutar el contenido de `sql/RESET_WEB_IMAGES_metadata.sql`:

```sql
BEGIN;
UPDATE public.web_product_metadata
SET 
  image_url = NULL,
  visible = false,
  updated_at = NOW()
WHERE image_url IS NOT NULL OR visible = true;
COMMIT;
```

---

### Paso 3: Verificación

- **Storage:** bucket `product-images` vacío o sin imágenes de productos
- **Base de datos:** `web_product_metadata` con `image_url = NULL` y `visible = false` en los productos afectados
- **POS / Gestión Web:** productos sin imagen y ocultos en el catálogo web

---

## Requisitos del script

- Node.js 18+
- Variable de entorno `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → service_role)
- Opcional: `SUPABASE_URL` si el proyecto usa otra URL

---

## Notas

1. El script de Storage usa **service_role** porque las políticas de Storage pueden restringir el borrado.
2. El orden recomendado es: primero vaciar Storage, luego limpiar metadatos.
3. Si solo se limpia la BD, las URLs seguirán apuntando a archivos que ya no existen.
4. Si solo se vacía Storage, la BD seguirá con referencias a archivos inexistentes; el POS no mostrará las imágenes.
