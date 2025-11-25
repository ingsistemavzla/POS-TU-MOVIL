export interface SaleRecord {
  id: string;
  store_id: string;
  total_usd: number;
  created_at: string;
}

export interface SalesSummary {
  totalSales: number;
  averageSales: number;
  count: number;
}

