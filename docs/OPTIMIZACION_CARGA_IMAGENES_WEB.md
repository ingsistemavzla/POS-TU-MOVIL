# Optimización de carga de imágenes en el catálogo web

**Objetivo:** Reducir tiempo de carga inicial, sobre todo en móviles, sin tocar la base de datos. Reparto de tareas: **Cursor POS** (backend/datos) y **Cursor Web** (frontend).

---

## 1. Qué envía hoy el POS (sin cambios)

- La RPC `get_public_web_products_catalog()` devuelve **`web_image_url`**: URL pública de Supabase Storage (bucket `product-images`).
- Formato típico: `https://[project].supabase.co/storage/v1/object/public/product-images/[company_id]/[product_id].[ext]`
- No hay thumbnails ni variantes por tamaño; una sola URL por producto.

---

## 2. Qué puede hacer Cursor POS (este repo)

### 2.1 Documentar y mantener el contrato

- Dejar claro que `web_image_url` es la URL final de la imagen (lista para usar en `<img src>`).
- Si en el futuro se suben imágenes más livianas o se usa un CDN, documentarlo aquí y en el contrato de la API.

### 2.2 Recomendaciones al subir imágenes (panel Gestión Web)

- **Tamaño razonable:** Subir imágenes ya redimensionadas (ej. ancho máximo 800–1200 px) para que el origen no pese de más. No es obligatorio cambiar código; puede ser guía para quien sube fotos.
- **Formato:** Preferir JPG/WebP para fotos; PNG solo si hace falta transparencia.

### 2.3 (Opcional) URLs de imagen transformada (Supabase Pro)

- Supabase ofrece **Image Transformations** (plan Pro): redimensionar y optimizar por URL.
- URL de transformación: sustituir en la URL pública  
  `.../storage/v1/object/public/...`  
  por  
  `.../storage/v1/render/image/public/...`  
  y añadir query params, por ejemplo:  
  `?width=400&height=400&resize=cover&quality=80`
- Si el proyecto tiene Pro y quieren usar esto, el POS podría **opcionalmente** exponer en la RPC una segunda columna (ej. `web_image_thumbnail_url`) con esa URL ya construida; si no, la web puede construirla a partir de `web_image_url` (ver siguiente sección).

**Resumen POS:** No es obligatorio cambiar RPC ni BD. Con documentar el contrato y, si aplica, una URL de thumbnail o transformación, basta para que la web optimice.

---

## 3. Qué debe hacer Cursor Web (frontend)

Esto es lo que más reduce la carga, sobre todo en móvil.

### 3.1 Lazy loading

- Añadir **`loading="lazy"`** a todas las `<img>` del catálogo que no estén above-the-fold.
- Las primeras 4–6 imágenes (las visibles al abrir) pueden ir **sin** `loading="lazy"` o con `loading="eager"` para que carguen ya.

### 3.2 Prioridad de carga

- Primera fila de productos: **`fetchpriority="high"`** (o no poner `fetchpriority` en el resto).
- Resto de imágenes: **`fetchpriority="low"** para que el navegador no compita con el contenido crítico.

### 3.3 Decodificado asíncrono

- Usar **`decoding="async"`** en las imágenes del listado para no bloquear el pintado.

### 3.4 Evitar salto de layout (CLS)

- Dar a las imágenes **width/height** o un **contenedor con aspect-ratio** (ej. `aspect-ratio: 1` para cuadradas) para reservar espacio y que no muevan el contenido al cargar.
- Opcional: placeholder (color, skeleton o blur) hasta que cargue la imagen.

### 3.5 Imágenes responsivas (srcset) si usan URL transformada

Si construyen la URL de Supabase transformada a partir de `web_image_url`:

- Sustituir `.../object/public/...` por `.../render/image/public/...` y añadir parámetros.
- Ejemplo para varias densidades:
  - `?width=400` (1x)
  - `?width=800` (2x)
- Usar **`srcset`** y **`sizes`** para que móvil pida 400px y desktop 800px (o similar según diseño).

Ejemplo de construcción de URL transformada (en el frontend):

```txt
URL original:  https://xxx.supabase.co/storage/v1/object/public/product-images/...
URL transform: https://xxx.supabase.co/storage/v1/render/image/public/product-images/...?width=400&quality=80
```

(Solo si el proyecto tiene Image Transformations habilitado en Supabase.)

### 3.6 Reducir cantidad de imágenes en primera carga (móvil)

- **Paginar** o **virtualizar** la lista en móvil (ej. 8–12 productos por vista) para no disparar 50+ peticiones de imagen en la primera carga.
- Cargar más al hacer scroll (infinite scroll o “Ver más”).

### 3.7 Formato moderno (WebP)

- Si Supabase Image Transformations está activo, suele servir **WebP** automático según el navegador; en ese caso no hace falta cambiar nada en el `<img>`.
- Si no: seguir con la URL actual; el ahorro mayor viene de lazy load + prioridad + tamaño (y, si aplica, transformación por URL).

---

## 4. Checklist resumido

| Responsable   | Acción |
|---------------|--------|
| **Cursor POS** | Documentar contrato de `web_image_url`; opcional: guía de tamaño/formato al subir; opcional: columna o regla para URL transformada/thumbnail si hay Supabase Pro. |
| **Cursor Web** | `loading="lazy"` (excepto primeras imágenes); `fetchpriority="high"` solo above-the-fold; `decoding="async"`; width/height o aspect-ratio para evitar CLS; paginar/virtualizar en móvil; opcional: srcset con URL transformada si está disponible. |

---

## 5. Orden sugerido de implementación (Cursor Web)

1. **Lazy loading + fetchpriority + decoding** (rápido, gran impacto).
2. **Aspect-ratio / width-height** para evitar CLS.
3. **Paginación o virtualización** en vista móvil del catálogo.
4. **URL transformada + srcset** si el proyecto tiene Supabase Pro y quieren usar Image Transformations.

Con esto se optimiza la carga de imágenes sin que el POS tenga que cambiar la base de datos; la mayor parte del trabajo es en el frontend (Cursor Web).
