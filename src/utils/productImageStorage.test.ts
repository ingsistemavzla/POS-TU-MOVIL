import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('@/integrations/supabase/client', () => {
  const upload = vi.fn();
  const getPublicUrl = vi.fn();
  const remove = vi.fn();
  return {
    supabase: {
      storage: {
        from: vi.fn(() => ({
          upload,
          getPublicUrl,
          remove,
        })),
      },
    },
    __mocks: { upload, getPublicUrl, remove },
  };
});

import {
  PRODUCT_IMAGES_BUCKET,
  productImageStorage,
  selectDeletableSessionUploads,
  tryDeleteProductImageByUrl,
  type StoredObjectRef,
} from './productImageStorage';
import { supabase } from '@/integrations/supabase/client';

function ref(path: string, publicUrl: string): StoredObjectRef {
  return {
    provider: 'supabase',
    bucket: PRODUCT_IMAGES_BUCKET,
    path,
    publicUrl,
  };
}

describe('productImageStorage.parsePublicUrl', () => {
  it('parses supabase product-images public URL', () => {
    const url =
      'https://abc.supabase.co/storage/v1/object/public/product-images/co1/prod_123.webp?t=999';
    const ref = productImageStorage.parsePublicUrl(url);
    expect(ref).toEqual({
      provider: 'supabase',
      bucket: PRODUCT_IMAGES_BUCKET,
      path: 'co1/prod_123.webp',
      publicUrl:
        'https://abc.supabase.co/storage/v1/object/public/product-images/co1/prod_123.webp',
    });
  });

  it('returns null for external URLs', () => {
    expect(
      productImageStorage.parsePublicUrl('https://cdn.example.com/x.webp?w=1')
    ).toBeNull();
  });
});

describe('tryDeleteProductImageByUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not call remove for external URLs', async () => {
    const ok = await tryDeleteProductImageByUrl(
      'https://cdn.example.com/a.png?sig=1'
    );
    expect(ok).toBe(false);
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it('removes only parsed bucket path', async () => {
    const from = supabase.storage.from as ReturnType<typeof vi.fn>;
    const remove = vi.fn().mockResolvedValue({ error: null });
    from.mockReturnValue({
      upload: vi.fn(),
      getPublicUrl: vi.fn(),
      remove,
    });

    const ok = await tryDeleteProductImageByUrl(
      'https://abc.supabase.co/storage/v1/object/public/product-images/co/p_1.webp'
    );
    expect(ok).toBe(true);
    expect(remove).toHaveBeenCalledWith(['co/p_1.webp']);
  });
});

describe('selectDeletableSessionUploads', () => {
  const persisted =
    'https://abc.supabase.co/storage/v1/object/public/product-images/co/old.webp';
  const pendingA = ref(
    'co/a.webp',
    'https://abc.supabase.co/storage/v1/object/public/product-images/co/a.webp'
  );
  const pendingSameAsPersisted = ref('co/old.webp', persisted);

  it('allows deleting session-only uploads', () => {
    expect(selectDeletableSessionUploads([pendingA], [persisted])).toEqual([
      pendingA,
    ]);
  });

  it('never deletes refs that match a persisted URL', () => {
    expect(
      selectDeletableSessionUploads([pendingSameAsPersisted, pendingA], [
        persisted,
      ])
    ).toEqual([pendingA]);
  });

  it('keeps everything when protected URL is uncertain/empty publicUrl', () => {
    const bad = ref('co/x.webp', '');
    expect(selectDeletableSessionUploads([bad], [])).toEqual([]);
  });
});
