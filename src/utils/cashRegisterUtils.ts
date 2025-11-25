import { CashRegisterClosure } from '@/hooks/useCashRegister';

export interface CashRegisterSummary {
  totalClosures: number;
  totalSalesAmount: number;
  totalTransactions: number;
  totalDifferences: number;
  averageTicket: number;
  cashierPerformance: Array<{
    cashierName: string;
    closures: number;
    totalSales: number;
    differences: number;
    accuracy: number;
  }>;
  storePerformance: Array<{
    storeName: string;
    closures: number;
    totalSales: number;
    differences: number;
    accuracy: number;
  }>;
}

export const generateCashRegisterSummary = (closures: CashRegisterClosure[]): CashRegisterSummary => {
  const totalClosures = closures.length;
  const totalSalesAmount = closures.reduce((sum, c) => sum + c.total_sales_usd, 0);
  const totalTransactions = closures.reduce((sum, c) => sum + c.total_transactions, 0);
  const totalDifferences = closures.reduce((sum, c) => 
    sum + Math.abs(c.cash_difference_bs) + Math.abs(c.cash_difference_usd), 0
  );
  const averageTicket = totalTransactions > 0 ? totalSalesAmount / totalTransactions : 0;

  // Performance por cajero
  const cashierGroups = closures.reduce((groups, closure) => {
    const key = closure.user_name || 'Unknown';
    if (!groups[key]) {
      groups[key] = {
        cashierName: key,
        closures: 0,
        totalSales: 0,
        differences: 0,
        accuracy: 0
      };
    }
    groups[key].closures++;
    groups[key].totalSales += closure.total_sales_usd;
    groups[key].differences += Math.abs(closure.cash_difference_bs) + Math.abs(closure.cash_difference_usd);
    return groups;
  }, {} as Record<string, any>);

  const cashierPerformance = Object.values(cashierGroups).map((cashier: any) => ({
    ...cashier,
    accuracy: cashier.totalSales > 0 ? ((cashier.totalSales - cashier.differences) / cashier.totalSales) * 100 : 100
  }));

  // Performance por tienda
  const storeGroups = closures.reduce((groups, closure) => {
    const key = closure.store_name || 'Unknown';
    if (!groups[key]) {
      groups[key] = {
        storeName: key,
        closures: 0,
        totalSales: 0,
        differences: 0,
        accuracy: 0
      };
    }
    groups[key].closures++;
    groups[key].totalSales += closure.total_sales_usd;
    groups[key].differences += Math.abs(closure.cash_difference_bs) + Math.abs(closure.cash_difference_usd);
    return groups;
  }, {} as Record<string, any>);

  const storePerformance = Object.values(storeGroups).map((store: any) => ({
    ...store,
    accuracy: store.totalSales > 0 ? ((store.totalSales - store.differences) / store.totalSales) * 100 : 100
  }));

  return {
    totalClosures,
    totalSalesAmount,
    totalTransactions,
    totalDifferences,
    averageTicket,
    cashierPerformance: cashierPerformance.sort((a, b) => b.totalSales - a.totalSales),
    storePerformance: storePerformance.sort((a, b) => b.totalSales - a.totalSales)
  };
};

export const validateCashCount = (breakdown: Record<string, number>): boolean => {
  // Validar que no haya cantidades negativas
  for (const [denomination, quantity] of Object.entries(breakdown)) {
    if (quantity < 0) return false;
    if (!Number.isInteger(quantity)) return false;
  }
  return true;
};

export const calculateCashTotal = (breakdown: Record<string, number>): number => {
  return Object.entries(breakdown).reduce(
    (total, [denomination, quantity]) => total + (parseFloat(denomination) * quantity),
    0
  );
};

export const formatCashBreakdown = (breakdown: Record<string, number>, currency: 'bs' | 'usd'): string => {
  const symbol = currency === 'bs' ? 'Bs.' : '$';
  return Object.entries(breakdown)
    .filter(([_, quantity]) => quantity > 0)
    .sort(([a], [b]) => parseFloat(b) - parseFloat(a))
    .map(([denomination, quantity]) => `${symbol}${denomination} x ${quantity}`)
    .join(', ');
};

export const getDifferenceLevel = (differenceUsd: number): 'none' | 'minor' | 'moderate' | 'major' => {
  const absDiff = Math.abs(differenceUsd);
  if (absDiff <= 0.01) return 'none';
  if (absDiff <= 5) return 'minor';
  if (absDiff <= 20) return 'moderate';
  return 'major';
};

export const getDifferenceLevelColor = (level: string): string => {
  switch (level) {
    case 'none': return 'text-green-600';
    case 'minor': return 'text-yellow-600';
    case 'moderate': return 'text-orange-600';
    case 'major': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

export const calculateShiftMetrics = (closure: CashRegisterClosure) => {
  const shiftDuration = new Date(closure.closure_date).getTime() - 
                       new Date(closure.created_at).getTime();
  const hoursWorked = shiftDuration / (1000 * 60 * 60);
  
  return {
    hoursWorked: Math.max(0.1, hoursWorked), // Mínimo 0.1 horas para evitar división por cero
    salesPerHour: hoursWorked > 0 ? closure.total_transactions / hoursWorked : 0,
    revenuePerHour: hoursWorked > 0 ? closure.total_sales_usd / hoursWorked : 0,
    averageTicket: closure.total_transactions > 0 ? closure.total_sales_usd / closure.total_transactions : 0,
    cashAccuracy: {
      bs: closure.expected_cash_bs > 0 ? 
          ((closure.expected_cash_bs - Math.abs(closure.cash_difference_bs)) / closure.expected_cash_bs) * 100 : 100,
      usd: closure.expected_cash_usd > 0 ? 
           ((closure.expected_cash_usd - Math.abs(closure.cash_difference_usd)) / closure.expected_cash_usd) * 100 : 100
    }
  };
};

export const exportClosureData = (closures: CashRegisterClosure[], format: 'csv' | 'json') => {
  if (format === 'csv') {
    const headers = [
      'Fecha',
      'Tienda', 
      'Cajero',
      'Transacciones',
      'Total Ventas USD',
      'Efectivo Esperado USD',
      'Efectivo Contado USD',
      'Diferencia USD',
      'Estado',
      'Notas'
    ];
    
    const rows = closures.map(closure => [
      new Date(closure.closure_date).toLocaleDateString(),
      closure.store_name || '',
      closure.user_name || '',
      closure.total_transactions.toString(),
      closure.total_sales_usd.toFixed(2),
      closure.expected_cash_usd.toFixed(2),
      closure.counted_cash_usd.toFixed(2),
      closure.cash_difference_usd.toFixed(2),
      closure.approved ? 'Aprobado' : 'Pendiente',
      closure.notes || ''
    ]);
    
    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');
    
    return csvContent;
  } else {
    return JSON.stringify(closures, null, 2);
  }
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
