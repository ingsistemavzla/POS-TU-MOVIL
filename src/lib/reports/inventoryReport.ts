import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/utils/currency';
import { format as formatDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { InventoryItem } from '@/types/inventory';

interface InventoryReportData {
  totalProducts: number;
  totalStockValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  items: Array<{
    id: string;
    product_id: string;
    store_id: string;
    qty: number;
    min_qty: number;
    product?: {
      name: string;
      sku: string;
      category?: string;
      price?: number;
    };
    store?: {
      name: string;
    };
  }>;
  storeName?: string;
  dateFrom?: string;
  dateTo?: string;
  categoryId?: string;
}

interface ReportMetadata {
  reportId: string;
  generatedAt: string;
  period: string;
  companyId: string;
}

function addCompanyLogo(doc: jsPDF, y: number, logoSize: number = 20): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  try {
    const logoPath = '/logo_factura.png';
    const logoAspectRatio = 500 / 257;
    const finalWidth = logoSize;
    const finalHeight = logoSize / logoAspectRatio;
    const logoX = (pageWidth - finalWidth) / 2;
    
    doc.addImage(logoPath, 'PNG', logoX, y, finalWidth, finalHeight);
    return y + finalHeight + 8;
  } catch (error) {
    console.warn('Error loading logo:', error);
    const logoX = (pageWidth - logoSize) / 2;
    doc.setFillColor(0, 120, 120);
    doc.circle(logoX + logoSize / 2, y + logoSize / 2, logoSize / 2, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.circle(logoX + logoSize / 2, y + logoSize / 2, logoSize / 2, 'S');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('LOGO', logoX + logoSize / 2, y + logoSize / 2 + 2, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    return y + logoSize + 8;
  }
}

function addCompanyInfo(doc: jsPDF, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Mi Movil C.A', pageWidth / 2, y, { align: 'center' });
  
  y += 6;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Reporte de Inventario', pageWidth / 2, y, { align: 'center' });
  
  return y + 8;
}

function addReportTitle(doc: jsPDF, y: number, reportType: string = 'DE INVENTARIO'): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(reportType, pageWidth / 2, y, { align: 'center' });
  
  return y + 8;
}

export async function generateInventoryReportPDFExtended(
  data: InventoryReportData,
  metadata: ReportMetadata
): Promise<jsPDF> {
  const doc = new jsPDF();
  let currentY = 10;

  // Logo y encabezado
  currentY = addCompanyLogo(doc, currentY, 18);
  currentY = addCompanyInfo(doc, currentY);
  currentY = addReportTitle(doc, currentY, 'REPORTE DE INVENTARIO');

  // Información de filtros
  currentY += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const filters: string[] = [];
  if (data.storeName) {
    filters.push(`Sucursal: ${data.storeName}`);
  }
  if (data.dateFrom || data.dateTo) {
    const dateRange = data.dateFrom && data.dateTo
      ? `${formatDate(new Date(data.dateFrom), 'dd/MM/yyyy', { locale: es })} - ${formatDate(new Date(data.dateTo), 'dd/MM/yyyy', { locale: es })}`
      : data.dateFrom
      ? `Desde: ${formatDate(new Date(data.dateFrom), 'dd/MM/yyyy', { locale: es })}`
      : `Hasta: ${formatDate(new Date(data.dateTo!), 'dd/MM/yyyy', { locale: es })}`;
    filters.push(`Período: ${dateRange}`);
  }
  if (filters.length > 0) {
    doc.text(filters.join(' • '), 14, currentY);
    currentY += 6;
  }

  // Fecha de generación
  doc.text(
    `Generado el: ${formatDate(new Date(metadata.generatedAt), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}`,
    14,
    currentY
  );
  currentY += 10;

  // Estadísticas generales
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen General', 14, currentY);
  currentY += 8;

  const summaryData = [
    ['Total de Productos', String(data.totalProducts)],
    ['Valor Total del Stock', formatCurrency(data.totalStockValue)],
    ['Productos con Stock Bajo', String(data.lowStockProducts)],
    ['Productos Sin Stock', String(data.outOfStockProducts)],
  ];

  autoTable(doc, {
    head: [['Métrica', 'Valor']],
    body: summaryData,
    startY: currentY,
    margin: { left: 14, right: 14 },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 120, halign: 'left' },
      1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
    },
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Tabla de productos
  if (data.items.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalle de Productos', 14, currentY);
    currentY += 8;

    const tableData = data.items.map((item) => [
      item.product?.sku || 'N/A',
      item.product?.name || 'Producto sin nombre',
      item.store?.name || 'N/A',
      String(item.qty),
      String(item.min_qty),
      item.qty > 0 && item.qty <= item.min_qty ? 'Bajo' : item.qty === 0 ? 'Sin Stock' : 'Normal',
      formatCurrency((item.product?.price || 0) * item.qty),
    ]);

    autoTable(doc, {
      head: [['SKU', 'Producto', 'Sucursal', 'Stock', 'Mín.', 'Estado', 'Valor']],
      body: tableData,
      startY: currentY,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: {
        fillColor: [26, 26, 26],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 50 },
        2: { cellWidth: 35 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' },
        6: { cellWidth: 25, halign: 'right' },
      },
      bodyStyles: {
        fillColor: (row: any) => {
          const status = tableData[row.index]?.[5];
          if (status === 'Sin Stock') return [239, 68, 68];
          if (status === 'Bajo') return [251, 191, 36];
          return [255, 255, 255];
        },
        textColor: (row: any) => {
          const status = tableData[row.index]?.[5];
          return status === 'Sin Stock' || status === 'Bajo' ? 255 : 0;
        },
      },
    });
  }

  // Pie de página
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
    doc.text(
      `Reporte ID: ${metadata.reportId}`,
      14,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  return doc;
}

/**
 * Reporte auxiliar para auditoría de stock por categoría y sucursal.
 * Muestra, para cada categoría, valor, productos únicos y unidades,
 * y luego un resumen por sucursal y categoría.
 */
export async function generateInventoryProductsDataSnapshotPDF(
  inventoryItems: InventoryItem[],
  stores: { id: string; name: string }[],
  generatedAt: string
): Promise<jsPDF> {
  const doc = new jsPDF();
  let currentY = 10;

  // Encabezado simple
  currentY = addCompanyLogo(doc, currentY, 18);
  currentY = addCompanyInfo(doc, currentY);
  currentY = addReportTitle(doc, currentY, 'REPORTE DE DATOS DE PRODUCTOS');
  currentY += 4;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generado el: ${formatDate(new Date(generatedAt), "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}`,
    14,
    currentY
  );
  currentY += 8;

  // --- 1. Resumen general por categoría (todas las sucursales) ---
  type CategoryKey = 'phones' | 'accessories' | 'technical_service' | 'other';
  const categoryLabels: Record<CategoryKey, string> = {
    phones: 'Teléfonos',
    accessories: 'Accesorios',
    technical_service: 'Servicio Técnico',
    other: 'Otras categorías',
  };

  const categoryTotals: Record<CategoryKey, {
    units: number;
    value: number;
    products: Set<string>;
  }> = {
    phones: { units: 0, value: 0, products: new Set() },
    accessories: { units: 0, value: 0, products: new Set() },
    technical_service: { units: 0, value: 0, products: new Set() },
    other: { units: 0, value: 0, products: new Set() },
  };

  inventoryItems.forEach((item) => {
    const category = (item.product?.category as CategoryKey) || 'other';
    const key: CategoryKey = categoryTotals[category] ? category : 'other';
    const qty = Math.max(0, item.qty || 0);
    const price = Math.max(0, item.product?.sale_price_usd || 0);

    categoryTotals[key].units += qty;
    categoryTotals[key].value += qty * price;
    if (qty > 0) {
      categoryTotals[key].products.add(item.product_id);
    }
  });

  const totalUnitsAll =
    categoryTotals.phones.units +
    categoryTotals.accessories.units +
    categoryTotals.technical_service.units +
    categoryTotals.other.units;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Resumen General por Categoría (todas las sucursales)', 14, currentY);
  currentY += 6;

  const categoryRows = (['phones', 'accessories', 'technical_service', 'other'] as CategoryKey[])
    .map((key) => {
      const row = categoryTotals[key];
      if (row.units === 0 && row.value === 0 && row.products.size === 0) {
        return null;
      }
      const percent = totalUnitsAll > 0 ? (row.units / totalUnitsAll) * 100 : 0;
      return [
        categoryLabels[key],
        formatCurrency(row.value),
        String(row.products.size),
        String(row.units),
        `${percent.toFixed(1)}%`,
      ];
    })
    .filter(Boolean) as any[];

  if (categoryRows.length > 0) {
    autoTable(doc, {
      head: [['Categoría', 'Valor USD', 'Productos únicos', 'Unidades', '% del total']],
      body: categoryRows,
      startY: currentY,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: {
        fillColor: [0, 120, 120],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
      },
    });
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // --- 2. Resumen por sucursal y categoría ---
  if (currentY > 220) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Resumen por Sucursal y Categoría (${stores.length} sucursales)`, 14, currentY);
  currentY += 8;

  const storeMap = new Map<string, string>();
  stores.forEach((s) => storeMap.set(s.id, s.name));

  // Agrupar por sucursal + categoría
  const storeCategoryTotals = new Map<string, {
    storeId: string;
    storeName: string;
    byCategory: Record<CategoryKey, { units: number; value: number; products: Set<string> }>;
  }>();

  inventoryItems.forEach((item) => {
    const storeId = item.store_id;
    if (!storeId) return;

    const category = (item.product?.category as CategoryKey) || 'other';
    const key: CategoryKey = categoryTotals[category] ? category : 'other';

    if (!storeCategoryTotals.has(storeId)) {
      storeCategoryTotals.set(storeId, {
        storeId,
        storeName: storeMap.get(storeId) || item.store?.name || 'Sin sucursal',
        byCategory: {
          phones: { units: 0, value: 0, products: new Set() },
          accessories: { units: 0, value: 0, products: new Set() },
          technical_service: { units: 0, value: 0, products: new Set() },
          other: { units: 0, value: 0, products: new Set() },
        },
      });
    }

    const storeEntry = storeCategoryTotals.get(storeId)!;
    const qty = Math.max(0, item.qty || 0);
    const price = Math.max(0, item.product?.sale_price_usd || 0);

    storeEntry.byCategory[key].units += qty;
    storeEntry.byCategory[key].value += qty * price;
    if (qty > 0) {
      storeEntry.byCategory[key].products.add(item.product_id);
    }
  });

  const sortedStores = Array.from(storeCategoryTotals.values())
    .sort((a, b) => a.storeName.localeCompare(b.storeName));

  sortedStores.forEach((store) => {
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    const totalUnitsStore =
      store.byCategory.phones.units +
      store.byCategory.accessories.units +
      store.byCategory.technical_service.units +
      store.byCategory.other.units;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(store.storeName, 14, currentY);
    currentY += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const rows = (['phones', 'accessories', 'technical_service'] as CategoryKey[])
      .map((key) => {
        const data = store.byCategory[key];
        const percent = totalUnitsStore > 0 ? (data.units / totalUnitsStore) * 100 : 0;
        return [
          categoryLabels[key],
          formatCurrency(data.value),
          String(data.products.size),
          String(data.units),
          `${percent.toFixed(1)}%`,
        ];
      });

    autoTable(doc, {
      head: [['Categoría', 'Valor USD', 'Productos únicos', 'Unidades', '% del total sucursal']],
      body: rows,
      startY: currentY,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: {
        fillColor: [55, 65, 81],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 35, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 35, halign: 'center' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Detalle de productos por sucursal (para auditoría)
    const storeItems = inventoryItems.filter((item) => item.store_id === store.storeId && item.qty > 0);
    if (storeItems.length > 0) {
      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('Detalle de productos de la sucursal', 16, currentY);
      currentY += 4;

      const detailRows = storeItems.map((item) => [
        item.product?.sku || 'N/A',
        item.product?.name || 'Producto sin nombre',
        item.product?.category || 'sin_categoria',
        String(item.qty),
      ]);

      autoTable(doc, {
        head: [['SKU', 'Producto', 'Categoría', 'Unidades']],
        body: detailRows,
        startY: currentY,
        margin: { left: 14, right: 14 },
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: {
          fillColor: [31, 41, 55],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 70 },
          2: { cellWidth: 35 },
          3: { cellWidth: 20, halign: 'center' },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;
    }
  });

  return doc;
}

