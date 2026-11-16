# Preparación futura: Cloudflare R2 para imágenes de producto

**Estado:** solo documentación. No hay contrato R2, ni credenciales, ni CDN configurado.

**Contexto actual (Fase 1–2 POS):**
- Bucket Supabase `product-images` (público).
- Upload vía `src/utils/productImageStorage.ts` (proveedor `supabase`).
- Optimización client-side WebP + path versionado + `cacheControl` 86400.
- Contrato de negocio intacto: `web_product_metadata.image_url` / RPC `sync_web_product_price` / catálogo público leen una URL HTTP final.

---

## 1. Adaptador necesario

Extender `ProductImageStorage` / `ImageStorageProviderId` con `'r2'`:

| Operación | Hoy (Supabase) | Futuro (R2) |
|-----------|----------------|-------------|
| Upload | `storage.from(bucket).upload` | PUT firmado (presigned) o Worker proxy |
| URL pública | `getPublicUrl` Storage | URL CDN (`https://img.tudominio/...`) |
| Parse ref | path tras `/product-images/` | key R2 + opcional `provider` en URL o convención |
| Delete | `storage.remove([path])` | API R2 / Worker con auth |

**Regla:** el POS sigue persistiendo **solo** `image_url` (string). El adaptador decide provider + key.

Punto de corte en código: sustituir `productImageStorage` por factory según env (`VITE_IMAGE_STORAGE_PROVIDER=supabase|r2`) sin tocar RPC.

---

## 2. Autorización segura de uploads

No exponer Access Key R2 en el navegador.

Opciones recomendadas (elegir una en implementación futura):

1. **Presigned PUT** emitido por Edge Function / backend con JWT de sesión POS (mismo `company_id` / rol admin web).
2. **Worker Cloudflare** que valida JWT Supabase y hace el PUT a R2.
3. Evitar upload anónimo al bucket; TTL corto del presign (p. ej. 5 min); content-type y tamaño máximos en la firma.

Checklist de seguridad:
- Validar `company_id` y `product_id` en el token de subida.
- Prefijo de key obligatorio: `{company_id}/…`
- Rechazar content-types no imagen.
- Rate limit por usuario/compañía.

---

## 3. Configuración CDN

- R2 bucket privado o público + **Custom Domain** / Cloudflare CDN.
- Cache-Control alineado al upload (`max-age=86400` o superior para assets versionados).
- Con keys versionadas (`productId_timestamp.webp`), invalidación CDN casi innecesaria: URL nueva = objeto nuevo.

---

## 4. Estrategia de URLs

- Canónicas, sin `?t=`.
- Ideal: `https://media.ejemplo.com/{company_id}/{product_id}_{ts}.webp`
- El catálogo público no cambia: consume `image_url` tal cual.
- Helper `toCanonicalProductImageUrl` debe reconocer también el host CDN (ampliar whitelist de “nuestros” hosts).

---

## 5. Compatibilidad con imágenes antiguas

- Las URL `*.supabase.co/storage/v1/object/public/product-images/...` siguen válidas mientras el bucket exista.
- `parsePublicUrl` multi-proveedor: detectar host Supabase vs host R2.
- No migrar masivamente el día 1: dual-read (URL apunta a donde esté el archivo).

---

## 6. Migración gradual

1. Desplegar adaptador R2 detrás de flag (uploads nuevos → R2).
2. Lectura: cualquier URL histórica Supabase sigue sirviendo.
3. Job opcional (fuera de este repo / con auth service role): copiar objetos referenciados en `web_product_metadata.image_url` y reescribir URL **solo** tras verificar GET 200 en CDN.
4. Retener Supabase Storage hasta que el % de URLs R2 sea estable; luego freeze de writes Supabase.
5. No borrar objetos Supabase sin confirmar cero referencias en BD (+ logs/cachés externos si aplica).

**Dependencias que detienen implementación en este repo sin autorización:**
- Cuenta Cloudflare + bucket R2 + dominio.
- Secretos (API token) en backend/Edge Function.
- Posible Edge Function nueva (infra), no SQL de negocio.

---

## 7. Relación con Fase 2 POS

- Abstracción ya lista en `productImageStorage.ts`.
- Huérfanos de sesión controlados en Gestión Web (cancel / reemplazo / clear).
- Compresión adaptativa reduce egress/almacenamiento antes del cambio de proveedor.
