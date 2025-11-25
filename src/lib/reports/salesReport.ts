import jsPDF from 'jspdf';
import autoTable, { RowInput } from 'jspdf-autotable';
import { Sale } from '@/hooks/useSalesData';
import { SalesFilters } from '@/hooks/useSalesData';
import { getCategoryLabel } from '@/constants/categories';

export interface SalesReportOptions {
  sales: Sale[];
  filters: SalesFilters;
  storeName?: string;
  companyName?: string;
  generatedAt?: Date;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string | Date, withTime = false) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: withTime ? '2-digit' : undefined,
    minute: withTime ? '2-digit' : undefined,
    second: withTime ? '2-digit' : undefined,
    hour12: false,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
};

const buildFiltersSummary = (filters: SalesFilters, storeName?: string) => {
  const segments: string[] = [];

  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? formatDate(filters.dateFrom) : 'Inicio';
    const to = filters.dateTo ? formatDate(filters.dateTo) : 'Hoy';
    segments.push(`Rango: ${from} - ${to}`);
  }

  if (storeName) {
    segments.push(`Sucursal: ${storeName}`);
  }

  if (filters.category) {
    segments.push(`Categoría: ${filters.category}`);
  }

  if (filters.cashierId) {
    segments.push(`Cajero: ${filters.cashierId}`);
  }

  if (!segments.length) {
    segments.push('Sin filtros aplicados');
  }

  return segments;
};

export const generateSalesReportPdf = ({
  sales,
  filters,
  storeName,
  companyName = 'Reporte de Ventas',
  generatedAt = new Date(),
}: SalesReportOptions) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let cursorY = margin;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(companyName, pageWidth / 2, cursorY, { align: 'center' });
  cursorY += 6;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generado: ${formatDate(generatedAt, true)}`, margin, cursorY);
  cursorY += 6;

  const filtersSummary = buildFiltersSummary(filters, storeName);
  filtersSummary.forEach((segment) => {
    doc.text(segment, margin, cursorY);
    cursorY += 5;
  });

  cursorY += 2;

  // Ordenar ventas cronológicamente (más reciente primero = descendente)
  const sortedSales = [...sales].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA; // Descendente
  });

  // Formato intercalado: cada venta seguida inmediatamente de sus detalles
  sortedSales.forEach((sale, index) => {
    // Verificar espacio suficiente antes de agregar cada venta
    if (cursorY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      cursorY = margin;
    }

    const saleDate = new Date(sale.created_at);
    const dateStr = formatDate(saleDate, false);
    const timeStr = saleDate.toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    // Formato de información de la venta según ejemplo
    const paymentMethod = sale.payment_method || 'N/A';
    const storeName = sale.store_name || 'N/A';
    const cashierName = sale.cashier_name || 'Sin cajero';
    
    // Primera línea: Método de pago | Tienda | Cajero
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `${paymentMethod} ${storeName} ${cashierName}`,
      margin,
      cursorY,
    );
    
    // Total USD a la derecha
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(
      formatCurrency(sale.total_usd || 0),
      pageWidth - margin,
      cursorY,
      { align: 'right' },
    );
    
    cursorY += 6;

    // Detalles de productos inmediatamente después
    if (sale.items && sale.items.length > 0) {
      // Verificar espacio para la tabla de productos
      if (cursorY > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage();
        cursorY = margin;
      }

      // Título de productos
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Productos de ${sale.invoice_number || sale.id}`,
        margin,
        cursorY,
      );
      
      cursorY += 4;
      
      // Fecha y hora
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`${dateStr} ${timeStr}`, margin, cursorY);
      
      // Cliente en la misma línea o siguiente
      const customerName = sale.customer_name || 'Sin cliente';
      doc.text(customerName, margin + 60, cursorY);
      
      cursorY += 5;
      doc.setTextColor(0, 0, 0);

      autoTable(doc, {
        startY: cursorY,
        head: [['SKU', 'Producto', 'Categoría', 'Cantidad', 'Precio Unit.', 'Subtotal']],
        body: sale.items.map((item) => {
          const category = (item as any).category || (item as any).product?.category || 'N/A';
          const productSku = (item as any).product_sku || item.product_sku || item.product_id || 'N/A';
          const productName = item.product_name || 'Producto sin nombre';
          
          return [
            productSku,
            productName.length > 40 ? productName.substring(0, 37) + '...' : productName,
            getCategoryLabel(category),
            String(item.quantity ?? 0),
            formatCurrency(item.unit_price_usd || 0),
            formatCurrency(item.total_price_usd || 0),
          ];
        }),
        styles: {
          fontSize: 8,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [0, 120, 120],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [250, 252, 254],
        },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: 'normal' }, // SKU
          1: { cellWidth: 50, fontStyle: 'normal' }, // Producto
          2: { cellWidth: 30, halign: 'left' }, // Categoría
          3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, // Cantidad
          4: { cellWidth: 25, halign: 'right' }, // Precio Unit.
          5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }, // Subtotal
        },
        margin: { left: margin, right: margin },
      });

      cursorY = (doc as any).lastAutoTable?.finalY || cursorY + 12;
      
      // Resumen por categoría para esta factura
      const categoryCountMap = new Map<string, number>();
      sale.items.forEach((item) => {
        const category = (item as any).category || (item as any).product?.category || 'sin_categoria';
        const quantity = item.quantity ?? 0;
        const current = categoryCountMap.get(category) || 0;
        categoryCountMap.set(category, current + quantity);
      });
      
      if (categoryCountMap.size > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('Resumen por categoría:', margin, cursorY);
        cursorY += 4;
        
        Array.from(categoryCountMap.entries()).forEach(([category, count]) => {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(`${getCategoryLabel(category)}: ${count} unidad${count !== 1 ? 'es' : ''}`, margin + 5, cursorY);
          cursorY += 4;
        });
        
        cursorY += 2;
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(
        `Total venta: ${formatCurrency(sale.total_usd || 0)}`,
        pageWidth - margin,
        cursorY,
        { align: 'right' },
      );

      cursorY += 8;
    } else {
      // Si no hay items, solo mostrar total
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text(
        `Total venta: ${formatCurrency(sale.total_usd || 0)}`,
        pageWidth - margin,
        cursorY,
        { align: 'right' },
      );
      cursorY += 8;
    }

    // Separador entre ventas (excepto la última)
    if (index < sortedSales.length - 1) {
      cursorY += 4; // Espaciado antes del separador
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 6; // Espaciado después del separador
    }
  });

  let finalY = cursorY;

  // Calcular resumen directamente de las ventas ya filtradas (no aplicar filtros adicionales)
  const totalSales = sales.reduce((sum, sale) => sum + (sale.total_usd || 0), 0);
  const totalCount = sales.length;
  const averageSales = totalCount > 0 ? totalSales / totalCount : 0;

  const summary = {
    count: totalCount,
    totalSales: Math.round(totalSales * 100) / 100,
    averageSales: Math.round(averageSales * 100) / 100,
  };

  if (finalY > doc.internal.pageSize.getHeight() - 40) {
    doc.addPage();
    finalY = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Resumen General', margin, finalY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  const summaryLines = [
    `Ventas registradas: ${summary.count}`,
    `Total facturado: ${formatCurrency(summary.totalSales)}`,
    `Promedio por venta: ${formatCurrency(summary.averageSales)}`,
  ];

  summaryLines.forEach((line, index) => {
    doc.text(line, margin, finalY + 6 + index * 5);
  });

  finalY += 25;

  // Recuento de ventas por categoría
  if (finalY > doc.internal.pageSize.getHeight() - 50) {
    doc.addPage();
    finalY = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Resumen de Ventas por Categoría', margin, finalY);
  finalY += 8;

  // Calcular recuento de ventas y unidades por categoría
  // CORRECCIÓN: Una factura puede tener múltiples categorías, pero debemos contar correctamente
  const categoryCountMap = new Map<string, { invoices: Set<string>; units: number; total: number }>();
  
  sales.forEach((sale) => {
    if (!sale.items || sale.items.length === 0) return;
    
    // Agrupar items por categoría para esta venta
    const categoryUnitsInSale = new Map<string, number>();
    const categoriesInSale = new Set<string>();
    
    sale.items.forEach((item) => {
      const category = (item as any).category || (item as any).product?.category || 'sin_categoria';
      const quantity = item.quantity ?? 0;
      categoriesInSale.add(category);
      
      // Acumular unidades por categoría
      const currentUnits = categoryUnitsInSale.get(category) || 0;
      categoryUnitsInSale.set(category, currentUnits + quantity);
    });
    
    // Para cada categoría única en esta venta, registrar la factura y acumular datos
    categoriesInSale.forEach((category) => {
      const current = categoryCountMap.get(category) || { 
        invoices: new Set<string>(), 
        units: 0, 
        total: 0 
      };
      
      // Agregar esta factura al conjunto de facturas de esta categoría (Set evita duplicados)
      current.invoices.add(sale.id);
      
      // Acumular unidades de esta categoría en esta venta
      current.units += categoryUnitsInSale.get(category) || 0;
      
      // Acumular total de la venta para esta categoría
      // NOTA: Si una factura tiene múltiples categorías, el total se cuenta para cada categoría
      current.total += sale.total_usd || 0;
      
      categoryCountMap.set(category, current);
    });
  });
  
  // Convertir Sets a números para el reporte
  const categoryCountDataMap = new Map<string, { invoices: number; units: number; total: number }>();
  categoryCountMap.forEach((value, category) => {
    categoryCountDataMap.set(category, {
      invoices: value.invoices.size,
      units: value.units,
      total: value.total
    });
  });

  if (categoryCountDataMap.size > 0) {
    const categoryData = Array.from(categoryCountDataMap.entries())
      .map(([category, data]) => [
        getCategoryLabel(category),
        String(data.invoices),
        String(data.units),
        formatCurrency(data.total),
      ])
      .sort((a, b) => parseInt(b[1] as string) - parseInt(a[1] as string));

    autoTable(doc, {
      startY: finalY,
      head: [['Categoría', 'Cantidad de Facturas', 'Unidades Vendidas', 'Total USD']],
      body: categoryData,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [0, 120, 120],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9,
      },
      alternateRowStyles: {
        fillColor: [250, 252, 254],
      },
      columnStyles: {
        0: { cellWidth: 50, fontStyle: 'bold' },
        1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
        2: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      },
      margin: { left: margin, right: margin },
    });

    finalY = (doc as any).lastAutoTable?.finalY || finalY + 40;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text('No hay datos de categorías disponibles.', margin, finalY);
    finalY += 20;
  }

  // Agrupar ventas por sucursal
  const salesByStore = new Map<string, typeof sales>();
  sales.forEach((sale) => {
    const storeName = sale.store_name || 'Sin sucursal';
    if (!salesByStore.has(storeName)) {
      salesByStore.set(storeName, []);
    }
    salesByStore.get(storeName)!.push(sale);
  });

  // Resumen Detallado por Sucursal, Fecha y Categoría (tabla día por día)
  if (finalY > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    finalY = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Resumen Detallado por Sucursal, Fecha y Categoría', margin, finalY);
  finalY += 8;

  // Procesar cada sucursal para mostrar día por día
  salesByStore.forEach((storeSales, storeName) => {
    if (finalY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      finalY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 120, 120);
    doc.text(`Ventas de ${storeName}`, margin, finalY);
    finalY += 6;

    // Agrupar ventas por fecha y categoría
    const salesByDateCategory = new Map<string, Map<string, number>>();
    
    storeSales.forEach((sale) => {
      const saleDate = new Date(sale.created_at);
      const dateKey = saleDate.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const categoriesInSale = new Set<string>();
      
      if (sale.items && sale.items.length > 0) {
        sale.items.forEach((item) => {
          const category = (item as any).category || (item as any).product?.category || 'sin_categoria';
          categoriesInSale.add(category);
        });
      }
      
      // Contar esta venta para cada categoría única en esta fecha
      categoriesInSale.forEach((category) => {
        if (!salesByDateCategory.has(dateKey)) {
          salesByDateCategory.set(dateKey, new Map<string, number>());
        }
        
        const categoryMap = salesByDateCategory.get(dateKey)!;
        const currentCount = categoryMap.get(category) || 0;
        categoryMap.set(category, currentCount + 1);
      });
    });
    
    // Crear tabla de datos día por día
    const summaryData: string[][] = [];
    
    // Ordenar fechas (más reciente primero)
    const sortedDates = Array.from(salesByDateCategory.keys()).sort((a, b) => {
      const dateA = new Date(a.split('/').reverse().join('-'));
      const dateB = new Date(b.split('/').reverse().join('-'));
      return dateB.getTime() - dateA.getTime();
    });
    
    sortedDates.forEach((dateKey) => {
      const categoryMap = salesByDateCategory.get(dateKey)!;
      const categories = Array.from(categoryMap.keys()).sort();
      
      categories.forEach((category) => {
        const count = categoryMap.get(category) || 0;
        summaryData.push([
          dateKey,
          getCategoryLabel(category),
          String(count)
        ]);
      });
    });
    
    if (summaryData.length > 0) {
      autoTable(doc, {
        head: [['Fecha', 'Categoría', 'Cantidad de Ventas']],
        body: summaryData,
        startY: finalY,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 8,
          cellPadding: 3,
          halign: 'left',
        },
        headStyles: {
          fillColor: [0, 120, 120],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [250, 252, 254],
        },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: 'normal' },
          1: { cellWidth: 50, fontStyle: 'normal' },
          2: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
        },
      });
      
      finalY = (doc as any).lastAutoTable?.finalY || finalY + 40;
      finalY += 6; // Espaciado entre sucursales
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('No hay datos de ventas para esta sucursal.', margin + 5, finalY);
      finalY += 10;
    }
  });

  // Totalización por Sucursal y Categoría
  if (finalY > doc.internal.pageSize.getHeight() - 60) {
    doc.addPage();
    finalY = margin;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Totalización por Sucursal y Categoría', margin, finalY);
  finalY += 8;

  // Obtener rango de fechas de los filtros o de las ventas
  let dateFromStr = 'N/A';
  let dateToStr = 'N/A';
  
  if (filters.dateFrom && filters.dateTo) {
    dateFromStr = formatDate(filters.dateFrom, false);
    dateToStr = formatDate(filters.dateTo, false);
  } else if (sales.length > 0) {
    const dates = sales.map(s => new Date(s.created_at)).sort((a, b) => a.getTime() - b.getTime());
    dateFromStr = formatDate(dates[0], false);
    dateToStr = formatDate(dates[dates.length - 1], false);
  }

  // Procesar cada sucursal
  salesByStore.forEach((storeSales, storeName) => {
    if (finalY > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      finalY = margin;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 120, 120);
    doc.text(`Totalización de ${storeName}`, margin, finalY);
    finalY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Fecha de ${dateFromStr} al ${dateToStr}`, margin, finalY);
    finalY += 6;

    // Calcular totales por categoría para esta sucursal
    const categoryTotals = new Map<string, number>();
    
    storeSales.forEach((sale) => {
      if (!sale.items || sale.items.length === 0) return;
      
      sale.items.forEach((item) => {
        const category = (item as any).category || (item as any).product?.category || 'sin_categoria';
        const quantity = item.quantity ?? 0;
        const currentTotal = categoryTotals.get(category) || 0;
        categoryTotals.set(category, currentTotal + quantity);
      });
    });
    
    // Crear tabla de totalización
    const totalizationData: string[][] = [];
    
    // Obtener todas las categorías disponibles para mostrar todas (incluso si no hay ventas)
    const allCategories = ['phones', 'accessories', 'technical_service'];
    
    allCategories.forEach((categoryValue) => {
      const categoryLabel = getCategoryLabel(categoryValue);
      const totalUnits = categoryTotals.get(categoryValue) || 0;
      totalizationData.push([
        categoryLabel,
        String(totalUnits)
      ]);
    });
    
    // Agregar cualquier otra categoría que no esté en la lista predefinida
    categoryTotals.forEach((total, category) => {
      if (!allCategories.includes(category)) {
        totalizationData.push([
          getCategoryLabel(category),
          String(total)
        ]);
      }
    });
    
    if (totalizationData.length > 0) {
      autoTable(doc, {
        head: [['Categoría', 'Total de Artículos Vendidos']],
        body: totalizationData,
        startY: finalY,
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 9,
          cellPadding: 3,
          halign: 'left',
        },
        headStyles: {
          fillColor: [0, 120, 120],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [250, 252, 254],
        },
        columnStyles: {
          0: { cellWidth: 60, fontStyle: 'bold' },
          1: { cellWidth: 50, halign: 'center', fontStyle: 'bold' },
        },
      });
      
      finalY = (doc as any).lastAutoTable?.finalY || finalY + 30;
      finalY += 8; // Espaciado entre sucursales
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('No hay datos de ventas para esta sucursal en el período seleccionado.', margin + 5, finalY);
      finalY += 10;
    }
  });

  return doc;
};




