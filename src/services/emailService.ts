// Email Service for sending invoices using SendGrid
// Modern implementation with SendGrid SDK

export interface EmailInvoiceData {
  invoice_number: string;
  customer_name: string;
  customer_email?: string;
  sale_date: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    subtotal: number;
    imei?: string;
  }>;
  subtotal_usd: number;
  tax_amount_usd: number;
  total_usd: number;
  total_bs: number;
  bcv_rate: number;
  payment_method: string;
  store_info?: {
    name: string;
    business_name: string | null;
    tax_id: string | null;
    fiscal_address: string | null;
    phone_fiscal: string | null;
    email_fiscal: string | null;
  };
  krece_enabled?: boolean;
  krece_initial_amount?: number;
  krece_financed_amount?: number;
  krece_initial_percentage?: number;
  krece_initial_payment_method?: string;
  receipt_footer?: string;
}

export class EmailService {
  // SendGrid configuration
  private static SENDGRID_API_KEY = import.meta.env.VITE_SENDGRID_API_KEY || '';
  private static FROM_EMAIL = import.meta.env.VITE_FROM_EMAIL || '';

    /**
   * Send invoice by email using SendGrid via API route
   * @param invoiceData - The invoice data to send
   * @param recipientEmail - The email address to send to
   * @returns Promise<boolean> - Success status
   */
  static async sendInvoice(invoiceData: EmailInvoiceData, recipientEmail?: string): Promise<boolean> {
    try {
      const toEmail = recipientEmail || invoiceData.customer_email || 'customer@example.com';
      
      console.log('📧 Email Service: Processing invoice email request');
      console.log('📧 Invoice details:', {
        to: toEmail,
        invoice: invoiceData.invoice_number,
        customer: invoiceData.customer_name,
        total: invoiceData.total_usd,
        items: invoiceData.items.length
      });

      // Check if we should use simulation mode
      const useSimulation = import.meta.env.VITE_EMAIL_SIMULATION === 'true';

      if (useSimulation) {
        console.log('📧 Running in simulation mode');
        console.log('📧 Would send email to:', toEmail);
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('✅ Email simulation completed successfully');
        return true;
      }

      // Real email sending with SendGrid via API route
      try {
        console.log('📧 Sending real email via SendGrid API route');
        
        // Get Supabase URL from environment
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
        
        const response = await fetch(`${supabaseUrl}/functions/v1/send-invoice-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            invoiceData,
            recipientEmail: toEmail
          })
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Email sent successfully via SendGrid:', result);
          return true;
        } else {
          const errorText = await response.text();
          console.error('❌ SendGrid API error:', response.status, errorText);
          throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
        }
        
      } catch (sendGridError) {
        console.error('❌ SendGrid error:', sendGridError);
        
        // Fallback to simulation if SendGrid fails
        if (import.meta.env.DEV) {
          console.log('🔄 Falling back to simulation mode');
          await new Promise(resolve => setTimeout(resolve, 2000));
          return true;
        }
        
        return false;
      }
      
    } catch (error) {
      console.error('❌ Email service error:', error);
      return false;
    }
  }

  /**
   * Generate plain text version of the invoice for email clients that don't support HTML
   * @param invoiceData - The invoice data
   * @returns string - Plain text content
   */
  static generatePlainText(invoiceData: EmailInvoiceData): string {
    const formatCurrency = (amount: number, currency: 'USD' | 'BS') => {
      return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: currency === 'USD' ? 'USD' : 'VES',
        minimumFractionDigits: 2
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('es-VE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    };

    let text = `FACTURA ${invoiceData.invoice_number}\n`;
    text += `Fecha: ${formatDate(invoiceData.sale_date)}\n\n`;
    text += `Cliente: ${invoiceData.customer_name}\n\n`;
    text += `PRODUCTOS:\n`;
    text += `----------------------------------------\n`;
    
    invoiceData.items.forEach(item => {
      text += `${item.name}\n`;
      text += `  Cantidad: ${item.quantity}\n`;
      text += `  Precio: ${formatCurrency(item.price, 'USD')}\n`;
      text += `  Subtotal: ${formatCurrency(item.subtotal, 'USD')}\n\n`;
    });
    
    text += `----------------------------------------\n`;
    text += `Subtotal: ${formatCurrency(invoiceData.subtotal_usd, 'USD')}\n`;
    text += `IVA: ${formatCurrency(invoiceData.tax_amount_usd, 'USD')}\n`;
    text += `Total USD: ${formatCurrency(invoiceData.total_usd, 'USD')}\n`;
    text += `Total BS: ${formatCurrency(invoiceData.total_bs, 'BS')}\n`;
    text += `Tasa BCV: ${invoiceData.bcv_rate.toFixed(4)}\n\n`;
    
    if (invoiceData.krece_enabled) {
      text += `INFORMACIÓN DE FINANCIAMIENTO KRECE:\n`;
      text += `Monto Inicial: ${formatCurrency(invoiceData.krece_initial_amount || 0, 'USD')}\n`;
      text += `Monto Financiado: ${formatCurrency(invoiceData.krece_financed_amount || 0, 'USD')}\n`;
      text += `Porcentaje Inicial: ${(invoiceData.krece_initial_percentage || 0).toFixed(1)}%\n`;
      text += `Método de Pago: ${invoiceData.krece_initial_payment_method || 'No especificado'}\n\n`;
    }
    
    text += `Gracias por su compra\n`;
    if (invoiceData.store_info?.business_name) {
      text += `${invoiceData.store_info.business_name}\n`;
    }
    
    return text;
  }

  /**
   * Generate invoice HTML content for email
   * @param invoiceData - The invoice data
   * @returns string - HTML content
   */
  static generateInvoiceHTML(invoiceData: EmailInvoiceData): string {
    const formatCurrency = (amount: number, currency: 'USD' | 'BS') => {
      return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: currency === 'USD' ? 'USD' : 'VES',
        minimumFractionDigits: 2
      }).format(amount);
    };

    const formatDate = (dateString: string) => {
      return new Date(dateString).toLocaleDateString('es-VE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Factura ${invoiceData.invoice_number}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #007bff; padding-bottom: 20px; }
          .header h1 { color: #007bff; margin: 0; font-size: 28px; }
          .header h2 { color: #333; margin: 10px 0; font-size: 24px; }
          .customer-info { margin-bottom: 20px; background-color: #f8f9fa; padding: 15px; border-radius: 5px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .items-table th { background-color: #007bff; color: white; font-weight: bold; }
          .items-table tr:nth-child(even) { background-color: #f8f9fa; }
          .totals { margin-top: 20px; background-color: #f8f9fa; padding: 20px; border-radius: 5px; }
          .total-row { font-weight: bold; font-size: 18px; color: #007bff; }
          .krece-info { background-color: #e3f2fd; padding: 20px; margin-top: 20px; border-radius: 5px; border-left: 4px solid #2196f3; }
          .footer { margin-top: 30px; text-align: center; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>FACTURA</h1>
            <h2>${invoiceData.invoice_number}</h2>
            <p><strong>Fecha:</strong> ${formatDate(invoiceData.sale_date)}</p>
          </div>

          <div class="customer-info">
            <h3>Cliente:</h3>
            <p><strong>${invoiceData.customer_name}</strong></p>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio USD</th>
                <th>Subtotal USD</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map(item => `
                <tr>
                  <td><strong>${item.name}</strong></td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.price, 'USD')}</td>
                  <td>${formatCurrency(item.subtotal, 'USD')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>Subtotal:</strong></span>
              <span>${formatCurrency(invoiceData.subtotal_usd, 'USD')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span><strong>IVA:</strong></span>
              <span>${formatCurrency(invoiceData.tax_amount_usd, 'USD')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-top: 1px solid #ddd; padding-top: 10px;">
              <span class="total-row">Total USD:</span>
              <span class="total-row">${formatCurrency(invoiceData.total_usd, 'USD')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
              <span class="total-row">Total BS:</span>
              <span class="total-row">${formatCurrency(invoiceData.total_bs, 'BS')}</span>
            </div>
            <div style="text-align: center; margin-top: 15px; color: #666;">
              <small>Tasa BCV: ${invoiceData.bcv_rate.toFixed(4)}</small>
            </div>
          </div>

          ${invoiceData.krece_enabled ? `
            <div class="krece-info">
              <h3>Información de Financiamiento Krece</h3>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span><strong>Monto Inicial:</strong></span>
                <span style="color: #4caf50;">${formatCurrency(invoiceData.krece_initial_amount || 0, 'USD')}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span><strong>Monto Financiado:</strong></span>
                <span style="color: #ff9800;">${formatCurrency(invoiceData.krece_financed_amount || 0, 'USD')}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span><strong>Porcentaje Inicial:</strong></span>
                <span>${(invoiceData.krece_initial_percentage || 0).toFixed(1)}%</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span><strong>Método de Pago:</strong></span>
                <span>${invoiceData.krece_initial_payment_method || 'No especificado'}</span>
              </div>
            </div>
          ` : ''}

          <div class="footer">
            <p><strong>Gracias por su compra</strong></p>
            ${invoiceData.store_info?.business_name ? `<p>${invoiceData.store_info.business_name}</p>` : ''}
            ${invoiceData.store_info?.fiscal_address ? `<p>${invoiceData.store_info.fiscal_address}</p>` : ''}
            ${invoiceData.store_info?.phone_fiscal ? `<p>Tel: ${invoiceData.store_info.phone_fiscal}</p>` : ''}
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
