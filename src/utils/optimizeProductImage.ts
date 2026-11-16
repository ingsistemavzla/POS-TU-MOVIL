/**
 * Optimización client-side de imágenes de producto (Gestión Web).
 * - Max lado 1200 px (sin upscale)
 * - Preferencia WebP calidad ~0.82
 * - Segunda pasada adaptativa si supera umbral (máx. 2 encodes)
 * - Falla explícita si no se puede optimizar (no subir originales multi-MB)
 */

export const PRODUCT_IMAGE_MAX_SIDE = 1200;
export const PRODUCT_IMAGE_WEBP_QUALITY = 0.82;
/** Si tras la 1ª pasada supera este tamaño, se intenta 1 pasada extra. */
export const PRODUCT_IMAGE_ADAPTIVE_THRESHOLD_BYTES = 400 * 1024; // 400 KB
export const PRODUCT_IMAGE_SECOND_PASS_QUALITY = 0.7;
export const PRODUCT_IMAGE_SECOND_PASS_MAX_SIDE = 1000;
export const PRODUCT_IMAGE_MAX_OUTPUT_BYTES = 1.5 * 1024 * 1024; // 1.5 MB
export const PRODUCT_IMAGE_INPUT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

export type OptimizeProductImageResult = {
  file: File;
  width: number;
  height: number;
  originalBytes: number;
  optimizedBytes: number;
  /** 1 = solo pasada normal; 2 = pasó por compresión adaptativa */
  passes: number;
};

/** URL canónica para Storage público: quita ?t=… Solo toca URLs de Supabase Storage. */
export function toCanonicalProductImageUrl(
  url: string | null | undefined
): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  // URLs externas: no tocar query params legítimos
  if (!trimmed.includes('/storage/v1/object/public/')) {
    return trimmed;
  }
  return trimmed.split('?')[0];
}

/** Path versionado: companyId/productId_timestamp.webp */
export function buildVersionedProductImagePath(
  companyId: string,
  productId: string,
  ext = 'webp'
): string {
  const safeExt = ext.replace(/^\./, '').toLowerCase() || 'webp';
  return `${companyId}/${productId}_${Date.now()}.${safeExt}`;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen seleccionada'));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const done = (blob: Blob | null) => {
      if (!blob) {
        reject(new Error(`No se pudo generar ${type}`));
        return;
      }
      resolve(blob);
    };
    if (quality === undefined) {
      canvas.toBlob(done, type);
    } else {
      canvas.toBlob(done, type, quality);
    }
  });
}

function drawScaled(
  img: HTMLImageElement,
  maxSide: number
): { canvas: HTMLCanvasElement; width: number; height: number } {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  if (!srcW || !srcH) {
    throw new Error('Dimensiones de imagen inválidas');
  }

  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas no disponible en este navegador');
  }
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, width, height };
}

async function encodeCanvas(
  canvas: HTMLCanvasElement,
  sourceType: string,
  quality: number
): Promise<{ blob: Blob; outType: string; outExt: string }> {
  let blob: Blob;
  let outType = 'image/webp';
  let outExt = 'webp';

  try {
    blob = await canvasToBlob(canvas, 'image/webp', quality);
    if (!blob.type.includes('webp') || blob.size < 32) {
      throw new Error('WebP no usable');
    }
  } catch {
    const preferPng = sourceType === 'image/png';
    outType = preferPng ? 'image/png' : 'image/jpeg';
    outExt = preferPng ? 'png' : 'jpg';
    blob = await canvasToBlob(
      canvas,
      outType,
      preferPng ? undefined : quality
    );
  }

  return { blob, outType, outExt };
}

/**
 * Redimensiona y comprime (máx. 2 pasadas). Lanza Error si falla o supera el límite.
 */
export async function optimizeProductImage(
  file: File,
  options?: {
    maxSide?: number;
    quality?: number;
    maxOutputBytes?: number;
    adaptiveThresholdBytes?: number;
    secondPassQuality?: number;
    secondPassMaxSide?: number;
  }
): Promise<OptimizeProductImageResult> {
  const maxSide = options?.maxSide ?? PRODUCT_IMAGE_MAX_SIDE;
  const quality = options?.quality ?? PRODUCT_IMAGE_WEBP_QUALITY;
  const maxOutputBytes =
    options?.maxOutputBytes ?? PRODUCT_IMAGE_MAX_OUTPUT_BYTES;
  const adaptiveThreshold =
    options?.adaptiveThresholdBytes ?? PRODUCT_IMAGE_ADAPTIVE_THRESHOLD_BYTES;
  const secondQuality =
    options?.secondPassQuality ?? PRODUCT_IMAGE_SECOND_PASS_QUALITY;
  const secondMaxSide =
    options?.secondPassMaxSide ?? PRODUCT_IMAGE_SECOND_PASS_MAX_SIDE;

  if (!PRODUCT_IMAGE_INPUT_TYPES.includes(file.type as (typeof PRODUCT_IMAGE_INPUT_TYPES)[number])) {
    throw new Error('Solo se permiten imágenes JPG, PNG o WEBP');
  }

  const img = await loadImageElement(file);
  const first = drawScaled(img, maxSide);
  let encoded = await encodeCanvas(first.canvas, file.type, quality);
  let width = first.width;
  let height = first.height;
  let passes = 1;

  // Segunda pasada solo si supera umbral y el formato admite calidad lossy
  const canRecompress =
    encoded.outType === 'image/webp' || encoded.outType === 'image/jpeg';

  if (encoded.blob.size > adaptiveThreshold && canRecompress) {
    const second = drawScaled(img, Math.min(maxSide, secondMaxSide));
    const recompressed = await encodeCanvas(
      second.canvas,
      file.type,
      secondQuality
    );
    // Solo aceptar 2ª pasada si reduce tamaño
    if (recompressed.blob.size < encoded.blob.size) {
      encoded = recompressed;
      width = second.width;
      height = second.height;
      passes = 2;
    }
  }

  if (encoded.blob.size > maxOutputBytes) {
    throw new Error(
      `La imagen optimizada sigue siendo demasiado grande (${(encoded.blob.size / 1024 / 1024).toFixed(2)} MB). Usa una foto más liviana.`
    );
  }

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'product';
  const optimized = new File([encoded.blob], `${baseName}.${encoded.outExt}`, {
    type: encoded.outType,
    lastModified: Date.now(),
  });

  return {
    file: optimized,
    width,
    height,
    originalBytes: file.size,
    optimizedBytes: optimized.size,
    passes,
  };
}
