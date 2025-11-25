import jsPDF from 'jspdf';

interface InvoiceData {
  id: string;
  invoice_number?: string;
  customer_name: string;
  customer_id_number?: string;
  store_name: string;
  cashier_name: string;
  total_usd: number;
  total_bs: number;
  bcv_rate_used: number;
  payment_method: string;
  created_at: string;
  items: Array<{
    id: string;
    product_name: string;
    qty: number;
    price_usd: number;
    subtotal_usd: number;
    imei?: string;
  }>;
  store_info?: {
    business_name?: string;
    tax_id?: string;
    fiscal_address?: string;
    phone_fiscal?: string;
    email_fiscal?: string;
  };
  receipt_footer?: string;
}

export const generateInvoicePDF = (invoiceData: InvoiceData): void => {
  const doc = new jsPDF();
  
  // Configuración de página optimizada
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);
  let yPosition = margin;

  // Función para agregar logo centrado (inspirada en el reporte de ventas)
  const addLogo = (y: number): number => {
    try {
      const logoPath = '/logo_factura.png';
      const logoSize = 35; // Tamaño más profesional
      const logoAspectRatio = 500 / 257; // Proporción real del logo
      const logoWidth = logoSize;
      const logoHeight = logoSize / logoAspectRatio;
      const logoX = (pageWidth - logoWidth) / 2;
      
      doc.addImage(logoPath, 'PNG', logoX, y, logoWidth, logoHeight);
      return y + logoHeight + 8; // Espaciado mínimo después del logo
    } catch (error) {
      console.warn('Error loading logo, skipping:', error);
      return y;
    }
  };

  // Función para agregar información de empresa (inspirada en el reporte de ventas)
  const addCompanyInfo = (y: number): number => {
    // Nombre de la tienda
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(invoiceData.store_name, pageWidth / 2, y, { align: 'center' });
    y += 6;
    
    // Nombre de la empresa
  if (invoiceData.store_info?.business_name) {
      doc.setFont('helvetica');
      doc.setFontSize(12);
      doc.text(invoiceData.store_info.business_name, pageWidth / 2, y, { align: 'center' });
      y += 5; // Interlineado de 2mm aprox
    }

 

    // RIF
    if (invoiceData.store_info?.tax_id) {
      doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
      doc.text(`RIF: ${invoiceData.store_info.tax_id}`, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }

    // Dirección fiscal
  if (invoiceData.store_info?.fiscal_address) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(invoiceData.store_info.fiscal_address, pageWidth / 2, y, { align: 'center' });
      y += 7;
    }

    // Teléfono
    if (invoiceData.store_info?.phone_fiscal) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.text(`Tel: ${invoiceData.store_info.phone_fiscal}`, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }

    y += 5; // Espaciado después de la información de la empresa
    return y;
  };

  // Función para agregar línea separadora profesional
  const addSeparator = (y: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    return y + 10; // Espaciado después del separador
  };

  // Función para verificar si hay espacio suficiente para el pie de página
  const checkFooterSpace = (currentY: number, footerLines: number): boolean => {
    const footerHeight = (footerLines * 6) + 20; // Altura del pie de página
    const bottomMargin = 20; // Margen inferior
    return (currentY + footerHeight + bottomMargin) < pageHeight;
  };

  // Agregar logo
  yPosition = addLogo(yPosition);

  // Título principal - Espaciado profesional

  // Información de la empresa usando la función profesional
  yPosition = addCompanyInfo(yPosition);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(20);
  doc.setTextColor(0, 0, 0);
  doc.text('Nota de Entrega', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8; // Espaciado después del título

  yPosition = addSeparator(yPosition);

  // Información de la factura - Espaciado profesional
  const leftColumn = margin + 15;
  const rightColumn = 140;

  // Título de sección
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('INFORMACIÓN DE LA VENTA', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Guardar la posición inicial para ambas columnas
  const startY = yPosition;

  // Información del cliente (izquierda)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('CLIENTE:', leftColumn, yPosition);
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceData.customer_name, leftColumn, yPosition);
  yPosition += 5;
  
  let clientY = yPosition;
  if (invoiceData.customer_id_number) {
    doc.text(`Cédula: ${invoiceData.customer_id_number}`, leftColumn, yPosition);
    clientY += 5;
  }

  // Información de la factura (derecha) - Alineada a la misma altura
  yPosition = startY; // Resetear a la posición inicial
  const invoiceNumber = invoiceData.invoice_number || `Venta #${invoiceData.id.slice(0, 8)}`;
  doc.setFont('helvetica', 'normal');
  doc.text('FACTURA:', rightColumn, yPosition);
  yPosition += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(invoiceNumber, rightColumn, yPosition);
  yPosition += 5;
  
  const saleDate = new Date(invoiceData.created_at).toLocaleDateString('es-VE');
  const saleTime = new Date(invoiceData.created_at).toLocaleTimeString('es-VE', { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  doc.text(`Fecha: ${saleDate}`, rightColumn, yPosition);
  yPosition += 5;
  doc.text(`Hora: ${saleTime}`, rightColumn, yPosition);
  yPosition += 5;
  doc.text(`Cajero: ${invoiceData.cashier_name}`, rightColumn, yPosition);

  // Usar la posición más baja entre las dos columnas
  yPosition = Math.max(clientY, yPosition) + 10;
  yPosition = addSeparator(yPosition);

  // Tabla de productos - Espaciado profesional
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('DETALLE DE PRODUCTOS', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Encabezados de la tabla
  const colPositions = [margin, margin + 90, margin + 115, margin + 150];
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('PRODUCTO', colPositions[0], yPosition);
  doc.text('CANT.', colPositions[1], yPosition);
  doc.text('PRECIO USD', colPositions[2], yPosition);
  doc.text('TOTAL USD', colPositions[3], yPosition);
  yPosition += 6;

  // Línea debajo de encabezados
  doc.setDrawColor(100, 100, 100);
  doc.line(margin, yPosition - 1, pageWidth - margin, yPosition - 1);
  yPosition += 4;

  // Productos
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  
  invoiceData.items.forEach((item, index) => {
    // Verificar si hay espacio suficiente en la página
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = margin;
    }

    // Nombre del producto (con wrap si es muy largo)
    const productName = item.product_name.length > 30 ? 
      item.product_name.substring(0, 27) + '...' : 
      item.product_name;
    
    doc.text(productName, colPositions[0], yPosition);
    doc.text(item.qty.toString(), colPositions[1], yPosition);
    doc.text(`$${item.price_usd.toFixed(2)}`, colPositions[2], yPosition);
    doc.text(`$${item.subtotal_usd.toFixed(2)}`, colPositions[3], yPosition);
    
    // Mostrar IMEI si está disponible
    if (item.imei) {
      yPosition += 3;
      doc.setFontSize(7);
      doc.setTextColor(100, 100, 100);
      doc.text(`IMEI: ${item.imei}`, colPositions[0], yPosition);
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
    }
    
    // Línea sutil entre productos
    if (index < invoiceData.items.length - 1) {
      doc.setDrawColor(240, 240, 240);
      doc.line(margin, yPosition + 3, pageWidth - margin, yPosition + 3);
    }
    
    yPosition += 6;
  });

  yPosition += 8;
  yPosition = addSeparator(yPosition);

  // Totales - Espaciado profesional
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text('RESUMEN DE PAGO', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;
  
  const totalSubtotal = invoiceData.items.reduce((sum, item) => sum + item.subtotal_usd, 0);
  const taxAmount = totalSubtotal * 0.16; // 16% IVA
  
  // Crear una tabla de totales centrada
  const totalsStartX = pageWidth / 2 - 60;
  const totalsEndX = pageWidth / 2 + 60;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Subtotal
  doc.text('Subtotal USD:', totalsStartX, yPosition);
  doc.text(`$${totalSubtotal.toFixed(2)}`, totalsStartX + 80, yPosition);
  yPosition += 5;
  
  // IVA
 
  
  // Total USD
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Total USD:', totalsStartX, yPosition);
  doc.text(`$${invoiceData.total_usd.toFixed(2)}`, totalsStartX + 80, yPosition);
  yPosition += 5;
  
  // Total BS
  doc.text('Total BS:', totalsStartX, yPosition);
  doc.text(`Bs ${invoiceData.total_bs.toFixed(2)}`, totalsStartX + 80, yPosition);
  yPosition += 5;
  
  // Tasa BCV
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Tasa BCV:', totalsStartX, yPosition);
  doc.text(`Bs ${invoiceData.bcv_rate_used.toFixed(2)}`, totalsStartX + 80, yPosition);
  yPosition += 5;
  
  // Método de pago
  doc.text('Método de Pago:', totalsStartX, yPosition);
  const paymentMethod = getPaymentMethodLabel(invoiceData.payment_method);
  doc.text(paymentMethod, totalsStartX + 80, yPosition);

  yPosition += 15;
  yPosition = addSeparator(yPosition);

  // Pie de página como footer profesional - Inmediatamente después del resumen de pago
  const footerText = invoiceData.receipt_footer || '¡Gracias por su compra!';
  const footerLines = footerText.split('\n');
  
  // Agregar padding superior al footer
  const footerPadding = 8; // Padding superior e inferior
  yPosition += footerPadding;
  
  // Pie de página configurable
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  footerLines.forEach((line, index) => {
    if (line.trim()) { // Solo agregar líneas que no estén vacías
      doc.text(line.trim(), pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 4;
    }
  });
  
  // Agregar padding inferior al footer

  // Generar nombre del archivo
  const fileName = `Factura_${invoiceNumber}_${saleDate.replace(/\//g, '-')}.pdf`;
  
  // Descargar el PDF
  doc.save(fileName);
};

// Función auxiliar para obtener el nombre del método de pago
const getPaymentMethodLabel = (method: string): string => {
  switch (method) {
    case 'cash_usd': return 'Efectivo USD';
    case 'cash_bs': return 'Efectivo BS';
    case 'card': return 'Tarjeta';
    case 'transfer': return 'Transferencia';
    case 'binance': return 'Binance';
    case 'zelle': return 'Zelle';
    case 'pago_movil': return 'Pago Móvil';
    case 'pos': return 'Punto de Venta';
    default: return method;
  }
};
