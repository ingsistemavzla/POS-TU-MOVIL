import { describe, expect, it } from 'vitest';
import {
  PRODUCT_IMAGE_ADAPTIVE_THRESHOLD_BYTES,
  PRODUCT_IMAGE_SECOND_PASS_QUALITY,
  buildVersionedProductImagePath,
  toCanonicalProductImageUrl,
} from './optimizeProductImage';

describe('toCanonicalProductImageUrl', () => {
  it('strips ?t= from Supabase Storage public URLs', () => {
    const url =
      'https://xxx.supabase.co/storage/v1/object/public/product-images/co/prod.webp?t=123';
    expect(toCanonicalProductImageUrl(url)).toBe(
      'https://xxx.supabase.co/storage/v1/object/public/product-images/co/prod.webp'
    );
  });

  it('preserves external URLs with query params', () => {
    const url = 'https://cdn.example.com/a.png?w=400&h=400';
    expect(toCanonicalProductImageUrl(url)).toBe(url);
  });

  it('returns null for empty', () => {
    expect(toCanonicalProductImageUrl(null)).toBeNull();
    expect(toCanonicalProductImageUrl('  ')).toBeNull();
  });
});

describe('buildVersionedProductImagePath', () => {
  it('builds company/product_timestamp.ext', () => {
    const path = buildVersionedProductImagePath('co-1', 'prod-2', 'webp');
    expect(path).toMatch(/^co-1\/prod-2_\d+\.webp$/);
  });
});

describe('adaptive compression policy', () => {
  it('keeps a single second-pass threshold and lower quality', () => {
    expect(PRODUCT_IMAGE_ADAPTIVE_THRESHOLD_BYTES).toBe(400 * 1024);
    expect(PRODUCT_IMAGE_SECOND_PASS_QUALITY).toBeLessThan(0.82);
    expect(PRODUCT_IMAGE_SECOND_PASS_QUALITY).toBeGreaterThanOrEqual(0.65);
  });
});
