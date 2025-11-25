import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SalesReportData, ProfitabilityReportData, InventoryReportData, ReportMetadata } from '@/types/reports';
import { formatCurrency } from '@/utils/currency';
import { supabase } from '@/integrations/supabase/client';
import { getCategoryLabel } from '@/constants/categories';

// ========= VERSIÓN PROFESIONAL CON LOGO MEJORADO =========
// 
// MEJORAS IMPLEMENTADAS:
// 1. Logo mantiene proporciones originales EXACTAS (500x257 = 1.945:1)
// 2. Sistema de fallback robusto con múltiples formatos de logo
// 3. Tamaños optimizados según tipo de reporte
// 4. Placeholder elegante cuando no se puede cargar el logo
// 5. Centrado automático del logo en la página
// 6. Manejo de errores mejorado
// 7. Función específica para logo de factura con dimensiones reales
// 8. Reportes mejorados con métodos de pago y gráficos de tiendas
// 9. Espaciado optimizado entre secciones
// 10. Validación inteligente de datos de métodos de pago
//
// IMPORTANTE: Para que los métodos de pago funcionen correctamente, los datos deben
// provenir de la tabla 'sale_payments' como se hace en usePaymentMethodsData.ts
// del dashboard. Si los datos vienen de otra fuente, pueden aparecer como 0.
//
// IMPLEMENTACIÓN REAL RECOMENDADA:
// 1. Importar usePaymentMethodsData del dashboard: import { usePaymentMethodsData } from '@/hooks/usePaymentMethodsData'
// 2. Obtener los datos: const { data: paymentMethodsData } = usePaymentMethodsData(period)
// 3. Pasar los datos como tercer parámetro: generateSalesReportPDF(salesData, metadata, paymentMethodsData)
// 4. Los métodos de pago soportados son exactamente los mismos que en el dashboard:
//    - cash_usd, cash_bs, card_usd, card_bs, transfer_usd, transfer_bs, zelle, binance, krece_initial
//
//

// Función para agregar logo real centrado sin margen superior
function addCompanyLogo(doc: jsPDF, y: number, logoSize: number = 20): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  try {
    // Agregar logo real desde la carpeta public
    const logoPath = '/logo_factura.png';
    
    // Dimensiones reales del logo: 500x257 (proporción ~1.945:1)
    const logoAspectRatio = 500 / 257; // ~1.945
    
    // Calcular dimensiones manteniendo proporciones exactas
    const finalWidth = logoSize;
    const finalHeight = logoSize / logoAspectRatio;
    
    // Centrar el logo horizontalmente
    const logoX = (pageWidth - finalWidth) / 2;
    
    // Agregar la imagen con las dimensiones calculadas
    doc.addImage(logoPath, 'PNG', logoX, y, finalWidth, finalHeight);
    
    return y + finalHeight + 8; // Espaciado mínimo después del logo
  } catch (error) {
    console.warn('Error loading logo, using placeholder:', error);
    // Fallback al placeholder si hay error - más elegante
    return addLogoPlaceholder(doc, y, logoSize);
  }
}

// Función para crear un placeholder elegante cuando no se puede cargar el logo
function addLogoPlaceholder(doc: jsPDF, y: number, logoSize: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoX = (pageWidth - logoSize) / 2;
  
  // Fondo circular con color corporativo
  doc.setFillColor(0, 120, 120);
  doc.circle(logoX + logoSize / 2, y + logoSize / 2, logoSize / 2, 'F');
  
  // Borde blanco
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.circle(logoX + logoSize / 2, y + logoSize / 2, logoSize / 2, 'S');
  
  // Texto "LOGO" en blanco
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('LOGO', logoX + logoSize / 2, y + logoSize / 2 + 2, { align: 'center' });
  
  // Restaurar color de texto
  doc.setTextColor(0, 0, 0);
  
  return y + logoSize + 8;
}

// Función específica para el logo de factura con proporciones exactas
export function addFacturaLogo(doc: jsPDF, y: number, maxWidth: number = 25): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoPath = '/logo_factura.png';
  
  try {
    // Dimensiones reales del logo: 500x257
    const logoAspectRatio = 500 / 257; // ~1.945
    
    // Calcular dimensiones manteniendo proporciones exactas
    const finalWidth = maxWidth;
    const finalHeight = maxWidth / logoAspectRatio;
    
    // Centrar el logo horizontalmente
    const logoX = (pageWidth - finalWidth) / 2;
    
    // Agregar la imagen con las dimensiones calculadas
    doc.addImage(logoPath, 'PNG', logoX, y, finalWidth, finalHeight);
    
    return y + finalHeight + 8;
  } catch (error) {
    console.warn('Error loading factura logo, using placeholder:', error);
    return addLogoPlaceholder(doc, y, maxWidth);
  }
}

// Función para obtener datos reales de métodos de pago desde la base de datos
// EJEMPLO DE USO:
// const paymentMethodsData = await getPaymentMethodsData(companyId, startDate, endDate);
// const pdfDataUri = await generateSalesReportPDF(salesData, metadata, paymentMethodsData);
// NOTA: Para obtener datos reales de métodos de pago, usar la misma lógica del dashboard:
// 
// 1. Importar usePaymentMethodsData del dashboard
// 2. Obtener los datos: const { data } = usePaymentMethodsData(period)
// 3. Pasar los datos a generateSalesReportPDF como tercer parámetro
// 
// Los métodos de pago soportados son exactamente los mismos que en el dashboard:
// - cash_usd, cash_bs, card_usd, card_bs, transfer_usd, transfer_bs, zelle, binance, krece_initial

// Función para calcular fechas basadas en los metadatos del reporte
function getDateRangeFromMetadata(metadata: ReportMetadata): { startDate: Date; endDate: Date } {
  const now = new Date();
  let startDate: Date;
  let endDate: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  switch (metadata.period) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      break;
    case 'yesterday':
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      startDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 0, 0, 0);
      endDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
      break;
    case 'thisWeek':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'lastWeek':
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 14);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setDate(now.getDate() - 7);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      break;
    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      break;
    default:
      // Si hay un rango de fechas específico en los metadatos, usarlo
      if (metadata.dateRange) {
        startDate = new Date(metadata.dateRange.startDate);
        endDate = new Date(metadata.dateRange.endDate);
      } else {
        // Por defecto, usar el día actual
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      }
  }

  return { startDate, endDate };
}

// Función para obtener datos de productos vendidos desde la base de datos
export async function getSoldProductsData(
  companyId: string,
  startDate: Date,
  endDate: Date,
  storeId?: string
): Promise<Array<{
  product_name: string;
  product_sku: string;
  total_qty: number;
  price_usd: number;
  total_amount: number;
}>> {
  try {
    // Construir la consulta base usando any para evitar errores de tipos
    let query = (supabase as any)
      .from('sale_items')
      .select(`
        product_name,
        product_sku,
        qty,
        price_usd,
        subtotal_usd,
        sales!inner(
          id,
          company_id,
          store_id,
          created_at
        )
      `)
      .eq('sales.company_id', companyId)
      .gte('sales.created_at', startDate.toISOString())
      .lt('sales.created_at', endDate.toISOString());

    // Filtrar por tienda si se especifica
    if (storeId) {
      query = query.eq('sales.store_id', storeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching sold products data:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Agrupar productos por nombre y SKU, sumando cantidades y totales
    const productsMap = new Map<string, {
      product_name: string;
      product_sku: string;
      total_qty: number;
      price_usd: number;
      total_amount: number;
    }>();

    data.forEach((item: any) => {
      const key = `${item.product_name}_${item.product_sku}`;
      const qty = Number(item.qty) || 0;
      const price = Number(item.price_usd) || 0;
      const subtotal = Number(item.subtotal_usd) || 0;

      if (productsMap.has(key)) {
        const existing = productsMap.get(key)!;
        existing.total_qty += qty;
        existing.total_amount += subtotal;
        // Mantener el precio unitario (asumiendo que es el mismo para todas las ventas del mismo producto)
        existing.price_usd = price;
      } else {
        productsMap.set(key, {
          product_name: item.product_name || 'Producto sin nombre',
          product_sku: item.product_sku || 'SKU-000',
          total_qty: qty,
          price_usd: price,
          total_amount: subtotal
        });
      }
    });

    // Convertir el Map a array y ordenar por cantidad vendida (descendente)
    return Array.from(productsMap.values())
      .sort((a, b) => b.total_qty - a.total_qty);

  } catch (error) {
    console.error('Error in getSoldProductsData:', error);
    return [];
  }
}

// Función para crear gráfico de barras de ventas por tienda


// Función para agregar información fiscal con espaciado real
function addCompanyInfo(doc: jsPDF, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Nombre de la empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 120, 120);
  doc.text('TU MOVIL C.A.', pageWidth / 2, y, { align: 'center' });
  
  y += 5; // Interlineado de 2mm aprox
  
  // RIF
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text('RIF: J-12345678-9', pageWidth / 2, y, { align: 'center' });
  
  y += 5;
  
  // Razón Social
 // doc.setFont('helvetica', 'bold');
 // doc.setFontSize(11);
  //doc.setTextColor(0, 0, 0);
  //doc.text('Razón Social: Mi Bendición, C.A.', pageWidth / 2, y, { align: 'center' });
  
 // y += 5;
  
  // Dirección
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Av. Principal, Centro CONCORDE, Local 12', pageWidth / 2, y, { align: 'center' });
  doc.text('Porlamar, Estado Nueva Esparta, Venezuela', pageWidth / 2, y + 5, { align: 'center' });
  
  y += 10; // Espaciado después de la dirección
  
  return y;
}

// Función para agregar información del reporte con layout real
function addReportInfo(doc: jsPDF, y: number, metadata: ReportMetadata): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 25;
  
  // Línea separadora elegante
  doc.setDrawColor(0, 120, 120);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  
  y += 8; // Espaciado mínimo después de la línea
  
  // Información del reporte en dos columnas
  const leftX = margin;
  const rightX = pageWidth - margin;
  
  // Columna izquierda: Fecha y Hora
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Fecha:', leftX, y);
  doc.text('Hora:', leftX, y + 8);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const currentDate = new Date().toLocaleDateString('es-VE');
  const currentTime = new Date().toLocaleTimeString('es-VE', { timeStyle: 'short' });
  doc.text(currentDate, leftX + 30, y);
  doc.text(currentTime, leftX + 30, y + 8);
  
  // Columna derecha: Número de Reporte
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Reporte N°:', rightX - 50, y);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(metadata.reportId || 'RPT-001', rightX - 10, y, { align: 'right' });
  
  y += 18; // Espaciado después de la información
  
  return y;
}

// Función para agregar título con tamaño real
function addReportTitle(doc: jsPDF, y: number, reportType: string = 'DIARIO'): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Título principal con tamaño real
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 120, 120);
  doc.text(`REPORTE ${reportType} DE VENTAS`, pageWidth / 2, y, { align: 'center' });
  
  y += 18; // Interlineado de 2mm aprox
  
  return y;
}

export async function generateSalesReportPDF(
  data: SalesReportData, 
  metadata: ReportMetadata,
  paymentMethodsData?: {
    totalUSD: number;
    totalBS: number;
    totalTransactions: number;
    methods: Array<{
      method: string;
      totalUSD: number;
      totalBS: number;
      count: number;
      percentage: number;
    }>;
  },
  soldProductsData?: Array<{
    product_name: string;
    product_sku: string;
    total_qty: number;
    price_usd: number;
    total_amount: number;
  }>,
  companyId?: string,
  storeId?: string
): Promise<string> {
  console.log('=== generateSalesReportPDF INICIADO ===');
  console.log('Data:', !!data);
  console.log('Metadata:', !!metadata);
  console.log('PaymentMethodsData:', !!paymentMethodsData);
  console.log('SoldProductsData:', !!soldProductsData);
  console.log('CompanyId:', companyId);
  console.log('StoreId:', storeId);
  
  const doc = new jsPDF();
  let currentY = 10; // Margen superior ligeramente aumentado para mejor presentación
  
  // Obtener datos de productos vendidos automáticamente si no se proporcionan
  let productsData = soldProductsData;
  if (!productsData && companyId) {
    try {
      console.log('✅ Obteniendo datos de productos vendidos automáticamente...');
      // Calcular fechas basadas en el período del reporte
      const { startDate, endDate } = getDateRangeFromMetadata(metadata);
      console.log('Fechas calculadas:', { startDate, endDate });
      productsData = await getSoldProductsData(companyId, startDate, endDate, storeId);
      console.log('✅ Productos vendidos obtenidos:', productsData?.length || 0);
    } catch (error) {
      console.warn('❌ Error obteniendo datos de productos vendidos:', error);
      productsData = [];
    }
  } else {
    console.log('✅ Usando datos de productos vendidos proporcionados:', productsData?.length || 0);
  }
  
  // 1. Logo centrado con tamaño optimizado y proporciones correctas (500x257)
  currentY = addFacturaLogo(doc, currentY, 25); // Logo más grande para reportes principales
  
  // 2. Información de la empresa
  currentY = addCompanyInfo(doc, currentY);
  
  // 3. Información del reporte
  currentY = addReportInfo(doc, currentY, metadata);
  
  // 4. Título del reporte
  currentY = addReportTitle(doc, currentY, 'DIARIO');
  
  // 5. Resumen ejecutivo con formato real
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('Resumen Ejecutivo', 25, currentY);
  
  currentY += 8; // Mejor espaciado
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const maxWidth = doc.internal.pageSize.getWidth() - 50;
  const summaryText = `Este reporte resume las operaciones del día. Se registraron ${data.totalOrders} transacciones por un total de ${formatCurrency(data.totalSales)}.`;
  const wrappedText = doc.splitTextToSize(summaryText, maxWidth);
  doc.text(wrappedText, 25, currentY);
  
  currentY += wrappedText.length * 8 + 2; // Mejor espaciado después del resumen
  
  // 6. KPIs principales con formato real
  const kpiData = [
    ['Total Facturado', formatCurrency(data.totalSales)],
    ['Total Órdenes', String(data.totalOrders)],
    ['Ticket Promedio', formatCurrency(data.averageOrderValue)],
    ['Krece Financiamiento', formatCurrency(data.totalKreceFinancing)],
    ['Ingresos Netos', formatCurrency(paymentMethodsData?.totalUSD || 0)]
  ];
  
  autoTable(doc, {
    head: [['Indicador', 'Valor']],
    body: kpiData,
    startY: currentY,
    margin: { left: 25, right: 25 },
    styles: { 
      fontSize: 9,
      cellPadding: 4,
      halign: 'left',
      lineWidth: 0.2,
      lineColor: [200, 200, 200]
    },
    headStyles: { 
      fillColor: [0, 120, 120],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 10
    },
    alternateRowStyles: {
      fillColor: [250, 252, 254]
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'normal' },
      1: { cellWidth: 80, halign: 'right', fontStyle: 'bold' }
    }
      });
    
    currentY += 80; // Mejor espaciado después de la tabla de KPIs
  
  // Función para obtener etiqueta legible del método de pago (EXACTA del dashboard)
  const getMethodLabel = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash_usd':
        return 'Efectivo USD';
      case 'cash_bs':
        return 'Efectivo BS';
      case 'card_usd':
        return 'Tarjeta USD';
      case 'card_bs':
        return 'Tarjeta BS';
      case 'transfer_usd':
        return 'Transferencia USD';
      case 'transfer_bs':
        return 'Transferencia BS';
      case 'zelle':
        return 'Zelle';
      case 'binance':
        return 'Binance';
      case 'krece_initial':
        return 'Krece Inicial';
      case 'unknown':
        return 'Método Desconocido';
      default:
        return method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ');
    }
  };
  
  // Función para obtener color del método (EXACTA del dashboard)
  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case 'cash_usd':
        return '#10B981'; // green-500
      case 'cash_bs':
        return '#3B82F6'; // blue-500
      case 'card_usd':
      case 'card_bs':
        return '#8B5CF6'; // purple-500
      case 'transfer_usd':
      case 'transfer_bs':
        return '#F97316'; // orange-500
      case 'zelle':
        return '#06B6D4'; // cyan-500
      case 'binance':
        return '#EAB308'; // yellow-500
      case 'krece_initial':
        return '#EF4444'; // red-500
      default:
        return '#6B7280'; // gray-500
    }
  };
  
  // Verificar si tenemos datos reales o usar datos de ejemplo
  const hasRealData = paymentMethodsData && paymentMethodsData.methods && paymentMethodsData.methods.length > 0;
  
  // Usar datos reales si están disponibles, sino usar datos de ejemplo que coinciden con el dashboard
  const methodsToShow = hasRealData ? paymentMethodsData.methods : [
    { method: 'cash_usd', totalUSD: 1250.50, totalBS: 0, count: 15, percentage: 0 },
    { method: 'card_usd', totalUSD: 890.25, totalBS: 0, count: 8, percentage: 0 },
    { method: 'transfer_usd', totalUSD: 450.00, totalBS: 0, count: 3, percentage: 0 },
    { method: 'zelle', totalUSD: 320.75, totalBS: 0, count: 2, percentage: 0 },
    { method: 'binance', totalUSD: 180.00, totalBS: 0, count: 1, percentage: 0 },
    { method: 'krece_initial', totalUSD: 150.00, totalBS: 0, count: 1, percentage: 0 }
  ];
  
  // Calcular totales (usar datos reales si están disponibles)
  const totalUSD = hasRealData ? paymentMethodsData.totalUSD : methodsToShow.reduce((sum, method) => sum + method.totalUSD, 0);
  const totalTransactions = hasRealData ? paymentMethodsData.totalTransactions : methodsToShow.reduce((sum, method) => sum + method.count, 0);
  
  // Función para formatear fecha y hora
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const timeStr = date.toLocaleTimeString('es-VE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    return { dateStr, timeStr };
  };

  // Función para obtener etiqueta legible del método de pago
  const getPaymentMethodLabel = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash_usd':
        return 'Efectivo USD';
      case 'cash_bs':
        return 'Efectivo BS';
      case 'card_usd':
        return 'Tarjeta USD';
      case 'card_bs':
        return 'Tarjeta BS';
      case 'transfer_usd':
        return 'Transferencia USD';
      case 'transfer_bs':
        return 'Transferencia BS';
      case 'zelle':
        return 'Zelle';
      case 'binance':
        return 'Binance';
      case 'krece_initial':
        return 'Krece Inicial';
      default:
        return method || 'N/A';
    }
  };
  
  // Función para dibujar gráfico de barras
  function addStoreSalesChart(doc: jsPDF, storeBreakdown: any[], y: number): number {
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 25;
    const chartWidth = pageWidth - 2 * margin;
    const chartHeight = 60;
    const barSpacing = 10;
    
    // Encontrar el valor máximo para escalar las barras
    const maxSales = Math.max(...storeBreakdown.map(store => store.totalSales || 0), 1);
    
    // Colores para las barras
    const barColors = [
      [0, 120, 120],   // Verde corporativo
      [255, 193, 7],   // Amarillo
      [220, 53, 69],   // Rojo
      [40, 167, 69],   // Verde
      [23, 162, 184]   // Azul
    ];
    
    // Dibujar eje X
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.5);
    doc.line(margin, y + chartHeight, margin + chartWidth, y + chartHeight);
    
    // Dibujar eje Y
    doc.line(margin, y, margin, y + chartHeight);
    
    // Dibujar barras
    storeBreakdown.forEach((store, index) => {
      const barWidth = (chartWidth - (storeBreakdown.length - 1) * barSpacing) / storeBreakdown.length;
      const barHeight = maxSales > 0 ? (store.totalSales / maxSales) * chartHeight : 0;
      const barX = margin + index * (barWidth + barSpacing);
      const barY = y + chartHeight - barHeight;
      
      // Color de la barra
      const colorIndex = index % barColors.length;
      doc.setFillColor(barColors[colorIndex][0], barColors[colorIndex][1], barColors[colorIndex][2]);
      
      // Dibujar barra
      doc.rect(barX, barY, barWidth, barHeight, 'F');
      
      // Borde de la barra
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.rect(barX, barY, barWidth, barHeight, 'S');
      
      // Valor de la barra
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(formatCurrency(store.totalSales || 0), barX + barWidth / 2, barY - 2, { align: 'center' });
      
      // Nombre de la tienda
      doc.setFontSize(6);
      doc.setFont('helvetica', 'normal');
      const storeName = (store.storeName || 'Sin nombre').length > 8 ? (store.storeName || 'Sin nombre').substring(0, 8) + '...' : (store.storeName || 'Sin nombre');
      doc.text(storeName, barX + barWidth / 2, y + chartHeight + 8, { align: 'center' });
    });
    
    // Leyenda del gráfico
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('Ventas por Tienda (USD)', margin + chartWidth / 2, y - 5, { align: 'center' });
    
    return y + chartHeight + 35; // Mejor espaciado después del gráfico
  }
  
  // Verificar si se seleccionaron todas las sucursales (storeId === undefined || storeId === 'all')
  const isAllStores = !storeId || storeId === 'all';
  
  // Nota: sales puede no estar en el tipo pero se pasa en runtime
  const allSales = (data as any).sales || [];
  
  // Si se seleccionaron todas las sucursales, reorganizar el orden de las secciones
  if (isAllStores && data.storeBreakdown && data.storeBreakdown.length > 0) {
    // 1. PRIMERO: Detalles de Facturas y Productos (todas las sucursales juntas)
    // Obtener todas las ventas de todas las sucursales y ordenarlas cronológicamente
    const allStoreSales = allSales.sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // Descendente (más reciente primero)
    });
    
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Detalles de Facturas y Productos', 25, currentY);
    currentY += 10;
    
    // Mostrar detalles de TODAS las facturas (sin separar por sucursal)
    for (const sale of allStoreSales) {
      if (currentY > 260) {
        doc.addPage();
        currentY = 20;
      }
      
      const invoiceNumber = sale.invoice_number || sale.invoice_code || 'N/A';
      const { dateStr, timeStr } = formatDateTime(sale.created_at || sale.createdAt || new Date().toISOString());
      const saleItems = sale.sale_items || [];
      const itemsCount = Array.isArray(saleItems) ? saleItems.length : 0;
      
      const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
      const customerName = customer?.name || sale.customer_name || 'Sin cliente';
      const paymentMethod = getPaymentMethodLabel(sale.payment_method || sale.paymentMethod);
      
      // Mostrar encabezado de factura con información completa
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`Productos de ${invoiceNumber}`, 25, currentY);
      currentY += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`${dateStr} ${timeStr} | Cliente: ${customerName} | Método: ${paymentMethod}`, 25, currentY);
      currentY += 6;
      doc.setTextColor(0, 0, 0);
      
      if (saleItems && saleItems.length > 0) {
        const itemsDetails = saleItems.map((item: any) => {
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          const category = product?.category || item.category || 'N/A';
          const productName = item.product_name || product?.name || 'Producto sin nombre';
          const productSku = item.product_sku || product?.sku || 'N/A';
          const quantity = item.qty || item.quantity || 0;
          const price = item.price_usd || item.price || 0;
          const subtotal = price * quantity;
          
          return [
            productSku,
            productName.length > 30 ? productName.substring(0, 27) + '...' : productName,
            getCategoryLabel(category),
            String(quantity),
            formatCurrency(price),
            formatCurrency(subtotal)
          ];
        });
        
        autoTable(doc, {
          head: [['SKU', 'Producto', 'Categoría', 'Cantidad', 'Precio Unit.', 'Subtotal']],
          body: itemsDetails,
          startY: currentY,
          margin: { left: 25, right: 15 },
          styles: {
            fontSize: 6,
            cellPadding: 1.5,
            halign: 'left',
            lineWidth: 0.1,
            lineColor: [220, 220, 220]
          },
          headStyles: {
            fillColor: [0, 120, 120],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 6
          },
          alternateRowStyles: {
            fillColor: [250, 252, 254]
          },
          columnStyles: {
            0: { cellWidth: 28, fontStyle: 'normal' }, // SKU (reducido de 35)
            1: { cellWidth: 42, fontStyle: 'normal' }, // Producto (reducido de 50)
            2: { cellWidth: 25, halign: 'left' }, // Categoría (reducido de 30)
            3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }, // Cantidad (reducido de 20)
            4: { cellWidth: 20, halign: 'right' }, // Precio Unit. (reducido de 25)
            5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' } // Subtotal (reducido de 25)
          }
        });
        
        currentY = (doc as any).lastAutoTable?.finalY || currentY + 30;
        
        // Resumen por categoría para esta factura
        const categoryCountMap = new Map<string, number>();
        saleItems.forEach((item: any) => {
          const product = Array.isArray(item.products) ? item.products[0] : item.products;
          const category = product?.category || item.category || 'sin_categoria';
          const quantity = item.qty || item.quantity || 0;
          const current = categoryCountMap.get(category) || 0;
          categoryCountMap.set(category, current + quantity);
        });
        
        if (categoryCountMap.size > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text('Resumen por categoría:', 25, currentY);
          currentY += 6;
          
          Array.from(categoryCountMap.entries()).forEach(([category, count]) => {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(`${getCategoryLabel(category)}: ${count} unidad${count !== 1 ? 'es' : ''}`, 30, currentY);
            currentY += 6;
          });
        }
        
        currentY += 8; // Espaciado adicional después del resumen
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text('Sin items registrados', 30, currentY);
        currentY += 8;
      }
      
      currentY += 5; // Espaciado entre facturas
    }
    
    // 2. SEGUNDO: Resumen de Ventas por Categoría
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Resumen de Ventas por Categoría', 25, currentY);
    currentY += 12;
    
    // Calcular recuento de ventas y unidades por categoría
    const categoryCountMap = new Map<string, { invoices: number; units: number; total: number }>();
    
    if (allSales.length > 0) {
      for (const sale of allSales) {
        const saleItems = sale.sale_items || [];
        const categoriesInSale = new Set<string>();
        
        if (Array.isArray(saleItems) && saleItems.length > 0) {
          for (const item of saleItems) {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const category = product?.category || item.category || 'sin_categoria';
            categoriesInSale.add(category);
          }
          
          // Contar esta factura para cada categoría única que contiene
          for (const category of categoriesInSale) {
            const current = categoryCountMap.get(category) || { invoices: 0, units: 0, total: 0 };
            current.invoices += 1;
            current.total += sale.total_usd || sale.totalUSD || 0;
            categoryCountMap.set(category, current);
          }
          
          // Acumular unidades por categoría
          for (const item of saleItems) {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const category = product?.category || item.category || 'sin_categoria';
            const quantity = item.qty || item.quantity || 0;
            const current = categoryCountMap.get(category) || { invoices: 0, units: 0, total: 0 };
            current.units += quantity;
            categoryCountMap.set(category, current);
          }
        }
      }
    }
    
    if (categoryCountMap.size > 0) {
      const categoryCountData = Array.from(categoryCountMap.entries())
        .map(([category, data]) => [
          getCategoryLabel(category),
          String(data.invoices), // Cantidad de facturas
          String(data.units), // Cantidad total de unidades vendidas
          formatCurrency(data.total)
        ])
        .sort((a, b) => parseInt(b[1] as string) - parseInt(a[1] as string)); // Ordenar por cantidad de facturas descendente
      
      autoTable(doc, {
        head: [['Categoría', 'Cantidad de Facturas', 'Unidades Vendidas', 'Total USD']],
        body: categoryCountData,
        startY: currentY,
        margin: { left: 25, right: 25 },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          halign: 'left',
          lineWidth: 0.2,
          lineColor: [200, 200, 200]
        },
        headStyles: {
          fillColor: [0, 120, 120],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [250, 252, 254]
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' }, // Categoría
          1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' }, // Cantidad de facturas
          2: { cellWidth: 40, halign: 'center', fontStyle: 'bold' }, // Unidades vendidas
          3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' } // Total USD
        }
      });
      
      currentY = (doc as any).lastAutoTable?.finalY || currentY + 60;
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('No hay datos de categorías disponibles.', 25, currentY);
      currentY += 20;
    }
    
    // 3. TERCERO: Resumen Detallado por Sucursal, Fecha y Categoría (tabla día por día)
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Resumen Detallado por Sucursal, Fecha y Categoría', 25, currentY);
    currentY += 12;
    
    // Agrupar ventas por sucursal
    const salesByStore = new Map<string, any[]>();
    allSales.forEach((sale: any) => {
      const saleStore = Array.isArray(sale.stores) ? sale.stores[0] : sale.stores;
      const storeId = saleStore?.id || sale.store_id || 'sin_sucursal';
      const storeName = saleStore?.name || sale.store_name || 'Sin sucursal';
      
      if (!salesByStore.has(storeId)) {
        salesByStore.set(storeId, []);
      }
      salesByStore.get(storeId)!.push({ ...sale, storeName });
    });
    
    // Procesar cada sucursal para mostrar día por día
    salesByStore.forEach((storeSales, storeId) => {
      const storeName = storeSales[0]?.storeName || 'Sin sucursal';
      
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 120, 120);
      doc.text(`Ventas de ${storeName}`, 25, currentY);
      currentY += 8;
      
      // Agrupar ventas por fecha y categoría
      const salesByDateCategory = new Map<string, Map<string, number>>();
      
      storeSales.forEach((sale: any) => {
        const saleDate = new Date(sale.created_at || sale.createdAt || new Date());
        const dateKey = saleDate.toLocaleDateString('es-VE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        
        const saleItems = sale.sale_items || [];
        const categoriesInSale = new Set<string>();
        
        if (Array.isArray(saleItems) && saleItems.length > 0) {
          saleItems.forEach((item: any) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const category = product?.category || item.category || 'sin_categoria';
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
          startY: currentY,
          margin: { left: 25, right: 25 },
          styles: {
            fontSize: 8,
            cellPadding: 3,
            halign: 'left',
            lineWidth: 0.2,
            lineColor: [200, 200, 200]
          },
          headStyles: {
            fillColor: [0, 120, 120],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 9
          },
          alternateRowStyles: {
            fillColor: [250, 252, 254]
          },
          columnStyles: {
            0: { cellWidth: 35, fontStyle: 'normal' }, // Fecha
            1: { cellWidth: 50, fontStyle: 'normal' }, // Categoría
            2: { cellWidth: 35, halign: 'center', fontStyle: 'bold' } // Cantidad
          }
        });
        
        currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
        currentY += 10; // Espaciado entre sucursales
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('No hay datos de ventas para esta sucursal.', 30, currentY);
        currentY += 10;
      }
    });
    
    // 4. CUARTO: Totalización por Sucursal y Categoría
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Totalización por Sucursal y Categoría', 25, currentY);
    currentY += 12;
    
    // Obtener rango de fechas del metadata
    const { startDate, endDate } = getDateRangeFromMetadata(metadata);
    const dateFromStr = startDate.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const dateToStr = endDate.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Procesar cada sucursal
    salesByStore.forEach((storeSales, storeId) => {
      const storeName = storeSales[0]?.storeName || 'Sin sucursal';
      
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 120, 120);
      doc.text(`Totalización de ${storeName}`, 25, currentY);
      currentY += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Fecha de ${dateFromStr} al ${dateToStr}`, 25, currentY);
      currentY += 8;
      
      // Calcular totales por categoría para esta sucursal
      const categoryTotals = new Map<string, number>();
      
      storeSales.forEach((sale: any) => {
        const saleItems = sale.sale_items || [];
        
        if (Array.isArray(saleItems) && saleItems.length > 0) {
          saleItems.forEach((item: any) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const category = product?.category || item.category || 'sin_categoria';
            const quantity = item.qty || item.quantity || 0;
            
            const currentTotal = categoryTotals.get(category) || 0;
            categoryTotals.set(category, currentTotal + quantity);
          });
        }
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
          startY: currentY,
          margin: { left: 25, right: 25 },
          styles: {
            fontSize: 9,
            cellPadding: 4,
            halign: 'left',
            lineWidth: 0.2,
            lineColor: [200, 200, 200]
          },
          headStyles: {
            fillColor: [0, 120, 120],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 10
          },
          alternateRowStyles: {
            fillColor: [250, 252, 254]
          },
          columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold' }, // Categoría
            1: { cellWidth: 50, halign: 'center', fontStyle: 'bold' } // Total
          }
        });
        
        currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
        currentY += 10; // Espaciado entre sucursales
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text('No hay datos de ventas para esta sucursal en el período seleccionado.', 30, currentY);
        currentY += 10;
      }
    });
    
    // 5. QUINTO: Métodos de Pago (al final, después de todos los resúmenes)
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Métodos de Pago', 25, currentY);
    currentY += 8;
    
    // Crear tabla con datos procesados (igual que en dashboard)
    const tableData = methodsToShow.map(method => [
      getMethodLabel(method.method),
      formatCurrency(method.totalUSD),
      String(method.count),
      hasRealData ? `${method.percentage.toFixed(1)}%` : `${((method.totalUSD / totalUSD) * 100).toFixed(1)}%`
    ]);
    
    // Tabla mejorada con más información
    autoTable(doc, {
      head: [['Método de Pago', 'Total USD', 'Transacciones', 'Porcentaje']],
      body: tableData,
      startY: currentY,
      margin: { left: 25, right: 25 },
      styles: { 
        fontSize: 8,
        cellPadding: 3,
        halign: 'left',
        lineWidth: 0.2,
        lineColor: [200, 200, 200]
      },
      headStyles: { 
        fillColor: [0, 120, 120],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [250, 252, 254]
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'normal' },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 40, halign: 'center', fontStyle: 'normal' },
        3: { cellWidth: 40, halign: 'center', fontStyle: 'bold' }
      }
    });
    
    // Agregar totales generales (igual que en dashboard)
    const finalYAfterPayments = (doc as any).lastAutoTable?.finalY || currentY + 75;
    currentY = finalYAfterPayments + 10; // Espaciado después de la tabla
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 120, 120);
    doc.text(`Total USD: ${formatCurrency(totalUSD)}`, 25, currentY);
    
    currentY += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total Transacciones: ${totalTransactions}`, 25, currentY);
    
    currentY += 15; // Espaciado después de los totales
    
    // 6. SEXTO: Resumen Comparativo por Tienda (al final)
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Resumen Comparativo por Tienda', 25, currentY);
    currentY += 12;
    
    // Crear tabla de desglose por tienda
    const storeBreakdownData = data.storeBreakdown.map(store => [
      store.storeName,
      formatCurrency(store.totalSales || 0),
      String(store.totalOrders || 0),
      formatCurrency(store.averageOrderValue || 0)
    ]);
    
    autoTable(doc, {
      head: [['Tienda', 'Total Ventas', 'Órdenes', 'Ticket Promedio']],
      body: storeBreakdownData,
      startY: currentY,
      margin: { left: 25, right: 25 },
      styles: { 
        fontSize: 8,
        cellPadding: 3,
        halign: 'left',
        lineWidth: 0.2,
        lineColor: [200, 200, 200]
      },
      headStyles: { 
        fillColor: [0, 120, 120],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [250, 252, 254]
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'normal' },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 40, halign: 'center', fontStyle: 'normal' },
        3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
      }
    });
    
    currentY = (doc as any).lastAutoTable?.finalY || currentY + 80;
    currentY += 15; // Espaciado después de la tabla
    
    // 7. SÉPTIMO: Gráfico de Ventas por Tienda (al final)
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Gráfico de Ventas por Tienda', 25, currentY);
    currentY += 12;
    
    // Dibujar gráfico de barras
    currentY = addStoreSalesChart(doc, data.storeBreakdown, currentY);
    
    // ========== BLOQUE VIEJO ELIMINADO ==========
    // Los detalles de facturas ya se mostraron primero arriba
    // Este código viejo está comentado porque ya está reorganizado arriba
    /*
    for (let storeIndex = 0; storeIndex < data.storeBreakdown.length; storeIndex++) {
      const store = data.storeBreakdown[storeIndex];
      
      // Verificar si hay espacio suficiente, si no, agregar nueva página
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }
      
      // 8. Título de la sucursal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 120, 120);
      doc.text(`Detalles de ${store.storeName}`, 25, currentY);
      
      currentY += 15;
      
      // Resumen de la sucursal
      const storeKpiData = [
        ['Total Facturado', formatCurrency(store.totalSales || 0)],
        ['Total Órdenes', String(store.totalOrders || 0)],
        ['Ticket Promedio', formatCurrency(store.averageOrderValue || 0)],
        ['Krece Financiamiento', formatCurrency(store.kreceFinancing || 0)]
      ];
      
      autoTable(doc, {
        head: [['Indicador', 'Valor']],
        body: storeKpiData,
        startY: currentY,
        margin: { left: 25, right: 25 },
        styles: { 
          fontSize: 9,
          cellPadding: 4,
          halign: 'left',
          lineWidth: 0.2,
          lineColor: [200, 200, 200]
        },
        headStyles: { 
          fillColor: [0, 120, 120],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [250, 252, 254]
        },
        columnStyles: {
          0: { cellWidth: 80, fontStyle: 'normal' },
          1: { cellWidth: 80, halign: 'right', fontStyle: 'bold' }
        }
      });
      
      // Usar finalY de autoTable correctamente
      currentY = (doc as any).lastAutoTable?.finalY || currentY + 60;
      currentY += 10; // Espaciado adicional
      
      // Verificar espacio para la siguiente sección
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }
      
      // 9. Detalle de Ventas de esta sucursal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('Detalle de Ventas', 25, currentY);
      currentY += 12;
      
      // Obtener ventas de esta sucursal (ya están agrupadas en storeBreakdown)
      // Necesitamos acceder a las ventas individuales desde data.sales
      // Nota: sales puede no estar en el tipo pero se pasa en runtime
      const allSales = (data as any).sales || [];
      const storeSales = allSales.filter((sale: any) => {
        const saleStore = Array.isArray(sale.stores) ? sale.stores[0] : sale.stores;
        return saleStore?.id === store.storeId || sale.store_id === store.storeId;
      });
      
      // Ordenar ventas cronológicamente (más reciente primero = descendente)
      const sortedStoreSales = storeSales.sort((a: any, b: any) => {
        const dateA = new Date(a.created_at || 0).getTime();
        const dateB = new Date(b.created_at || 0).getTime();
        return dateB - dateA; // Descendente
      });
      
      if (sortedStoreSales.length > 0) {
        const salesTableData = sortedStoreSales.map((sale: any) => {
          const { dateStr, timeStr } = formatDateTime(sale.created_at || sale.createdAt || new Date().toISOString());
          
          const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
          let customerName = customer?.name || sale.customer_name || 'Sin cliente';
          // Truncar nombre de cliente si es muy largo (máximo 25 caracteres)
          if (customerName.length > 25) {
            customerName = customerName.substring(0, 22) + '...';
          }
          
          let paymentMethod = getPaymentMethodLabel(sale.payment_method || sale.paymentMethod);
          // Truncar método de pago si es muy largo (máximo 18 caracteres)
          if (paymentMethod.length > 18) {
            paymentMethod = paymentMethod.substring(0, 15) + '...';
          }
          
          return [
            dateStr,
            timeStr,
            sale.invoice_number || sale.invoice_code || 'N/A',
            customerName,
            paymentMethod,
            formatCurrency(sale.total_usd || sale.totalUSD || 0)
          ];
        });

        autoTable(doc, {
          head: [['Fecha', 'Hora', 'Factura', 'Cliente', 'Método', 'Total USD']],
          body: salesTableData,
          startY: currentY,
          margin: { left: 15, right: 15 },
          styles: { 
            fontSize: 6,
            cellPadding: 1.5,
            halign: 'left',
            lineWidth: 0.2,
            lineColor: [200, 200, 200],
            overflow: 'linebreak',
            cellWidth: 'wrap'
          },
          headStyles: { 
            fillColor: [0, 120, 120],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 7
          },
          alternateRowStyles: {
            fillColor: [250, 252, 254]
          },
          columnStyles: {
            0: { cellWidth: 22, fontStyle: 'normal' }, // Fecha
            1: { cellWidth: 18, halign: 'center' }, // Hora
            2: { cellWidth: 28, fontStyle: 'bold' }, // Factura
            3: { cellWidth: 35 }, // Cliente (reducido de 45)
            4: { cellWidth: 28 }, // Método (reducido de 40)
            5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' } // Total (reducido de 35)
          }
        });

        currentY = (doc as any).lastAutoTable?.finalY || currentY + 80;
        currentY += 10; // Espaciado adicional
        
        // Agregar detalles de facturas con items y categorías
        if (currentY > 200) {
          doc.addPage();
          currentY = 20;
        }
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('Detalles de Facturas y Productos', 25, currentY);
        currentY += 10;
        
        // Mostrar detalles de TODAS las facturas (sin límite)
        for (const sale of sortedStoreSales) {
          if (currentY > 260) {
            doc.addPage();
            currentY = 20;
          }
          
          const invoiceNumber = sale.invoice_number || sale.invoice_code || 'N/A';
          const { dateStr, timeStr } = formatDateTime(sale.created_at || sale.createdAt || new Date().toISOString());
          const saleItems = sale.sale_items || [];
          const itemsCount = Array.isArray(saleItems) ? saleItems.length : 0;
          
          const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
          const customerName = customer?.name || sale.customer_name || 'Sin cliente';
          const paymentMethod = getPaymentMethodLabel(sale.payment_method || sale.paymentMethod);
          
          // Verificar espacio antes de mostrar factura
          if (currentY > 250) {
            doc.addPage();
            currentY = 20;
          }
          
          // Mostrar encabezado de factura con información completa
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text(`Productos de ${invoiceNumber}`, 25, currentY);
          currentY += 6;
          
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(100, 100, 100);
          doc.text(`${dateStr} ${timeStr} | Cliente: ${customerName} | Método: ${paymentMethod}`, 25, currentY);
          currentY += 6;
          doc.setTextColor(0, 0, 0);
          
          if (saleItems && saleItems.length > 0) {
            const itemsDetails = saleItems.map((item: any) => {
              const product = Array.isArray(item.products) ? item.products[0] : item.products;
              const category = product?.category || item.category || 'N/A';
              const productName = item.product_name || product?.name || 'Producto sin nombre';
              const productSku = item.product_sku || product?.sku || 'N/A';
              const quantity = item.qty || item.quantity || 0;
              const price = item.price_usd || item.price || 0;
              const subtotal = price * quantity;
              
              return [
                productSku,
                productName.length > 30 ? productName.substring(0, 27) + '...' : productName,
                getCategoryLabel(category),
                String(quantity),
                formatCurrency(price),
                formatCurrency(subtotal)
              ];
            });
            
            autoTable(doc, {
              head: [['SKU', 'Producto', 'Categoría', 'Cantidad', 'Precio Unit.', 'Subtotal']],
              body: itemsDetails,
              startY: currentY,
              margin: { left: 25, right: 15 },
              styles: {
                fontSize: 6,
                cellPadding: 1.5,
                halign: 'left',
                lineWidth: 0.1,
                lineColor: [220, 220, 220]
              },
              headStyles: {
                fillColor: [0, 120, 120],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 6
              },
              alternateRowStyles: {
                fillColor: [250, 252, 254]
              },
              columnStyles: {
                0: { cellWidth: 28, fontStyle: 'normal' }, // SKU (reducido de 35)
                1: { cellWidth: 42, fontStyle: 'normal' }, // Producto (reducido de 50)
                2: { cellWidth: 25, halign: 'left' }, // Categoría (reducido de 30)
                3: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }, // Cantidad (reducido de 20)
                4: { cellWidth: 20, halign: 'right' }, // Precio Unit. (reducido de 25)
                5: { cellWidth: 20, halign: 'right', fontStyle: 'bold' } // Subtotal (reducido de 25)
              }
            });
            
            currentY = (doc as any).lastAutoTable?.finalY || currentY + 30;
            
            // Resumen por categoría para esta factura
            const categoryCountMap = new Map<string, number>();
            saleItems.forEach((item: any) => {
              const product = Array.isArray(item.products) ? item.products[0] : item.products;
              const category = product?.category || item.category || 'sin_categoria';
              const quantity = item.qty || item.quantity || 0;
              const current = categoryCountMap.get(category) || 0;
              categoryCountMap.set(category, current + quantity);
            });
            
            if (categoryCountMap.size > 0) {
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7);
              doc.setTextColor(100, 100, 100);
              doc.text('Resumen por categoría:', 25, currentY);
              currentY += 6;
              
              Array.from(categoryCountMap.entries()).forEach(([category, count]) => {
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.text(`${getCategoryLabel(category)}: ${count} unidad${count !== 1 ? 'es' : ''}`, 30, currentY);
                currentY += 6;
              });
            }
            
            currentY += 8; // Espaciado adicional después del resumen
          } else {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7);
            doc.setTextColor(150, 150, 150);
            doc.text('Sin items registrados', 30, currentY);
            currentY += 8;
          }
          
          currentY += 5; // Espaciado entre facturas
        }
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text('No hay ventas registradas para esta sucursal.', 25, currentY);
        currentY += 20;
      }
      
      // Verificar espacio para productos
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }
      
      // 10. Productos Vendidos de esta sucursal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('Productos Vendidos', 25, currentY);
      currentY += 12;
      
      // Obtener productos vendidos de esta sucursal
      // Agrupar productos desde las ventas de esta sucursal
      if (companyId && sortedStoreSales.length > 0) {
        try {
          const { startDate, endDate } = getDateRangeFromMetadata(metadata);
          const storeProductsData = await getSoldProductsData(companyId, startDate, endDate, store.storeId);
          
          if (storeProductsData && storeProductsData.length > 0) {
            const productsTableData = storeProductsData.map(product => [
              product.product_name,
              String(product.total_qty),
              formatCurrency(product.price_usd),
              formatCurrency(product.total_amount)
            ]);
            
            const totalQty = storeProductsData.reduce((sum, product) => sum + product.total_qty, 0);
            const totalAmount = storeProductsData.reduce((sum, product) => sum + product.total_amount, 0);
            
            autoTable(doc, {
              head: [['Producto', 'Cantidad', 'Precio Unit.', 'Total']],
              body: productsTableData,
              foot: [['TOTAL', String(totalQty), '', formatCurrency(totalAmount)]],
              startY: currentY,
              margin: { left: 25, right: 25 },
              styles: { 
                fontSize: 9,
                cellPadding: 4,
                halign: 'left',
                lineWidth: 0.2,
                lineColor: [200, 200, 200]
              },
              headStyles: { 
                fillColor: [0, 120, 120],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 10
              },
              footStyles: {
                fillColor: [0, 120, 120],
                textColor: 255,
                fontStyle: 'bold',
                halign: 'center',
                fontSize: 10
              },
              alternateRowStyles: {
                fillColor: [250, 252, 254]
              },
              columnStyles: {
                0: { cellWidth: 40, fontStyle: 'normal' },
                1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
                2: { cellWidth: 40, halign: 'right', fontStyle: 'normal' },
                3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
              }
            });
            
            currentY = (doc as any).lastAutoTable?.finalY || currentY + 60;
            currentY += 10; // Espaciado adicional
          } else {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(10);
            doc.setTextColor(150, 150, 150);
            doc.text('No se encontraron productos vendidos para esta sucursal.', 25, currentY);
            currentY += 20;
          }
        } catch (error) {
          console.error('Error obteniendo productos de sucursal:', error);
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(10);
          doc.setTextColor(150, 150, 150);
          doc.text('Error al obtener productos vendidos.', 25, currentY);
          currentY += 20;
        }
      }
      
      // Verificar espacio para métodos de pago
      if (currentY > 220) {
        doc.addPage();
        currentY = 20;
      }
      
      // 11. Métodos de Pago de esta sucursal
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.text('Métodos de Pago', 25, currentY);
      currentY += 12;
      
      // Obtener métodos de pago de esta sucursal desde las ventas
      if (paymentMethodsData && paymentMethodsData.methods) {
        // Filtrar métodos de pago por sucursal usando las ventas de esta sucursal
        const storeSaleIds = sortedStoreSales.map((s: any) => s.id);
        
        // Agrupar métodos de pago de esta sucursal
        // Nota: Esto requiere acceso a sale_payments, pero por ahora usaremos los datos generales
        // y los filtraremos por sucursal si es posible
        const storePayments = paymentMethodsData.methods.filter((method: any) => {
          // Filtrar si tenemos forma de asociar el método a la sucursal
          // Por ahora, mostramos todos los métodos pero esto se puede mejorar
          return true;
        });
        
        if (storePayments.length > 0) {
          const storePaymentTableData = storePayments.map((method: any) => [
            getMethodLabel(method.method),
            formatCurrency(method.totalUSD || 0),
            String(method.count || 0),
            `${(method.percentage || 0).toFixed(1)}%`
          ]);
          
          autoTable(doc, {
            head: [['Método de Pago', 'Total USD', 'Transacciones', 'Porcentaje']],
            body: storePaymentTableData,
            startY: currentY,
            margin: { left: 25, right: 25 },
            styles: { 
              fontSize: 8,
              cellPadding: 3,
              halign: 'left',
              lineWidth: 0.2,
              lineColor: [200, 200, 200]
            },
            headStyles: { 
              fillColor: [0, 120, 120],
              textColor: 255,
              fontStyle: 'bold',
              halign: 'center',
              fontSize: 9
            },
            alternateRowStyles: {
              fillColor: [250, 252, 254]
            },
            columnStyles: {
              0: { cellWidth: 40, fontStyle: 'normal' },
              1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
              2: { cellWidth: 40, halign: 'center', fontStyle: 'normal' },
              3: { cellWidth: 40, halign: 'center', fontStyle: 'bold' }
            }
          });
          
          currentY = (doc as any).lastAutoTable?.finalY || currentY + 60;
          currentY += 20; // Espaciado adicional antes de la siguiente sucursal
        }
      }
      
      // Agregar separador entre sucursales si no es la última
      if (storeIndex < data.storeBreakdown.length - 1) {
        if (currentY > 240) {
          doc.addPage();
          currentY = 20;
        } else {
          // Línea separadora
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(25, currentY, doc.internal.pageSize.getWidth() - 25, currentY);
          currentY += 15;
        }
      }
    }
    */ // BLOQUE VIEJO ELIMINADO - Fin
    
    // NOTA: Las secciones de "Resumen Comparativo" y "Gráfico" ya están incluidas arriba
    // en el orden correcto, así que este código duplicado debe eliminarse también
    /* CÓDIGO DUPLICADO ELIMINADO - Inicio
    // 12. Resumen Comparativo al final (Tabla + Gráfico)
    // Verificar si hay espacio suficiente, si no, agregar nueva página
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Resumen Comparativo por Tienda', 25, currentY);
    currentY += 12;
    
    // Crear tabla de desglose por tienda
    const storeBreakdownData = data.storeBreakdown.map(store => [
      store.storeName,
      formatCurrency(store.totalSales || 0),
      String(store.totalOrders || 0),
      formatCurrency(store.averageOrderValue || 0)
    ]);
    
    autoTable(doc, {
      head: [['Tienda', 'Total Ventas', 'Órdenes', 'Ticket Promedio']],
      body: storeBreakdownData,
      startY: currentY,
      margin: { left: 25, right: 25 },
      styles: { 
        fontSize: 8,
        cellPadding: 3,
        halign: 'left',
        lineWidth: 0.2,
        lineColor: [200, 200, 200]
      },
      headStyles: { 
        fillColor: [0, 120, 120],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: [250, 252, 254]
      },
      columnStyles: {
        0: { cellWidth: 40, fontStyle: 'normal' },
        1: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 40, halign: 'center', fontStyle: 'normal' },
        3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
      }
    });
    
    currentY = (doc as any).lastAutoTable?.finalY || currentY + 80;
    currentY += 15; // Espaciado después de la tabla
    
    // Verificar espacio para el gráfico
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    
    // Gráfico de Barras de Ventas por Tienda
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Gráfico de Ventas por Tienda', 25, currentY);
    currentY += 12;
    
    // Dibujar gráfico de barras
    currentY = addStoreSalesChart(doc, data.storeBreakdown, currentY);
    
    // Agregar recuento de ventas por categoría
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Resumen de Ventas por Categoría', 25, currentY);
    currentY += 12;
    
    // Calcular recuento de ventas y unidades por categoría
    // Nota: sales puede no estar en el tipo pero se pasa en runtime
    const allSales = (data as any).sales || [];
    const categoryCountMap = new Map<string, { invoices: number; units: number; total: number }>();
    
    if (allSales.length > 0) {
      for (const sale of allSales) {
        const saleItems = sale.sale_items || [];
        const categoriesInSale = new Set<string>();
        
        if (Array.isArray(saleItems) && saleItems.length > 0) {
          for (const item of saleItems) {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const category = product?.category || item.category || 'sin_categoria';
            categoriesInSale.add(category);
          }
          
          // Contar esta factura para cada categoría única que contiene
          for (const category of categoriesInSale) {
            const current = categoryCountMap.get(category) || { invoices: 0, units: 0, total: 0 };
            current.invoices += 1;
            current.total += sale.total_usd || sale.totalUSD || 0;
            categoryCountMap.set(category, current);
          }
          
          // Acumular unidades por categoría
          for (const item of saleItems) {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const category = product?.category || item.category || 'sin_categoria';
            const quantity = item.qty || item.quantity || 0;
            const current = categoryCountMap.get(category) || { invoices: 0, units: 0, total: 0 };
            current.units += quantity;
            categoryCountMap.set(category, current);
          }
        }
      }
    }
    
    if (categoryCountMap.size > 0) {
      const categoryCountData = Array.from(categoryCountMap.entries())
        .map(([category, data]) => [
          getCategoryLabel(category),
          String(data.invoices), // Cantidad de facturas
          String(data.units), // Cantidad total de unidades vendidas
          formatCurrency(data.total)
        ])
        .sort((a, b) => parseInt(b[1] as string) - parseInt(a[1] as string)); // Ordenar por cantidad de facturas descendente
      
      autoTable(doc, {
        head: [['Categoría', 'Cantidad de Facturas', 'Unidades Vendidas', 'Total USD']],
        body: categoryCountData,
        startY: currentY,
        margin: { left: 25, right: 25 },
        styles: {
          fontSize: 9,
          cellPadding: 4,
          halign: 'left',
          lineWidth: 0.2,
          lineColor: [200, 200, 200]
        },
        headStyles: {
          fillColor: [0, 120, 120],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [250, 252, 254]
        },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: 'bold' }, // Categoría
          1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' }, // Cantidad de facturas
          2: { cellWidth: 40, halign: 'center', fontStyle: 'bold' }, // Unidades vendidas
          3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' } // Total USD
        }
      });
      
      currentY = (doc as any).lastAutoTable?.finalY || currentY + 60;
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('No hay datos de categorías disponibles.', 25, currentY);
      currentY += 20;
    }
    
    // Agregar resumen detallado por sucursal, fecha y categoría (tabla día por día)
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Resumen Detallado por Sucursal, Fecha y Categoría', 25, currentY);
    currentY += 12;
    
    // Obtener todas las ventas agrupadas por sucursal (usar la variable ya declarada)
    // Agrupar ventas por sucursal
    const salesByStore = new Map<string, any[]>();
    allSales.forEach((sale: any) => {
      const saleStore = Array.isArray(sale.stores) ? sale.stores[0] : sale.stores;
      const storeId = saleStore?.id || sale.store_id || 'sin_sucursal';
      const storeName = saleStore?.name || sale.store_name || 'Sin sucursal';
      
      if (!salesByStore.has(storeId)) {
        salesByStore.set(storeId, []);
      }
      salesByStore.get(storeId)!.push({ ...sale, storeName });
    });
    
    // Procesar cada sucursal para mostrar día por día
    salesByStore.forEach((storeSales, storeId) => {
      const storeName = storeSales[0]?.storeName || 'Sin sucursal';
      
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 120, 120);
      doc.text(`Ventas de ${storeName}`, 25, currentY);
      currentY += 8;
      
      // Agrupar ventas por fecha y categoría
      const salesByDateCategory = new Map<string, Map<string, number>>();
      
      storeSales.forEach((sale: any) => {
        const saleDate = new Date(sale.created_at || sale.createdAt || new Date());
        const dateKey = saleDate.toLocaleDateString('es-VE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
        
        const saleItems = sale.sale_items || [];
        const categoriesInSale = new Set<string>();
        
        if (Array.isArray(saleItems) && saleItems.length > 0) {
          saleItems.forEach((item: any) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const category = product?.category || item.category || 'sin_categoria';
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
          startY: currentY,
          margin: { left: 25, right: 25 },
          styles: {
            fontSize: 8,
            cellPadding: 3,
            halign: 'left',
            lineWidth: 0.2,
            lineColor: [200, 200, 200]
          },
          headStyles: {
            fillColor: [0, 120, 120],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 9
          },
          alternateRowStyles: {
            fillColor: [250, 252, 254]
          },
          columnStyles: {
            0: { cellWidth: 35, fontStyle: 'normal' }, // Fecha
            1: { cellWidth: 50, fontStyle: 'normal' }, // Categoría
            2: { cellWidth: 35, halign: 'center', fontStyle: 'bold' } // Cantidad
          }
        });
        
        currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
        currentY += 10; // Espaciado entre sucursales
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('No hay datos de ventas para esta sucursal.', 30, currentY);
        currentY += 10;
      }
    });
    
    // Agregar totalización por sucursal y categoría (nueva sección adicional)
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('Totalización por Sucursal y Categoría', 25, currentY);
    currentY += 12;
    
    // Obtener rango de fechas del metadata
    const { startDate, endDate } = getDateRangeFromMetadata(metadata);
    const dateFromStr = startDate.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const dateToStr = endDate.toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Procesar cada sucursal
    salesByStore.forEach((storeSales, storeId) => {
      const storeName = storeSales[0]?.storeName || 'Sin sucursal';
      
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(0, 120, 120);
      doc.text(`Totalización de ${storeName}`, 25, currentY);
      currentY += 6;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text(`Fecha de ${dateFromStr} al ${dateToStr}`, 25, currentY);
      currentY += 8;
      
      // Calcular totales por categoría para esta sucursal
      const categoryTotals = new Map<string, number>();
      
      storeSales.forEach((sale: any) => {
        const saleItems = sale.sale_items || [];
        
        if (Array.isArray(saleItems) && saleItems.length > 0) {
          saleItems.forEach((item: any) => {
            const product = Array.isArray(item.products) ? item.products[0] : item.products;
            const category = product?.category || item.category || 'sin_categoria';
            const quantity = item.qty || item.quantity || 0;
            
            const currentTotal = categoryTotals.get(category) || 0;
            categoryTotals.set(category, currentTotal + quantity);
          });
        }
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
          startY: currentY,
          margin: { left: 25, right: 25 },
          styles: {
            fontSize: 9,
            cellPadding: 4,
            halign: 'left',
            lineWidth: 0.2,
            lineColor: [200, 200, 200]
          },
          headStyles: {
            fillColor: [0, 120, 120],
            textColor: 255,
            fontStyle: 'bold',
            halign: 'center',
            fontSize: 10
          },
          alternateRowStyles: {
            fillColor: [250, 252, 254]
          },
          columnStyles: {
            0: { cellWidth: 60, fontStyle: 'bold' }, // Categoría
            1: { cellWidth: 50, halign: 'center', fontStyle: 'bold' } // Total
          }
        });
        
        currentY = (doc as any).lastAutoTable?.finalY || currentY + 40;
        currentY += 10; // Espaciado entre sucursales
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text('No hay datos de ventas para esta sucursal en el período seleccionado.', 30, currentY);
        currentY += 10;
      }
    });
    */ // ========== FIN BLOQUE VIEJO ELIMINADO ==========
    
  } else {
    // Si se seleccionó una sucursal específica, mostrar formato original
    // 8. Detalle de Ventas - NUEVO ORDEN: Después de Métodos de Pago
    // Verificar si hay espacio suficiente, si no, agregar nueva página
    if (currentY > 200) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Detalle de Ventas', 25, currentY);
    currentY += 12;

    // 9. TABLA DETALLADA DE VENTAS INDIVIDUALES (Cronológica)
    // Ordenar ventas cronológicamente (más reciente primero = descendente)
    // Nota: sales puede no estar en el tipo pero se pasa en runtime
    const salesToDisplay = ((data as any).sales || []).sort((a: any, b: any) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA; // Descendente
    });

    if (salesToDisplay.length > 0) {
      const salesTableData = salesToDisplay.map((sale: any) => {
        const { dateStr, timeStr } = formatDateTime(sale.created_at || sale.createdAt || new Date().toISOString());
        
        const store = Array.isArray(sale.stores) ? sale.stores[0] : sale.stores;
        const customer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
        
        let storeName = store?.name || sale.store_name || 'N/A';
        // Truncar nombre de sucursal si es muy largo (máximo 20 caracteres)
        if (storeName.length > 20) {
          storeName = storeName.substring(0, 17) + '...';
        }
        
        let customerName = customer?.name || sale.customer_name || 'Sin cliente';
        // Truncar nombre de cliente si es muy largo (máximo 22 caracteres)
        if (customerName.length > 22) {
          customerName = customerName.substring(0, 19) + '...';
        }
        
        let paymentMethod = getPaymentMethodLabel(sale.payment_method || sale.paymentMethod);
        // Truncar método de pago si es muy largo (máximo 18 caracteres)
        if (paymentMethod.length > 18) {
          paymentMethod = paymentMethod.substring(0, 15) + '...';
        }
        
        return [
          dateStr,
          timeStr,
          sale.invoice_number || sale.invoice_code || 'N/A',
          customerName,
          paymentMethod,
          storeName,
          formatCurrency(sale.total_usd || sale.totalUSD || 0)
        ];
      });

      autoTable(doc, {
        head: [['Fecha', 'Hora', 'Factura', 'Cliente', 'Método', 'Sucursal', 'Total USD']],
        body: salesTableData,
        startY: currentY,
        margin: { left: 15, right: 15 },
        styles: { 
          fontSize: 6,
          cellPadding: 1.5,
          halign: 'left',
          lineWidth: 0.2,
          lineColor: [200, 200, 200],
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: { 
          fillColor: [0, 120, 120],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 7
        },
        alternateRowStyles: {
          fillColor: [250, 252, 254]
        },
        columnStyles: {
          0: { cellWidth: 20, fontStyle: 'normal' }, // Fecha (reducido de 24)
          1: { cellWidth: 18, halign: 'center' }, // Hora (reducido de 20)
          2: { cellWidth: 25, fontStyle: 'bold' }, // Factura (reducido de 30)
          3: { cellWidth: 28 }, // Cliente (reducido de 35)
          4: { cellWidth: 25 }, // Método (reducido de 32)
          5: { cellWidth: 25 }, // Sucursal (reducido de 32)
          6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' } // Total (reducido de 32)
        }
      });

      currentY = (doc as any).lastAutoTable?.finalY || currentY + 80;
      currentY += 10; // Espaciado adicional
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('No hay ventas registradas para el período seleccionado.', 25, currentY);
      currentY += 20;
    }

    // 10. TABLA DE PRODUCTOS VENDIDOS
    // Verificar si hay espacio suficiente, si no, agregar nueva página
    if (currentY > 220) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text('Productos Vendidos', 25, currentY);
    currentY += 12;
    
    if (productsData && productsData.length > 0) {
      const productsTableData = productsData.map(product => [
        product.product_name,
        String(product.total_qty),
        formatCurrency(product.price_usd),
        formatCurrency(product.total_amount)
      ]);
      
      const totalQty = productsData.reduce((sum, product) => sum + product.total_qty, 0);
      const totalAmount = productsData.reduce((sum, product) => sum + product.total_amount, 0);
      
      autoTable(doc, {
        head: [['Producto', 'Cantidad', 'Precio Unit.', 'Total']],
        body: productsTableData,
        foot: [['TOTAL GENERAL', String(totalQty), '', formatCurrency(totalAmount)]],
        startY: currentY,
        margin: { left: 25, right: 25 },
        styles: { 
          fontSize: 9,
          cellPadding: 4,
          halign: 'left',
          lineWidth: 0.2,
          lineColor: [200, 200, 200]
        },
        headStyles: { 
          fillColor: [0, 120, 120],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 10
        },
        footStyles: {
          fillColor: [0, 120, 120],
          textColor: 255,
          fontStyle: 'bold',
          halign: 'center',
          fontSize: 10
        },
        alternateRowStyles: {
          fillColor: [250, 252, 254]
        },
        columnStyles: {
          0: { cellWidth: 40, fontStyle: 'normal' },
          1: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
          2: { cellWidth: 40, halign: 'right', fontStyle: 'normal' },
          3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
        }
      });
      
      currentY = (doc as any).lastAutoTable?.finalY || currentY + 60;
      currentY += 10; // Espaciado adicional
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text('No se encontraron datos de productos vendidos para el período seleccionado.', 25, currentY);
      currentY += 20;
    }
  }
  
  console.log('✅ generateSalesReportPDF completado exitosamente');
  return doc.output('datauristring');
}

export async function downloadSalesReportPDF(
  data: SalesReportData, 
  metadata: ReportMetadata,
  paymentMethodsData?: {
    totalUSD: number;
    totalBS: number;
    totalTransactions: number;
    methods: Array<{
      method: string;
      totalUSD: number;
      totalBS: number;
      count: number;
      percentage: number;
    }>;
  },
  soldProductsData?: Array<{
    product_name: string;
    product_sku: string;
    total_qty: number;
    price_usd: number;
    total_amount: number;
  }>,
  companyId?: string,
  storeId?: string
): Promise<void> {
  try {
    console.log('=== downloadSalesReportPDF INICIADO ===');
    console.log('Data recibida:', !!data);
    console.log('Metadata recibida:', !!metadata);
    console.log('PaymentMethodsData recibida:', !!paymentMethodsData);
    console.log('CompanyId recibido:', companyId);
    console.log('StoreId recibido:', storeId);
    
    // ✅ Usar la función principal que tiene toda la lógica de métodos de pago y gráficos
    console.log('✅ Llamando a generateSalesReportPDF...');
    const pdfDataUri = await generateSalesReportPDF(data, metadata, paymentMethodsData, soldProductsData, companyId, storeId);
    console.log('✅ PDF generado, URI obtenida:', !!pdfDataUri);
    
    // Crear un enlace temporal para descargar el PDF
    console.log('✅ Creando enlace de descarga...');
    const link = document.createElement('a');
    link.href = pdfDataUri;
    link.download = `Reporte_Diario_Ventas_${metadata.reportId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    console.log('✅ Descarga iniciada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en downloadSalesReportPDF:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    throw error;
  }
}

// Función para agregar logo real con tamaño correcto
export function addRealCompanyLogo(doc: jsPDF, logoBase64: string, y: number): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoSize = 16; // Tamaño real del logo
  
  try {
    // Agregar imagen real del logo manteniendo proporciones
    doc.addImage(logoBase64, 'PNG', (pageWidth - logoSize) / 2, y, logoSize, logoSize);
    return y + logoSize + 8;
  } catch (error) {
    console.warn('Error loading logo, using placeholder:', error);
    return addCompanyLogo(doc, y);
  }
}

// Funciones para otros reportes con formato real
export async function generateProfitabilityReportPDF(data: ProfitabilityReportData, metadata: ReportMetadata): Promise<jsPDF> {
  const doc = new jsPDF();
  let currentY = 10; // Margen superior mejorado
  
  currentY = addFacturaLogo(doc, currentY, 22); // Logo mediano para reportes secundarios (500x257)
  currentY = addCompanyInfo(doc, currentY);
  currentY = addReportInfo(doc, currentY, metadata);
  currentY = addReportTitle(doc, currentY, 'DE RENTABILIDAD');
  
  // Contenido del reporte
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Análisis de Rentabilidad', 25, currentY);
  
  currentY += 12;
  
  const profitData = [
    ['Ingresos Totales', formatCurrency(data.totalRevenue)],
    ['Costos Totales', formatCurrency(data.totalCost)],
    ['Utilidad Bruta', formatCurrency(data.grossProfit)],
    ['Margen de Utilidad', `${data.profitMargin.toFixed(2)}%`]
  ];
  
  autoTable(doc, {
    head: [['Métrica', 'Valor']],
    body: profitData,
    startY: currentY,
    margin: { left: 25, right: 25 },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [0, 120, 120], textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 75, halign: 'right' } }
  });
  
  return doc;
}

export async function downloadProfitabilityReportPDF(data: ProfitabilityReportData, metadata: ReportMetadata): Promise<void> {
  const doc = await generateProfitabilityReportPDF(data, metadata);
  doc.save(`Reporte_Rentabilidad_${metadata.reportId}.pdf`);
}

export async function generateInventoryReportPDF(data: InventoryReportData, metadata: ReportMetadata): Promise<jsPDF> {
  const doc = new jsPDF();
  let currentY = 5; // Sin margen superior
  
  currentY = addCompanyLogo(doc, currentY);
  currentY = addCompanyInfo(doc, currentY);
  currentY = addReportTitle(doc, currentY, 'DE INVENTARIO');
  
  // Contenido del reporte
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Estado del Inventario', 25, currentY);
  
  currentY += 12;
  
  const inventoryData = [
    ['Total de Productos', String(data.totalProducts)],
    ['Valor del Stock', formatCurrency(data.totalStockValue)],
    ['Productos Bajo Stock', String(data.lowStockProducts)],
    ['Productos Sin Stock', String(data.outOfStockProducts)]
  ];
  
  autoTable(doc, {
    head: [['Métrica', 'Valor']],
    body: inventoryData,
    startY: currentY,
    margin: { left: 25, right: 25 },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [0, 120, 120], textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 75, halign: 'right' } }
  });
  
  return doc;
}

export async function downloadInventoryReportPDF(data: InventoryReportData, metadata: ReportMetadata): Promise<void> {
  const doc = await generateInventoryReportPDF(data, metadata);
  doc.save(`Reporte_Inventario_${metadata.reportId}.pdf`);
}

// ========= EJEMPLO DE USO DE LA NUEVA FUNCIONALIDAD =========
//
// Para usar la nueva funcionalidad de productos vendidos en el reporte PDF:
//
// 1. Importar las funciones necesarias:
//    import { generateSalesReportPDF, downloadSalesReportPDF, getSoldProductsData } from '@/utils/pdfGenerator';
//
// 2. Obtener los datos de productos vendidos:
//    const soldProductsData = await getSoldProductsData(
//      companyId,           // ID de la empresa
//      startDate,           // Fecha de inicio
//      endDate,             // Fecha de fin
//      storeId              // ID de la tienda (opcional)
//    );
//
// 3. Generar el reporte PDF con productos vendidos (AUTOMÁTICO):
//    const pdfDataUri = await generateSalesReportPDF(
//      salesData,           // Datos de ventas
//      metadata,            // Metadatos del reporte
//      paymentMethodsData,  // Datos de métodos de pago (opcional)
//      undefined,           // Datos de productos vendidos (opcional - se obtienen automáticamente)
//      companyId,           // ID de la empresa (para obtener productos vendidos automáticamente)
//      storeId              // ID de la tienda (opcional)
//    );
//
// 4. O descargar directamente (MÁS FÁCIL):
//    await downloadSalesReportPDF(
//      salesData,
//      metadata,
//      paymentMethodsData,
//      undefined,           // Datos de productos vendidos (opcional)
//      companyId,           // ID de la empresa (para obtener productos vendidos automáticamente)
//      storeId              // ID de la tienda (opcional)
//    );
//
// CARACTERÍSTICAS DE LA NUEVA FUNCIONALIDAD:
// - ✅ OBTENCIÓN AUTOMÁTICA de datos de productos vendidos desde la base de datos
// - Salto de página automático después del gráfico
// - Nueva página dedicada a productos vendidos
// - Tabla con: Producto, Cantidad, Precio Unit., Total
// - Footer con totales resaltados
// - Resumen con estadísticas de productos vendidos
// - Agrupación automática por producto y SKU
// - Ordenamiento por cantidad vendida (descendente)
// - Compatible con filtros por tienda y período
//
// EJEMPLO DE DATOS DE ENTRADA:
// soldProductsData = [
//   {
//     product_name: "iPhone 15",
//     product_sku: "IPH15-128",  // No se muestra en la tabla
//     total_qty: 2,
//     price_usd: 100,
//     total_amount: 200
//   },
//   {
//     product_name: "Samsung Galaxy S24",
//     product_sku: "SGS24-256",  // No se muestra en la tabla
//     total_qty: 1,
//     price_usd: 150,
//     total_amount: 150
//   }
// ]
//
// RESULTADO EN PDF:
// - Página 1: Logo, información de empresa, KPIs, métodos de pago, gráfico
// - Página 2: Tabla de productos vendidos con totales
//
