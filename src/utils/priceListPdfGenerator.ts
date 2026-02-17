import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getCategoryLabel } from '@/constants/categories';
import { PriceListParams } from '@/components/web/PriceListModal';

interface ProductForPriceList {
  id: string;
  name: string;
  sku: string;
  sale_price_usd: number;
  total_stock: number;
  web_visible: boolean;
}

/** Tasas para inflado web. Métodos excluyentes:
 *  RATE: P_final = P_base * (web_adjustment_rate / manual_bcv_rate)
 *  PERCENTAGE: P_final = P_base * (1 + web_tax_percentage / 100)
 */
export interface WebPricingSettings {
  web_adjustment_method?: 'RATE' | 'PERCENTAGE';
  web_adjustment_rate?: number;
  manual_bcv_rate?: number;
  web_tax_percentage?: number;
}

// Función para agregar logo centrado (similar a otros reportes)
function addLogo(doc: jsPDF, y: number, maxWidth: number = 25): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logoPath = '/logo_factura.png';
  
  try {
    // Dimensiones reales del logo: 500x257 (proporción ~1.945:1)
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
    console.warn('Error loading logo, using placeholder:', error);
    // Fallback: continuar sin logo
    return y + 5;
  }
}

function applyWebInflation(
  salePriceUsd: number,
  webPricing: WebPricingSettings | null | undefined
): number {
  if (!webPricing) return salePriceUsd;
  const method = webPricing.web_adjustment_method ?? 'RATE';
  if (method === 'PERCENTAGE') {
    const pct = webPricing.web_tax_percentage ?? 0;
    return salePriceUsd * (1 + pct / 100);
  }
  const adj = webPricing.web_adjustment_rate;
  const bcv = webPricing.manual_bcv_rate;
  if (!bcv || bcv <= 0 || adj == null || adj <= 0) return salePriceUsd;
  return salePriceUsd * (adj / bcv);
}

/**
 * Genera un PDF de lista de precios con los productos filtrados.
 * Si webPricing está presente, aplica inflado (solo para exportación web).
 */
export const generatePriceListPDF = async (
  products: ProductForPriceList[],
  params: PriceListParams,
  webPricing?: WebPricingSettings | null
): Promise<jsPDF> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15; // Márgenes estándar para mejor presentación
  let currentY = margin;

  // 1. Logo centrado (similar a otros reportes)
  currentY = addLogo(doc, currentY, 25);

  // 2. Información de la empresa (formato profesional)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 120, 120);
  doc.text('TU MOVIL C.A.', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  doc.text('RIF: J-12345678-9', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text('Av. Principal, Centro CONCORDE, Local 12', pageWidth / 2, currentY, { align: 'center' });
  doc.text('Porlamar, Estado Nueva Esparta, Venezuela', pageWidth / 2, currentY + 5, { align: 'center' });
  currentY += 12;

  // 3. Línea separadora elegante
  doc.setDrawColor(0, 120, 120);
  doc.setLineWidth(0.5);
  const separatorMargin = 25;
  doc.line(separatorMargin, currentY, pageWidth - separatorMargin, currentY);
  currentY += 8;

  // 4. Título del documento (formato mejorado)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 120, 120);
  const title = `Lista de Precios - ${getCategoryLabel(params.category)}`;
  doc.text(title, pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // 5. Información de fecha y hora (centrado). Tasa BCV no se imprime por ser variable.
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-VE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  
  doc.text(`Fecha: ${dateStr}  |  Hora: ${timeStr}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 8;

  // Tasa BCV para columna BS: manual_bcv_rate (público) si hay webPricing, sino params.bcvRate
  const bcvRateForBs = (webPricing?.manual_bcv_rate && webPricing.manual_bcv_rate > 0)
    ? webPricing.manual_bcv_rate
    : params.bcvRate;

  // Preparar datos de la tabla (aplica inflado web cuando corresponda)
  const tableData = products.map((product) => {
    const precioVenta = applyWebInflation(product.sale_price_usd, webPricing);
    const stockTotal = product.total_stock;
    
    // Calcular inicial Krece (precio * porcentaje / 100)
    const inicialKrece = params.krecePercentage > 0 
      ? (precioVenta * params.krecePercentage) / 100 
      : 0;
    
    // Calcular inicial Cashea (precio * porcentaje / 100)
    const inicialCashea = params.chasePercentage > 0 
      ? (precioVenta * params.chasePercentage) / 100 
      : 0;
    
    // Valor en BS: precio (inflado o no) * tasa BCV pública
    const valorBsBcv = precioVenta * bcvRateForBs;

    // Convertir nombre a mayúsculas y truncar si es muy largo
    const productName = product.name.toUpperCase();
    const maxNameLength = 35; // Reducido para que quepa mejor
    const truncatedName = productName.length > maxNameLength 
      ? productName.substring(0, maxNameLength - 3) + '...' 
      : productName;

    // Orden: Producto, Precio Venta, Stock, Cashea, Krece, BS BCV
    return [
      truncatedName,
      `$${precioVenta.toFixed(2)}`,
      stockTotal.toString(),
      `$${inicialCashea.toFixed(2)}`, // Cashea primero
      `$${inicialKrece.toFixed(2)}`, // Krece después
      `Bs. ${valorBsBcv.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    ];
  });

  // Generar tabla con autoTable (centrada)
  // Calcular ancho de tabla para centrarla mejor
  const tableWidth = 170; // Ancho fijo para la tabla
  const tableStartX = (pageWidth - tableWidth) / 2; // Centrar la tabla
  
  autoTable(doc, {
    startY: currentY,
    head: [[
      'Producto',
      'Precio Venta',
      'Stock',
      `Cashea (${params.chasePercentage.toFixed(1)}%)`, // Cashea primero
      `Krece (${params.krecePercentage.toFixed(1)}%)`, // Krece después
      'BS BCV',
    ]],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [0, 120, 120],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'center',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 55, halign: 'left' }, // Producto
      1: { cellWidth: 22, halign: 'right' }, // Precio de Venta
      2: { cellWidth: 15, halign: 'center' }, // Stock
      3: { cellWidth: 24, halign: 'right' }, // Inicial Cashea
      4: { cellWidth: 24, halign: 'right' }, // Inicial Krece
      5: { cellWidth: 30, halign: 'right' }, // Valor en BS BCV
    },
    margin: { left: (pageWidth - tableWidth) / 2, right: (pageWidth - tableWidth) / 2 }, // Centrar la tabla
    styles: {
      cellPadding: 1.65, // Espaciado interno aumentado 10%
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
      fontSize: 7,
    },
    tableWidth: tableWidth, // Ancho fijo para centrar mejor
  });

  // Obtener la posición final después de la tabla
  currentY = (doc as any).lastAutoTable?.finalY || currentY + 50;
  currentY += 5; // Reducido de 10 a 5

  // Resumen al final (centrado)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total de productos: ${products.length}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 5;

  const totalStock = products.reduce((sum, p) => sum + p.total_stock, 0);
  doc.text(`Stock total: ${totalStock} unidades`, pageWidth / 2, currentY, { align: 'center' });

  return doc;
};

/**
 * Descarga el PDF de lista de precios.
 * Si webPricing está presente, aplica inflado (solo catálogo/exportación web).
 */
export const downloadPriceListPDF = async (
  products: ProductForPriceList[],
  params: PriceListParams,
  webPricing?: WebPricingSettings | null
): Promise<void> => {
  try {
    const doc = await generatePriceListPDF(products, params, webPricing);
    const categoryLabel = getCategoryLabel(params.category);
    const fileName = `lista-precios-${categoryLabel.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  } catch (error) {
    console.error('Error generating price list PDF:', error);
    throw error;
  }
};

