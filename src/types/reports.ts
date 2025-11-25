export interface SalesReportData {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  totalKreceFinancing: number;
  totalKreceInitial: number;
  paymentMethods: {
    cash: number;
    card: number;
    transfer: number;
    krece: number;
    mixed: number;
  };
  storeBreakdown: StoreReportData[];
}

export interface StoreReportData {
  storeId: string;
  storeName: string;
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  kreceFinancing: number;
  kreceInitial: number;
  paymentMethods: {
    cash: number;
    card: number;
    transfer: number;
    krece: number;
    mixed: number;
  };
}

export interface ProfitabilityReportData {
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  storeBreakdown: StoreProfitData[];
  topSellingProducts: ProductProfitData[];
}

export interface StoreProfitData {
  storeId: string;
  storeName: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface ProductProfitData {
  productId: string;
  productName: string;
  sku: string;
  quantitySold: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface InventoryReportData {
  totalProducts: number;
  totalStockValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  storeInventory: StoreInventoryData[];
  productBreakdown: ProductInventoryData[];
}

export interface StoreInventoryData {
  storeId: string;
  storeName: string;
  totalProducts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
}

export interface ProductInventoryData {
  productId: string;
  productName: string;
  sku: string;
  totalStock: number;
  totalValue: number;
  avgCost: number;
  storeStocks: {
    storeId: string;
    storeName: string;
    quantity: number;
    minQuantity: number;
    value: number;
  }[];
}

export type PeriodType = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ReportMetadata {
  reportId: string;
  reportType: 'sales' | 'profitability' | 'inventory';
  title: string;
  period: PeriodType;
  dateRange: DateRange;
  generatedAt: Date;
  generatedBy: string;
  companyName: string;
  companyLogo?: string;
}
