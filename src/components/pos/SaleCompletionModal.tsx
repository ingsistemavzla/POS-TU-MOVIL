import React, { useState, useEffect } from 'react';
import { X, Printer, CheckCircle, Mail, Loader2, Download } from 'lucide-react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useToast } from '@/hooks/use-toast';
import { EmailService } from '@/services/emailService';
import { generateInvoicePDF } from '@/utils/invoicePdfGenerator';

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
  // KRece financing information
  krece_enabled?: boolean;
  krece_initial_amount?: number;
  krece_financed_amount?: number;
  krece_initial_percentage?: number;
  krece_initial_payment_method?: string;
  krece_payment_notes?: string;
  // Invoice totals (for Krece, this is the full amount)
  invoice_total_usd?: number;
  invoice_total_bs?: number;
}

interface SaleCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleData: SaleData;
  onPrintInvoice: () => void;
}

export const SaleCompletionModal: React.FC<SaleCompletionModalProps> = ({
  isOpen,
  onClose,
  saleData,
  onPrintInvoice
}) => {
  const { getTaxRate, getReceiptFooter } = useSystemSettings();
  const { toast } = useToast();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Efecto para cerrar automáticamente después de 5 segundos
  useEffect(() => {
    if (isOpen && saleData) {
      // Imprimir automáticamente al abrir
      setIsPrinting(true);
      setTimeout(() => {
        onPrintInvoice();
        setIsPrinting(false);
      }, 500);

      // Cerrar después de 5 segundos
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, saleData, onClose, onPrintInvoice]);

  if (!isOpen) return null;

  // Log the current tax rate for debugging
  const currentTaxRate = getTaxRate();
  console.log('SaleCompletionModal - Current tax rate:', currentTaxRate);

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

  const handleSendInvoiceEmail = async () => {
    setIsSendingEmail(true);
    try {
      // Transform saleData to match EmailInvoiceData interface
      const emailData = {
        invoice_number: saleData.invoice_number,
        customer_name: saleData.customer,
        customer_email: undefined, // TODO: Add customer email field
        sale_date: saleData.sale_date,
        items: saleData.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          subtotal: item.price * item.quantity,
          imei: item.imei
        })),
        subtotal_usd: saleData.subtotal_usd,
        tax_amount_usd: saleData.tax_amount_usd,
        total_usd: saleData.total_usd,
        total_bs: saleData.total_bs,
        bcv_rate: saleData.bcv_rate,
        payment_method: saleData.payment_method,
        store_info: saleData.store_info,
        krece_enabled: saleData.krece_enabled,
        krece_initial_amount: saleData.krece_initial_amount,
        krece_financed_amount: saleData.krece_financed_amount,
        krece_initial_percentage: saleData.krece_initial_percentage,
        krece_initial_payment_method: saleData.krece_initial_payment_method,
        receipt_footer: getReceiptFooter()
      };

      await EmailService.sendInvoice(emailData);
      toast({
        title: 'Factura enviada por correo',
        description: `La factura #${saleData.invoice_number} ha sido enviada a ${saleData.customer}.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error al enviar factura por correo',
        description: 'No se pudo enviar la factura por correo electrónico.',
        variant: 'destructive',
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      // Transform saleData to match InvoiceData interface
      const pdfData = {
        id: saleData.invoice_number,
        invoice_number: saleData.invoice_number,
        customer_name: saleData.customer,
        customer_id_number: saleData.customer_id,
        store_name: saleData.store_info?.name || 'Tienda N/A',
        cashier_name: saleData.cashier_name || 'Cajero N/A',
        total_usd: saleData.total_usd,
        total_bs: saleData.total_bs,
        bcv_rate_used: saleData.bcv_rate,
        payment_method: saleData.payment_method,
        created_at: saleData.sale_date,
        items: saleData.items.map(item => ({
          id: item.id,
          product_name: item.name,
          qty: item.quantity,
          price_usd: item.price,
          subtotal_usd: item.price * item.quantity,
          imei: item.imei
        })),
        store_info: saleData.store_info,
        receipt_footer: getReceiptFooter()
      };

      generateInvoicePDF(pdfData);
      
      toast({
        title: "PDF generado",
        description: "La factura se ha descargado correctamente",
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error al generar PDF",
        description: "No se pudo generar el PDF de la factura",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header - Mensaje Prominente de Éxito */}
        <div className="flex flex-col items-center justify-center p-8 border-b bg-green-50">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-green-800 mb-2 text-center">
            ✅ Venta Completada con Éxito
          </h2>
          <p className="text-lg font-semibold text-green-700 mb-4">
            Factura #{saleData.invoice_number}
          </p>
          
          {/* Mensaje pequeño de impresión */}
          <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-green-100 rounded-lg">
            {isPrinting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-green-700" />
                <p className="text-sm text-green-700 font-medium">Imprimiendo factura...</p>
              </>
            ) : (
              <>
                <Printer className="h-4 w-4 text-green-700" />
                <p className="text-sm text-green-700 font-medium">Imprimiendo factura...</p>
              </>
            )}
          </div>
        </div>

        {/* Resumen Compacto */}
        <div className="p-6 space-y-4">
          {/* Información Principal */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cliente:</span>
                <span className="font-semibold text-gray-900">{saleData.customer}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total USD:</span>
                <span className="text-2xl font-bold text-green-700">{formatCurrency(saleData.total_usd, 'USD')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total BS:</span>
                <span className="text-xl font-bold text-green-700">{formatCurrency(saleData.total_bs, 'BS')}</span>
              </div>
            </div>
          </div>

          {/* Detalles Opcionales (Colapsables) */}
          <details className="border rounded-lg">
            <summary className="px-4 py-3 cursor-pointer font-medium text-gray-700 hover:bg-gray-50">
              Ver Detalles Completos
            </summary>
            <div className="p-4 space-y-4 border-t">
          {/* Customer & Date Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Cliente</h3>
              {saleData.customer_id && (
                <p className="text-sm text-gray-600 mb-1">Cédula: {saleData.customer_id}</p>
              )}
              <p className="text-gray-900">{saleData.customer}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Información de Venta</h3>
              <p className="text-gray-900">{formatDate(saleData.sale_date)}</p>
              <p className="text-sm text-gray-600">Método: {saleData.payment_method}</p>
              {saleData.cashier_name && (
                <p className="text-sm text-gray-600">Cajero: {saleData.cashier_name}</p>
              )}
            </div>
          </div>

          {/* Store Information */}
          {saleData.store_info && Object.keys(saleData.store_info).length > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Información de la Tienda</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-blue-900 font-medium">{saleData.store_info.name}</p>
                  {saleData.store_info.business_name && (
                    <p className="text-sm text-blue-700">Razón Social: {saleData.store_info.business_name}</p>
                  )}
                  {saleData.store_info.tax_id && (
                    <p className="text-sm text-blue-700">RIF: {saleData.store_info.tax_id}</p>
                  )}
                </div>
                <div>
                  {saleData.store_info.fiscal_address && (
                    <p className="text-sm text-blue-700">Dirección Fiscal: {saleData.store_info.fiscal_address}</p>
                  )}
                  {saleData.store_info.phone_fiscal && (
                    <p className="text-sm text-blue-700">Tel: {saleData.store_info.phone_fiscal}</p>
                  )}
                  {saleData.store_info.email_fiscal && (
                    <p className="text-sm text-blue-700">Email: {saleData.store_info.email_fiscal}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">Productos</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Producto</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Cant.</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Precio</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {saleData.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-900">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-900">
                        {formatCurrency(item.price, 'USD')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(item.price * item.quantity, 'USD')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span>{formatCurrency(saleData.subtotal_usd, 'USD')}</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>IVA ({getTaxRate()}%):</span>
                <span>{formatCurrency(saleData.tax_amount_usd, 'USD')}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold text-gray-900 border-t pt-2">
                <span>Total USD:</span>
                <span>{formatCurrency(saleData.total_usd, 'USD')}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold text-green-700 bg-green-100 p-2 rounded">
                <span>Total BS:</span>
                <div className="text-right">
                  <div>{formatCurrency(saleData.total_bs, 'BS')}</div>
                  <div className="text-sm font-normal text-green-600">
                    Tasa BCV: {saleData.bcv_rate.toFixed(4)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* KRece Financing Information */}
          {saleData.krece_enabled && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                <h3 className="font-semibold text-blue-800">Krece Financiamiento</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-blue-700">
                  <span>Monto Inicial:</span>
                  <span className="font-semibold">{formatCurrency(saleData.krece_initial_amount || 0, 'USD')}</span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>Porcentaje Inicial:</span>
                  <span className="font-semibold">{(saleData.krece_initial_percentage || 0).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-blue-700">
                  <span>Total a Financiar:</span>
                  <span className="font-semibold">{formatCurrency(saleData.krece_financed_amount || 0, 'USD')}</span>
                </div>
                <div className="mt-3 pt-2 border-t border-blue-200">
                  <p className="text-sm text-blue-600">
                    El cliente pagará la inicial con el método seleccionado y el resto será financiado por Krece.
                  </p>
                </div>
              </div>
            </div>
          )}
            </div>
          </details>
        </div>

        {/* Actions - Botones Opcionales */}
        <div className="flex flex-col sm:flex-row gap-2 p-4 border-t bg-gray-50">
          <button
            onClick={onPrintInvoice}
            className="flex-1 flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex-1 flex items-center justify-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors font-medium text-sm"
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{isGeneratingPDF ? 'Generando...' : 'PDF'}</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
