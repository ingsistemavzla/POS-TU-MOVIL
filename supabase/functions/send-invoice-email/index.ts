import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface EmailInvoiceData {
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

function generateInvoiceHTML(invoiceData: EmailInvoiceData): string {
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
        .items-table th { background-color: #007bff; color: white; font-weight: normal; }
        .items-table tr:nth-child(even) { background-color: #f8f9fa; }
        .totals { margin-top: 20px; background-color: #f8f9fa; padding: 20px; border-radius: 5px; }
        .total-row { font-weight: normal; font-size: 18px; color: #007bff; }
        .krece-info { background-color: #e3f2fd; padding: 20px; margin-top: 20px; border-radius: 5px; border-left: 4px solid #2196f3; }
        .footer { margin-top: 30px; text-align: center; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>FACTURA</h1>
          <h2>${invoiceData.invoice_number}</h2>
          <p>Fecha: ${formatDate(invoiceData.sale_date)}</p>
        </div>

        <div class="customer-info">
          <h3>Cliente:</h3>
          <p>${invoiceData.customer_name}</p>
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
                <td>
                  ${item.name}
                  ${item.imei ? `<br><small style="color: #666;">IMEI: ${item.imei}</small>` : ''}
                </td>
                <td>${item.quantity}</td>
                <td>${formatCurrency(item.price, 'USD')}</td>
                <td>${formatCurrency(item.subtotal, 'USD')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>Subtotal:</span>
            <span>${formatCurrency(invoiceData.subtotal_usd, 'USD')}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span>IVA:</span>
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
              <span>Monto Inicial:</span>
              <span style="color: #4caf50;">${formatCurrency(invoiceData.krece_initial_amount || 0, 'USD')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Monto Financiado:</span>
              <span style="color: #ff9800;">${formatCurrency(invoiceData.krece_financed_amount || 0, 'USD')}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Porcentaje Inicial:</span>
              <span>${(invoiceData.krece_initial_percentage || 0).toFixed(1)}%</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
              <span>Método de Pago:</span>
              <span>${invoiceData.krece_initial_payment_method || 'No especificado'}</span>
            </div>
          </div>
        ` : ''}

        <div class="footer">
          <div style="white-space: pre-line; font-weight: normal;">${invoiceData.receipt_footer || '¡Gracias por su compra!'}</div>
          ${invoiceData.store_info?.business_name ? `<p>${invoiceData.store_info.business_name}</p>` : ''}
          ${invoiceData.store_info?.fiscal_address ? `<p>${invoiceData.store_info.fiscal_address}</p>` : ''}
          ${invoiceData.store_info?.phone_fiscal ? `<p>Tel: ${invoiceData.store_info.phone_fiscal}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  try {
    const { invoiceData, recipientEmail } = await req.json()
    
    if (!invoiceData || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required data' }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" }
        }
      )
    }

    // SendGrid configuration
    const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || '';
    const FROM_EMAIL = Deno.env.get("FROM_EMAIL") || '';
    
    console.log('📧 Edge Function: Processing email request');
    console.log('📧 To:', recipientEmail);
    console.log('📧 Invoice:', invoiceData.invoice_number);

    // SendGrid API call
    const htmlContent = generateInvoiceHTML(invoiceData);
    
    const msg = {
      to: recipientEmail,
      from: FROM_EMAIL,
      subject: `Factura ${invoiceData.invoice_number} - ${invoiceData.store_info?.business_name || 'Grupo Martinez'}`,
      html: htmlContent,
      text: `Factura ${invoiceData.invoice_number} - ${invoiceData.customer_name}`,
    };

    console.log('📧 Edge Function: Sending email via SendGrid...');
    
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(msg)
    });
    
    if (response.ok) {
      console.log('✅ Edge Function: Email sent successfully');
      console.log('✅ SendGrid response:', response.status);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email sent successfully',
          statusCode: response.status,
          invoice: invoiceData.invoice_number,
          recipient: recipientEmail
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      )
    } else {
      const errorText = await response.text();
      console.error('❌ Edge Function: SendGrid error:', response.status, errorText);
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          details: errorText,
          statusCode: response.status
        }),
        { 
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      )
    }
    
  } catch (error) {
    console.error('❌ Edge Function: Error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    )
  }
})
