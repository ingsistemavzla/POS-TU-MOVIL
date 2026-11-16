/**
 * Abstracción mínima de almacenamiento de imágenes de producto (Gestión Web).
 * Hoy: Supabase Storage. Diseño listo para un adaptador futuro (p. ej. R2)
 * sin cambiar el contrato `image_url` / RPC.
 */

import { supabase } from '@/integrations/supabase/client';
import {
  buildVersionedProductImagePath,
  toCanonicalProductImageUrl,
} from '@/utils/optimizeProductImage';

export type ImageStorageProviderId = 'supabase'; // futuro: 'r2'

export const PRODUCT_IMAGES_BUCKET = 'product-images';
export const PRODUCT_IMAGE_CACHE_CONTROL = '86400';

export type StoredObjectRef = {
  provider: ImageStorageProviderId;
  bucket: string;
  path: string;
  publicUrl: string;
};

export type UploadProductImageParams = {
  companyId: string;
  productId: string;
  file: File;
  /** Extensión sin punto; por defecto desde file.name */
  ext?: string;
};

export interface ProductImageStorage {
  readonly provider: ImageStorageProviderId;
  uploadProductImage(params: UploadProductImageParams): Promise<StoredObjectRef>;
  getPublicUrl(path: string): string;
  /** Interpreta URL pública conocida; null si externa o ilegible */
  parsePublicUrl(url: string | null | undefined): StoredObjectRef | null;
  /**
   * Borra un objeto solo si pertenece a este proveedor/bucket.
   * No hace listados ni limpiezas masivas.
   */
  deleteObject(ref: StoredObjectRef): Promise<{ ok: boolean; error?: string }>;
}

function getSupabasePublicUrl(path: string): string {
  const { data } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(path);
  return data.publicUrl;
}

function createSupabaseProductImageStorage(): ProductImageStorage {
  return {
    provider: 'supabase',

    async uploadProductImage({
      companyId,
      productId,
      file,
      ext,
    }: UploadProductImageParams): Promise<StoredObjectRef> {
      const fileExt =
        ext ||
        file.name.split('.').pop() ||
        (file.type.includes('webp') ? 'webp' : 'jpg');
      const path = buildVersionedProductImagePath(companyId, productId, fileExt);

      const { data, error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(path, file, {
          cacheControl: PRODUCT_IMAGE_CACHE_CONTROL,
          upsert: false,
        });

      if (error) {
        throw error;
      }
      if (!data) {
        throw new Error('No se recibió respuesta del servidor al subir la imagen');
      }

      const publicUrl = getSupabasePublicUrl(path);
      const canonical = toCanonicalProductImageUrl(publicUrl);
      if (!canonical) {
        throw new Error('URL pública inválida');
      }

      return {
        provider: 'supabase',
        bucket: PRODUCT_IMAGES_BUCKET,
        path,
        publicUrl: canonical,
      };
    },

    getPublicUrl(path: string): string {
      return getSupabasePublicUrl(path);
    },

    parsePublicUrl(url: string | null | undefined): StoredObjectRef | null {
      const canonical = toCanonicalProductImageUrl(url);
      if (!canonical) return null;

      const marker = `/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`;
      const idx = canonical.indexOf(marker);
      if (idx === -1) return null;

      const path = canonical.slice(idx + marker.length);
      if (!path || path.includes('..')) return null;

      return {
        provider: 'supabase',
        bucket: PRODUCT_IMAGES_BUCKET,
        path,
        publicUrl: canonical,
      };
    },

    async deleteObject(
      ref: StoredObjectRef
    ): Promise<{ ok: boolean; error?: string }> {
      if (ref.provider !== 'supabase' || ref.bucket !== PRODUCT_IMAGES_BUCKET) {
        return { ok: false, error: 'Proveedor/bucket no gestionado' };
      }
      if (!ref.path || ref.path.includes('..')) {
        return { ok: false, error: 'Path inválido' };
      }

      const { error } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .remove([ref.path]);

      if (error) {
        return { ok: false, error: error.message };
      }
      return { ok: true };
    },
  };
}

/** Instancia activa. Sustituir por factory multi-proveedor cuando exista R2. */
export const productImageStorage: ProductImageStorage =
  createSupabaseProductImageStorage();

/**
 * Borra de forma segura un objeto referenciado por URL pública,
 * solo si es de nuestro bucket. No falla el flujo llamador.
 * Uso restringido: uploads de sesión no persistidos. No usar tras RPC
 * para borrar la imagen anterior del producto.
 */
export async function tryDeleteProductImageByUrl(
  url: string | null | undefined
): Promise<boolean> {
  const ref = productImageStorage.parsePublicUrl(url);
  if (!ref) return false;
  const result = await productImageStorage.deleteObject(ref);
  if (!result.ok) {
    console.warn('⚠️ No se pudo borrar objeto de imagen:', result.error, ref.path);
    return false;
  }
  return true;
}

/**
 * Filtra refs de sesión que pueden borrarse con seguridad:
 * solo si su URL pública no coincide con ninguna URL ya persistida/protegida.
 * Ante duda → no incluir (conservar archivo).
 */
export function selectDeletableSessionUploads(
  pending: StoredObjectRef[],
  protectedUrls: Array<string | null | undefined>
): StoredObjectRef[] {
  const protectedCanonical = new Set(
    protectedUrls
      .map((u) => toCanonicalProductImageUrl(u))
      .filter((u): u is string => !!u)
  );

  return pending.filter((ref) => {
    const url = toCanonicalProductImageUrl(ref.publicUrl);
    if (!url) return false; // incertidumbre → conservar
    if (protectedCanonical.has(url)) return false;
    return true;
  });
}
