import { SaleRecord } from '@/types/sales';

export const salesFixture: SaleRecord[] = [
  {
    id: 'sale-1',
    store_id: 'store-1',
    total_usd: 100,
    created_at: '2025-01-01T10:00:00Z',
  },
  {
    id: 'sale-2',
    store_id: 'store-1',
    total_usd: 200,
    created_at: '2025-01-02T10:00:00Z',
  },
  {
    id: 'sale-3',
    store_id: 'store-2',
    total_usd: 300,
    created_at: '2025-01-02T12:00:00Z',
  },
];

