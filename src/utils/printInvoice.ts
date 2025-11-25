/**
 * Función para imprimir facturas en formato de impresora térmica estándar de 88mm
 * Configurada para el tamaño estándar de tickets térmicos
 * Tamaño mínimo de fuente: 14px para máxima legibilidad
 * Toda la letra es negrita para mejor legibilidad
 * Fuente: Courier Prime para estilo profesional y legibilidad
 * Impresión directa a impresora POS-80C
 */

interface SaleData {
  invoice_number: string;
  customer: string;
  customer_id: string | null;
  items: Array<{
    id: string;
    name: string;
    sku: string;
    price: number;
    quantity: number;
  }>;
  subtotal_usd: number;
  tax_amount_usd: number;
  total_usd: number;
  total_bs: number;
  bcv_rate: number;
  payment_method: string;
  sale_date: string;
  store_info?: {
    name: string;
    business_name: string | null;
    tax_id: string | null;
    fiscal_address: string | null;
    phone_fiscal: string | null;
    email_fiscal: string | null;
  };
  cashier_name?: string;
}

export const printInvoice = (saleData: SaleData, taxRate?: number, receiptFooter?: string) => {
  const formatCurrency = (amount: number, currency: 'USD' | 'BS') => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'VES',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-VE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Crear contenido HTML para impresión directa
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Factura ${saleData.invoice_number}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
      <style>
        @media print {
          @page {
            size: 88mm auto;
            margin: 3mm;
          }
          body {
            margin: 0;
            padding: 0;
            background: white;
            color: black;
          }
          * {
            color: black !important;
            background: transparent !important;
          }
        }
        
        body {
          font-family: 'Courier Prime', monospace;
          font-size: 16px;
          font-weight: normal;
          line-height: 1.1;
          width: 88mm;
          margin: 0;
          padding: 0.5mm;
          background: white;
          color: black;
        }
        
        * {
          color: black !important;
          font-weight: normal !important;
        }
        
        .header {
          text-align: center;
          border-bottom: 1px dashed #000;
          padding-bottom: 0.5mm;
          margin-bottom: 0.5mm;
        }
        
        .logo {
          width: 35mm;
          height: auto;
          margin-bottom: 0.5mm;
          display: block;
          margin-left: auto;
          margin-right: auto;
        }
        
        .tax-id {
          font-size: 12px;
          font-weight: normal;
          margin-bottom: 0.3mm;
          color: #333;
        }
        
        .company-name {
          font-size: 12px;
          font-weight: normal;
          margin-bottom: 0.3mm;
          color: #000;
        }
        
        .store-name {
          font-size: 14px;
          font-weight: normal;
          margin-bottom: 1mm;
          text-align: center;
          color: #666;
        }
        
        .fiscal-address {
          font-size: 12px;
          font-weight: normal;
          margin-bottom: 0.3mm;
          text-align: center;
          color: #333;
        }
        
        .fiscal-phone {
          font-size: 12px;
          font-weight: normal;
          margin-bottom: 0.3mm;
          text-align: center;
          color: #333;
        }
        
        .fiscal-email {
          font-size: 12px;
          font-weight: normal;
          margin-bottom: 0.5mm;
          text-align: center;
          color: #333;
        }
        
        .invoice-number {
          font-size: 14px;
          font-weight: normal;
          margin-bottom: 0.5mm;
          text-align: center;
        }
        
        .separator {
          border-top: 1px dashed #000;
          margin: 1.5mm 0;
        }
        
        .header-details {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: normal;
          margin-bottom: 1mm;
        }
        
        .customer-info {
          text-align: left;
          color: black;
        }
        
        .invoice-info {
          text-align: right;
          color: black;
        }
        
        .items {
          margin: 2mm 0;
        }
        
        .item {
          margin: 1mm 0;
          padding: 0.5mm 0;
          border-bottom: 1px dotted #ccc;
        }
        
        .item-name {
          font-weight: normal;
          font-size: 14px;
          margin-bottom: 0.8mm;
        }
        
        .item-details {
          font-size: 14px;
          font-weight: normal;
          color: black;
          margin-bottom: 1.5mm;
        }
        
        .item-line {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: normal;
          margin: 0.8mm 0;
        }
        
        .totals {
          margin: 2mm 0;
          padding: 1mm 0;
          border-top: 1px dashed #000;
        }
        
        .total-line {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
          font-weight: normal;
          margin: 1mm 0;
        }
        
        .total-final {
          font-weight: normal;
          font-size: 14px;
          border-top: 1px solid #000;
          padding-top: 1mm;
          margin-top: 1.5mm;
        }
        
        .footer {
          text-align: center;
          margin-top: 2mm;
          padding-top: 1mm;
          border-top: 1px dashed #000;
          font-size: 14px;
          font-weight: normal;
          white-space: pre-line;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <img src="/logo_factura.png" alt="Logo" class="logo" />
        
        <!-- Información Fiscal Completa de la Tienda -->
        ${saleData.store_info?.tax_id ? `<div class="tax-id">RIF: ${saleData.store_info.tax_id}</div>` : ''}
        <div class="company-name">${saleData.store_info?.business_name || 'PUNTO DE ENTREGA'}</div>
        ${saleData.store_info?.fiscal_address ? `<div class="fiscal-address">${saleData.store_info.fiscal_address}</div>` : ''}
        ${saleData.store_info?.phone_fiscal ? `<div class="fiscal-phone">Tel: ${saleData.store_info.phone_fiscal}</div>` : ''}
        ${saleData.store_info?.email_fiscal ? `<div class="fiscal-email">Email: ${saleData.store_info.email_fiscal}</div>` : ''}
        
        <div class="separator"></div>
        
        <div class="invoice-number">NOTA DE ENTREGA </div>
        
        <div class="header-details">
          <div class="customer-info">
          <div>${saleData.invoice_number}</div>
            ${saleData.customer_id ? `<div>Cédula: ${saleData.customer_id}</div>` : ''}
            <div>Cliente: ${saleData.customer}</div>
          </div>
          <div class="invoice-info">
            <div>Fecha: ${new Date(saleData.sale_date).toLocaleDateString('es-VE')}</div>
            <div>Hora: ${new Date(saleData.sale_date).toLocaleTimeString('es-VE', {hour: '2-digit', minute: '2-digit'})}</div>
            <div>Cajero: ${saleData.cashier_name || 'Sistema'}</div>
          </div>
        </div>
      </div>
      
      <div class="items">
        ${saleData.items.map(item => `
          <div class="item">
            <div class="item-name">${item.name}</div>
            ${item.imei ? `<div class="item-imei" style="font-size: 12px; color: #666; margin: 2px 0;">IMEI: ${item.imei}</div>` : ''}
            <div class="item-line">
              <span>${item.quantity} x Bs ${(item.price * saleData.bcv_rate).toFixed(2)}</span>
              <span>Bs ${(item.price * item.quantity * saleData.bcv_rate).toFixed(2)}</span>
            </div>
          </div>
        `).join('')}
      </div>
      
      <div class="totals">
        <div class="total-line">
          <span>Subtotal:</span>
          <span>Bs ${(saleData.subtotal_usd * saleData.bcv_rate).toFixed(2)}</span>
        </div>
        <div class="total-line">
          <span>IVA (${taxRate || 0}%):</span>
          <span>Bs ${(saleData.tax_amount_usd * saleData.bcv_rate).toFixed(2)}</span>
        </div>
        <div class="total-line total-final">
          <span>TOTAL:</span>
          <span>Bs ${saleData.total_bs.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="footer">
        <div>${(receiptFooter || '¡Gracias por su compra!').replace(/\n/g, '\n')}</div>
      </div>
    </body>
    </html>
  `;

  // Crear un iframe oculto para impresión directa
  const printFrame = document.createElement('iframe');
  printFrame.style.position = 'absolute';
  printFrame.style.left = '-9999px';
  printFrame.style.top = '-9999px';
  printFrame.style.width = '88mm';
  printFrame.style.height = 'auto';
  printFrame.style.border = 'none';
  
  document.body.appendChild(printFrame);
  
  // Escribir contenido en el iframe
  printFrame.contentDocument?.write(printContent);
  printFrame.contentDocument?.close();
  
  // Esperar a que se cargue el contenido y luego imprimir
  printFrame.onload = () => {
    setTimeout(() => {
      try {
        // Intentar imprimir directamente
        printFrame.contentWindow?.print();
        
        // Remover el iframe después de un tiempo
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 1000);
      } catch (error) {
        console.error('Error al imprimir:', error);
        // Fallback: abrir ventana de impresión
        const printWindow = window.open('', '_blank', 'width=400,height=800');
        if (printWindow) {
          printWindow.document.write(printContent);
          printWindow.document.close();
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
              printWindow.close();
            }, 250);
          };
        }
        document.body.removeChild(printFrame);
      }
    }, 250);
  };
};
