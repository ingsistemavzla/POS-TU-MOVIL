import { SalesSummary } from '@/types/sales';

export const getSalesSummary = <T extends { store_id: string; total_usd: number }>(
  sales: T[],
  storeId?: string,
): SalesSummary => {
  const filteredSales =
    storeId && storeId !== 'all'
      ? sales.filter((sale) => sale.store_id === storeId)
      : sales;

  const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.total_usd || 0), 0);
  const count = filteredSales.length;
  const averageSales = count > 0 ? totalSales / count : 0;

  return {
    totalSales: Math.round(totalSales * 100) / 100,
    averageSales: Math.round(averageSales * 100) / 100,
    count,
  };
};

