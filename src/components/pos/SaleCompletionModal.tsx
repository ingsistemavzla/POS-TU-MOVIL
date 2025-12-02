import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Printer, CheckCircle, Loader2, Download, LogOut, ShoppingCart } from 'lucide-react';
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
  onNewSale?: () => void;
  onExitPOS?: () => void; // Nueva prop para salir del POS
}

export const SaleCompletionModal: React.FC<SaleCompletionModalProps> = ({
  isOpen,
  onClose,
  saleData,
  onPrintInvoice,
  onNewSale,
  onExitPOS
}) => {
  const navigate = useNavigate();
  const { getTaxRate, getReceiptFooter } = useSystemSettings();
  const { toast } = useToast();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printCompleted, setPrintCompleted] = useState(false);
  const [showActionButtons, setShowActionButtons] = useState(false);

  // Ref para controlar si ya se ejecutó la impresión para esta venta
  const printTriggeredRef = React.useRef<string | null>(null);

  // Efecto para impresión automática - INMEDIATO al abrir el modal
  useEffect(() => {
    // Solo ejecutar si el modal está abierto, hay datos válidos, y no se ha impreso ya esta factura
    if (isOpen && saleData && saleData.invoice_number && printTriggeredRef.current !== saleData.invoice_number) {
      console.log('🎉 SaleCompletionModal - Modal abierto, iniciando secuencia para:', saleData.invoice_number);
      
      // Marcar esta factura como procesada para evitar bucles
      printTriggeredRef.current = saleData.invoice_number;
      
      // Resetear estados INMEDIATAMENTE
      setPrintCompleted(false);
      setShowActionButtons(false);
      setIsPrinting(true); // Mostrar "Imprimiendo" inmediatamente
      
      // Esperar 2 segundos y ejecutar la impresión
      const printTimer = setTimeout(() => {
        console.log('🖨️ SaleCompletionModal - Ejecutando impresión automática...');
        onPrintInvoice();
        setIsPrinting(false);
        setPrintCompleted(true);
        setShowActionButtons(true); // Mostrar botones inmediatamente después de imprimir
      }, 2000);

      return () => clearTimeout(printTimer);
    }
    
    // Si el modal se cierra, resetear el ref para la próxima venta
    if (!isOpen) {
      printTriggeredRef.current = null;
      setPrintCompleted(false);
      setIsPrinting(false);
      setShowActionButtons(false);
    }
  }, [isOpen, saleData, onPrintInvoice]);

  // Función para salir del POS y redirigir a Dashboard
  const handleExitPOS = () => {
    if (onExitPOS) {
      onExitPOS();
    }
    // Siempre redirigir a /dashboard para romper el ciclo
    navigate('/dashboard');
  };

  // No renderizar si el modal no está abierto o no hay datos válidos
  console.log('🔍 SaleCompletionModal render - isOpen:', isOpen, 'saleData:', saleData?.invoice_number);
  
  if (!isOpen || !saleData || !saleData.invoice_number) {
    console.log('❌ SaleCompletionModal - No renderizando, condiciones no cumplidas');
    return null;
  }
  
  console.log('✅ SaleCompletionModal - Renderizando modal');

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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full border border-green-500/30">
        {/* Header - Mensaje Prominente de Éxito */}
        <div className="flex flex-col items-center justify-center p-8 border-b bg-green-50 dark:bg-green-950/50">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-20 w-20 text-green-600 animate-in zoom-in duration-300" />
          </div>
          <h2 className="text-3xl font-bold text-green-800 dark:text-green-400 mb-2 text-center animate-in fade-in duration-500">
            ✅ Venta Concretada con Éxito
          </h2>
          <p className="text-lg font-semibold text-green-700 dark:text-green-500 mb-4">
            Factura #{saleData.invoice_number}
          </p>
          
          {/* Mensaje de impresión secuencial */}
          {isPrinting && (
            <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-green-100 dark:bg-green-900/50 rounded-lg animate-in slide-in-from-top duration-300">
              <Loader2 className="h-5 w-5 animate-spin text-green-700 dark:text-green-400" />
              <p className="text-base text-green-700 dark:text-green-400 font-medium">🖨️ Imprimiendo Factura...</p>
            </div>
          )}
          {printCompleted && !isPrinting && (
            <div className="flex items-center gap-2 mt-4 px-4 py-2 bg-green-200 dark:bg-green-800/50 rounded-lg animate-in slide-in-from-top duration-300">
              <CheckCircle className="h-5 w-5 text-green-700 dark:text-green-400" />
              <p className="text-base text-green-700 dark:text-green-400 font-medium">✅ Factura Impresa</p>
            </div>
          )}
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

        {/* Actions - Botones Dinámicos según el estado */}
        <div className="flex flex-col gap-3 p-4 border-t bg-gray-50 dark:bg-zinc-800/50">
          {printCompleted ? (
            <>
              {/* Fila 1: Opciones secundarias (Imprimir de nuevo, PDF) */}
              <div className="flex gap-2">
                <button
                  onClick={onPrintInvoice}
                  className="flex-1 flex items-center justify-center space-x-2 bg-gray-100 dark:bg-zinc-700 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-600 transition-colors font-medium text-sm border border-gray-300 dark:border-zinc-600"
                >
                  <Printer className="h-4 w-4" />
                  <span>Reimprimir</span>
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex-1 flex items-center justify-center space-x-2 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-4 py-2 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors font-medium text-sm border border-purple-300 dark:border-purple-600"
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>{isGeneratingPDF ? 'Generando...' : 'Descargar PDF'}</span>
                </button>
              </div>
              
              {/* Fila 2: Botones principales de cierre */}
              <div className="flex gap-2 animate-in slide-in-from-bottom duration-300">
                {/* Botón Nueva Venta - Mantiene tienda y cliente */}
                {onNewSale && (
                  <button
                    onClick={onNewSale}
                    className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-base shadow-md"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    <span>Nueva Venta</span>
                  </button>
                )}
                
                {/* Botón Salir del POS - Redirige a Dashboard */}
                <button
                  onClick={handleExitPOS}
                  className="flex-1 flex items-center justify-center space-x-2 bg-gray-700 text-white px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors font-semibold text-base shadow-md"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Salir del POS</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Mientras imprime, mostrar mensaje de estado grande y visible */}
              <div className="flex flex-col items-center justify-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                <span className="text-base text-gray-700 dark:text-gray-300 font-medium">🖨️ Imprimiendo factura, por favor espere...</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
