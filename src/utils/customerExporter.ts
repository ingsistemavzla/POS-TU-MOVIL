import { Tables } from "@/integrations/supabase/types";

type Customer = Tables<"customers">;

interface CustomerWithStats extends Customer {
  totalPurchases: number;
  totalSpent: number;
  lastPurchase: string | null;
}

export const exportCustomersToCSV = (customers: CustomerWithStats[], filename: string = 'clientes.csv') => {
  // CSV headers
  const headers = [
    'ID',
    'Nombre',
    'Cédula/RIF',
    'Email',
    'Teléfono',
    'Dirección',
    'Total Compras',
    'Total Gastado (USD)',
    'Última Compra',
    'Fecha de Registro',
    'Estado'
  ];

  // CSV rows
  const rows = customers.map(customer => [
    customer.id,
    customer.name,
    customer.id_number || '',
    customer.email || '',
    customer.phone || '',
    customer.address || '',
    customer.totalPurchases,
    customer.totalSpent.toFixed(2),
    customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString('es-VE') : 'N/A',
    new Date(customer.created_at).toLocaleDateString('es-VE'),
    customer.totalPurchases === 0 ? 'Nuevo' : customer.totalPurchases >= 5 ? 'Frecuente' : 'Activo'
  ]);

  // Combine headers and rows
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const exportCustomerReport = (customers: CustomerWithStats[], stats: {
  totalCustomers: number;
  activeCustomers: number;
  newThisMonth: number;
  totalSales: number;
}) => {
  const now = new Date();
  const filename = `reporte_clientes_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}.csv`;
  
  // Add summary at the beginning
  const summary = [
    ['REPORTE DE CLIENTES'],
    ['Fecha de generación:', now.toLocaleDateString('es-VE')],
    [''],
    ['RESUMEN'],
    ['Total de clientes:', stats.totalCustomers.toString()],
    ['Clientes activos:', stats.activeCustomers.toString()],
    ['Nuevos este mes:', stats.newThisMonth.toString()],
    ['Ventas totales (USD):', stats.totalSales.toFixed(2)],
    [''],
    ['DETALLES DE CLIENTES']
  ];

  // CSV headers
  const headers = [
    'ID',
    'Nombre',
    'Cédula/RIF',
    'Email',
    'Teléfono',
    'Dirección',
    'Total Compras',
    'Total Gastado (USD)',
    'Última Compra',
    'Fecha de Registro',
    'Estado'
  ];

  // CSV rows
  const rows = customers.map(customer => [
    customer.id,
    customer.name,
    customer.id_number || '',
    customer.email || '',
    customer.phone || '',
    customer.address || '',
    customer.totalPurchases,
    customer.totalSpent.toFixed(2),
    customer.lastPurchase ? new Date(customer.lastPurchase).toLocaleDateString('es-VE') : 'N/A',
    new Date(customer.created_at).toLocaleDateString('es-VE'),
    customer.totalPurchases === 0 ? 'Nuevo' : customer.totalPurchases >= 5 ? 'Frecuente' : 'Activo'
  ]);

  // Combine summary, headers and rows
  const csvContent = [
    ...summary.map(row => row.join(',')),
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
