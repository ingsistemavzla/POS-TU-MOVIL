import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Receipt,
  User,
  Store,
  CreditCard,
  Package,
  Printer,
  Download,
  X,
  Calendar,
  DollarSign,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/currency";
import { useAuth } from "@/contexts/AuthContext";
import { printInvoice } from "@/utils/printInvoice";
import { generateInvoicePDF } from "@/utils/invoicePdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteModal } from "@/components/ui/ConfirmDeleteModal";

interface SaleDetailModalProps {
  saleId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaleDeleted?: () => void;
}

interface SaleItem {
  id: string;
  product_name: string;
  qty: number;
  price_usd: number;
  subtotal_usd: number;
  product_id: string;
}

interface SaleDetail {
  id: string;
  invoice_number?: string;
  company_id: string;
  store_id: string;
  customer_id: string | null;
  cashier_id: string;
  total_usd: number;
  total_bs: number;
  bcv_rate_used: number;
  payment_method: string;
  status: string;
  created_at: string;
  // Store and customer info from joins
  store_name?: string;
  customer_name?: string;
  customer_id_number?: string;
  cashier_name?: string;
  items?: SaleItem[];
  // ✅ NUEVO: Campos financieros
  krece_enabled?: boolean;
  krece_initial_amount_usd?: number;
  krece_financed_amount_usd?: number;
  krece_initial_amount_bs?: number;
  krece_financed_amount_bs?: number;
  cashea_enabled?: boolean;
  cashea_initial_amount_usd?: number;
  cashea_financed_amount_usd?: number;
  cashea_initial_amount_bs?: number;
  cashea_financed_amount_bs?: number;
  subtotal_usd?: number;
  tax_amount_usd?: number;
}

export function SaleDetailModal({ saleId, open, onOpenChange, onSaleDeleted }: SaleDetailModalProps) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSale, setDeletingSale] = useState(false);

  const fetchSaleDetails = async (id: string) => {
    if (!userProfile?.company_id) {
      setError("No se pudo identificar la empresa");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Fetching sale details for ID:', id);

      // First, fetch the basic sale information - ✅ ACTUALIZADO: Incluir campos financieros
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .select(`
          id, invoice_number, company_id, store_id, customer_id, cashier_id, 
          total_usd, total_bs, bcv_rate_used, payment_method, status, created_at,
          subtotal_usd, tax_amount_usd,
          krece_enabled, krece_initial_amount_usd, krece_financed_amount_usd,
          krece_initial_amount_bs, krece_financed_amount_bs,
          cashea_enabled, cashea_initial_amount_usd, cashea_financed_amount_usd,
          cashea_initial_amount_bs, cashea_financed_amount_bs
        `)
        .eq('id', id)
        .eq('company_id', userProfile.company_id)
        .single();

      if (saleError || !saleData) {
        console.error('Sale error:', saleError);
        throw new Error('Venta no encontrada');
      }

      console.log('Sale data fetched:', saleData);

      // Fetch store information
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('name')
        .eq('id', saleData.store_id)
        .eq('company_id', userProfile.company_id)
        .single();

      if (storeError) {
        console.error('Store error:', storeError);
      }

      // Fetch customer information if exists
      let customerData = null;
      if (saleData.customer_id) {
        const { data: custData, error: custError } = await supabase
          .from('customers')
          .select('name, id_number')
          .eq('id', saleData.customer_id)
          .eq('company_id', userProfile.company_id)
          .single();

        if (custError) {
          console.error('Customer error:', custError);
        } else {
          customerData = custData;
        }
      }

      // Fetch cashier information
      const { data: cashierData, error: cashierError } = await supabase
        .from('users')
        .select('email')
        .eq('id', saleData.cashier_id)
        .single();

      if (cashierError) {
        console.error('Cashier error:', cashierError);
      }

      // ✅ INTENTAR OBTENER IMEI EN LA PRIMERA CONSULTA
      let itemsData: any[] = [];
      let imeiMap = new Map<string, string | null>();
      
      // Primero intentar con IMEI incluido
      const { data: itemsWithImei, error: itemsErrorWithImei } = await supabase
        .from('sale_items')
        .select('id, product_id, product_name, qty, price_usd, subtotal_usd, imei')
        .eq('sale_id', id);

      if (itemsErrorWithImei) {
        // Si falla, intentar sin IMEI
        console.warn('⚠️ Error obteniendo items con IMEI, intentando sin IMEI:', itemsErrorWithImei);
        const { data: itemsWithoutImei, error: itemsErrorWithoutImei } = await supabase
          .from('sale_items')
          .select('id, product_id, product_name, qty, price_usd, subtotal_usd')
          .eq('sale_id', id);

        if (itemsErrorWithoutImei) {
          console.error('❌ Error obteniendo items:', itemsErrorWithoutImei);
          throw itemsErrorWithoutImei;
        }
        
        itemsData = itemsWithoutImei || [];
        
        // Intentar obtener IMEIs por separado
        const itemIds = itemsData.map((item: any) => item.id);
        if (itemIds.length > 0) {
          try {
            const { data: imeiData, error: imeiError } = await supabase
              .from('sale_items')
              .select('id, imei')
              .in('id', itemIds);
            
            if (imeiError) {
              console.warn('⚠️ Error obteniendo IMEIs por separado:', imeiError);
            } else if (imeiData) {
              imeiMap = new Map(imeiData.map((item: any) => [item.id, item.imei || null]));
            }
          } catch (imeiError) {
            console.warn('⚠️ Excepción al obtener IMEIs:', imeiError);
          }
        }
      } else {
        // ✅ ÉXITO: IMEI incluido en la primera consulta
        itemsData = itemsWithImei || [];
        imeiMap = new Map(itemsData.map((item: any) => [item.id, item.imei || null]));
      }

      const itemsError = null; // Ya manejado arriba

      if (itemsError) {
        console.error('Items error:', itemsError);
      }

      // Transform items data
      const rawItems: SaleItem[] = itemsData.map((item: any) => ({
        id: item.id,
        product_name: item.product_name || 'Producto',
        qty: Number(item.qty) || 0,
        price_usd: Number(item.price_usd) || 0,
        subtotal_usd: Number(item.subtotal_usd) || 0,
        product_id: item.product_id,
        imei: item.imei || imeiMap.get(item.id) || null, // ✅ IMEI (de consulta directa o mapa)
        category: undefined as string | undefined, // Se llenará después
      }));

      // CONSOLIDACIÓN: Agrupar items por product_id y price_usd
      // Esto combina múltiples líneas de items serializados (ej: teléfonos con IMEIs)
      const groupedItemsMap = new Map<string, SaleItem>();
      
      rawItems.forEach((item) => {
        // Crear clave única por producto y precio
        const key = `${item.product_id}-${item.price_usd}`;
        
        if (groupedItemsMap.has(key)) {
          // Sumar cantidad y subtotal al item existente
          const existing = groupedItemsMap.get(key)!;
          existing.qty += item.qty;
          existing.subtotal_usd += item.subtotal_usd;
        } else {
          // Crear nuevo grupo con copia del item
          groupedItemsMap.set(key, { ...item });
        }
      });

      // Convertir el Map a array
      let items: SaleItem[] = Array.from(groupedItemsMap.values());

      // ✅ Obtener categorías de productos
      if (items.length > 0 && userProfile?.company_id) {
        const productIds = items
          .map(item => item.product_id)
          .filter(id => id) as string[];

        if (productIds.length > 0) {
          const { data: productsData } = await supabase
            .from('products')
            .select('id, category')
            .in('id', productIds);

          if (productsData) {
            const categoryMap = new Map(
              productsData.map((p: any) => [p.id, p.category])
            );

            items = items.map(item => ({
              ...item,
              category: categoryMap.get(item.product_id),
            }));
          }
        }
      }

      // Transform sale data
      const transformedSale: SaleDetail = {
        id: saleData.id,
        invoice_number: saleData.invoice_number,
        company_id: saleData.company_id,
        store_id: saleData.store_id,
        customer_id: saleData.customer_id,
        cashier_id: saleData.cashier_id,
        total_usd: saleData.total_usd,
        total_bs: saleData.total_bs,
        bcv_rate_used: saleData.bcv_rate_used,
        payment_method: saleData.payment_method,
        status: saleData.status || 'completed',
        created_at: saleData.created_at,
        store_name: storeData?.name || 'Tienda N/A',
        customer_name: customerData?.name || 'Cliente General',
        customer_id_number: customerData?.id_number,
        cashier_name: cashierData?.email || 'Cajero N/A',
        items: items,
        // ✅ NUEVO: Campos financieros
        subtotal_usd: saleData.subtotal_usd,
        tax_amount_usd: saleData.tax_amount_usd,
        krece_enabled: saleData.krece_enabled || false,
        krece_initial_amount_usd: saleData.krece_initial_amount_usd || 0,
        krece_financed_amount_usd: saleData.krece_financed_amount_usd || 0,
        krece_initial_amount_bs: saleData.krece_initial_amount_bs || 0,
        krece_financed_amount_bs: saleData.krece_financed_amount_bs || 0,
        cashea_enabled: saleData.cashea_enabled || false,
        cashea_initial_amount_usd: saleData.cashea_initial_amount_usd || 0,
        cashea_financed_amount_usd: saleData.cashea_financed_amount_usd || 0,
        cashea_initial_amount_bs: saleData.cashea_initial_amount_bs || 0,
        cashea_financed_amount_bs: saleData.cashea_financed_amount_bs || 0,
      };

      console.log('Transformed sale:', transformedSale);
      setSale(transformedSale);

    } catch (err) {
      console.error('Error fetching sale details:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar los detalles de la venta');
    } finally {
      setLoading(false);
    }
  };

  // Fetch store information for printing
  const fetchStoreInfo = async (storeId: string) => {
    try {
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select('business_name, tax_id, fiscal_address, phone_fiscal, email_fiscal')
        .eq('id', storeId)
        .eq('company_id', userProfile?.company_id)
        .single();

      if (storeError) {
        console.error('Store info error:', storeError);
      } else {
        setStoreInfo(storeData);
      }
    } catch (error) {
      console.error('Error fetching store info:', error);
    }
  };

  useEffect(() => {
    if (saleId && open) {
      fetchSaleDetails(saleId);
    } else {
      setSale(null);
      setStoreInfo(null);
    }
  }, [saleId, open]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash_usd': return 'Efectivo USD';
      case 'cash_bs': return 'Efectivo BS';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      case 'binance': return 'Binance';
      case 'zelle': return 'Zelle';
      default: return method;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Completada</Badge>;
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Handle print invoice
  const handlePrintInvoice = async () => {
    if (!sale) return;

    try {
      // Fetch store info if not already loaded
      if (!storeInfo) {
        await fetchStoreInfo(sale.store_id);
      }

      // ✅ CORRECCIÓN: Usar invoice_number real y datos correctos
      const printData = {
        invoice_number: sale.invoice_number || sale.id.slice(0, 8),
        customer: sale.customer_name || 'Cliente General',
        customer_id: sale.customer_id_number || null,
        items: sale.items?.map(item => ({
          id: item.id,
          name: item.product_name,
          sku: item.product_id.slice(0, 8), // TODO: usar product_sku real si está disponible
          price: item.price_usd,
          quantity: item.qty,
          imei: item.imei || undefined // ✅ Incluir IMEI si existe
        })) || [],
        subtotal_usd: sale.subtotal_usd || sale.items?.reduce((sum, item) => sum + item.subtotal_usd, 0) || 0,
        tax_amount_usd: sale.tax_amount_usd || 0, // ✅ Usar tax_amount_usd real (debe ser 0 según la lógica)
        total_usd: sale.total_usd,
        total_bs: sale.total_bs,
        bcv_rate: sale.bcv_rate_used,
        payment_method: sale.payment_method,
        sale_date: sale.created_at,
        store_info: storeInfo,
        cashier_name: sale.cashier_name || 'Cajero N/A'
      };

      printInvoice(printData, 0, '¡Gracias por su compra!'); // ✅ Tax rate = 0 (sin IVA)
      
      toast({
        title: "Impresión iniciada",
        description: "La factura se está enviando a la impresora",
      });
    } catch (error) {
      console.error('Error printing invoice:', error);
      toast({
        title: "Error al imprimir",
        description: "No se pudo imprimir la factura",
        variant: "destructive",
      });
    }
  };

  // Handle download PDF
  const handleDownloadPDF = async () => {
    if (!sale) return;

    try {
      // Fetch store info if not already loaded
      if (!storeInfo) {
        await fetchStoreInfo(sale.store_id);
      }

      // ✅ CORRECCIÓN: Usar invoice_number real
      const pdfData = {
        id: sale.id,
        invoice_number: sale.invoice_number || sale.id.slice(0, 8),
        customer_name: sale.customer_name || 'Cliente General',
        customer_id_number: sale.customer_id_number,
        store_name: sale.store_name || 'Tienda N/A',
        cashier_name: sale.cashier_name || 'Cajero N/A',
        total_usd: sale.total_usd,
        total_bs: sale.total_bs,
        bcv_rate_used: sale.bcv_rate_used,
        payment_method: sale.payment_method,
        created_at: sale.created_at,
        items: sale.items || [],
        store_info: storeInfo
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
    }
  };

  // Handle delete sale
  const handleDeleteSale = () => {
    if (!sale || !userProfile?.company_id) {
      toast({
        title: "Error",
        description: "No se pudo identificar la empresa o la venta",
        variant: "destructive",
      });
      return;
    }

    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!sale || !userProfile?.company_id) return;

    setDeletingSale(true);

    try {
      const { data: result, error } = await supabase.rpc('delete_sale_and_restore_inventory', {
        p_sale_id: sale.id
      });

      if (error) {
        console.error('Error deleting sale:', error);
        throw new Error(error.message);
      }

      if (result && (result as any).success) {
        toast({
          title: "Venta eliminada",
          description: `La venta ha sido eliminada exitosamente. Se repuso el inventario de ${(result as any).items_count} productos.`,
          variant: "success",
        });
        
        // Close modals and refresh data
        setShowDeleteModal(false);
        onOpenChange(false);
        if (onSaleDeleted) {
          onSaleDeleted();
        }
      } else {
        throw new Error((result as any)?.error || 'Error desconocido al eliminar la venta');
      }
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast({
        title: "Error al eliminar venta",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDeletingSale(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Receipt className="w-5 h-5 mr-2" />
            Detalles de la Venta
          </DialogTitle>
          <DialogDescription>
            {sale ? (sale.invoice_number || `Venta #${sale.id.slice(0, 8)}`) : 'Cargando detalles...'}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando detalles de la venta...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <X className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error al cargar</h3>
            <p className="text-muted-foreground">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => saleId && fetchSaleDetails(saleId)}
            >
              Reintentar
            </Button>
          </div>
        )}

        {sale && !loading && !error && (
          <div className="space-y-6">
            {/* Sale Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <Receipt className="w-5 h-5 mr-2" />
                    Información General
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Número de Factura:</span>
                    <span className="font-mono text-sm font-bold">{sale.invoice_number || sale.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Fecha:</span>
                    <span>{formatDate(sale.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Estado:</span>
                    {getStatusBadge(sale.status)}
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total USD:</span>
                    <span className="font-bold text-green-600">{formatCurrency(sale.total_usd)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Total BS:</span>
                    <span className="font-bold">Bs {sale.total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Tasa BCV:</span>
                    <span>Bs {sale.bcv_rate_used.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-lg">
                    <User className="w-5 h-5 mr-2" />
                    Cliente y Tienda
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Cliente:</span>
                    <span>{sale.customer_name}</span>
                  </div>
                  {sale.customer_id_number && (
                    <div className="flex justify-between">
                      <span className="font-medium">Cédula:</span>
                      <span>{sale.customer_id_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium">Tienda:</span>
                    <span>{sale.store_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Cajero:</span>
                    <span>{sale.cashier_name}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Payment Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Información de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Método de Pago:</span>
                      <Badge variant="outline">
                        {getPaymentMethodName(sale.payment_method)}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Total USD:</span>
                      <span className="font-bold">{formatCurrency(sale.total_usd)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Total BS:</span>
                      <span className="font-bold">Bs {sale.total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="font-medium">Tasa BCV:</span>
                      <span>Bs {sale.bcv_rate_used.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Fecha de Venta:</span>
                      <span>{formatDate(sale.created_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Estado:</span>
                      {getStatusBadge(sale.status)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ✅ NUEVO: Desglose Financiero */}
            {(sale.krece_enabled || sale.cashea_enabled) && (
              <Card className="border-green-500/30 bg-green-500/10 shadow-md shadow-green-500/20">
                <CardHeader className="border-b border-green-500/20">
                  <CardTitle className="flex items-center text-lg text-green-300">
                    <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                    {sale.cashea_enabled ? 'Financiamiento Cashea' : 'Financiamiento Krece'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {sale.cashea_enabled ? (
                    <>
                      <div className="flex justify-between items-center py-3 px-2 rounded-md bg-green-500/5 border border-green-500/20">
                        <span className="font-medium text-green-300">Inicial:</span>
                        <div className="text-right">
                          <div className="font-bold text-xl text-green-400">{formatCurrency(sale.cashea_initial_amount_usd || 0)}</div>
                          <div className="text-sm text-green-300/80 mt-1">
                            (Bs. {(sale.cashea_initial_amount_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-3 px-2 rounded-md bg-green-500/5 border border-green-500/20">
                        <span className="font-medium text-green-300">Financiado:</span>
                        <div className="text-right">
                          <div className="font-bold text-xl text-green-400">{formatCurrency(sale.cashea_financed_amount_usd || 0)}</div>
                          <div className="text-sm text-green-300/80 mt-1">
                            (Bs. {(sale.cashea_financed_amount_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </div>
                        </div>
                      </div>
                    </>
                  ) : sale.krece_enabled ? (
                    <>
                      <div className="flex justify-between items-center py-3 px-2 rounded-md bg-green-500/5 border border-green-500/20">
                        <span className="font-medium text-green-300">Inicial:</span>
                        <div className="text-right">
                          <div className="font-bold text-xl text-green-400">{formatCurrency(sale.krece_initial_amount_usd || 0)}</div>
                          <div className="text-sm text-green-300/80 mt-1">
                            (Bs. {(sale.krece_initial_amount_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center py-3 px-2 rounded-md bg-green-500/5 border border-green-500/20">
                        <span className="font-medium text-green-300">Financiado:</span>
                        <div className="text-right">
                          <div className="font-bold text-xl text-green-400">{formatCurrency(sale.krece_financed_amount_usd || 0)}</div>
                          <div className="text-sm text-green-300/80 mt-1">
                            (Bs. {(sale.krece_financed_amount_bs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                          </div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            )}

            {/* ✅ NUEVO: Desglose Contado (si no es financiado) */}
            {!sale.krece_enabled && !sale.cashea_enabled && (
              <Card className="border-green-500/30 bg-green-500/10 shadow-md shadow-green-500/20">
                <CardHeader className="border-b border-green-500/20">
                  <CardTitle className="flex items-center text-lg text-green-300">
                    <DollarSign className="w-5 h-5 mr-2 text-green-400" />
                    Desglose Financiero
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  <div className="flex justify-between items-center py-3 px-2 rounded-md bg-green-500/5 border border-green-500/20">
                    <span className="font-medium text-green-300">Pago Único:</span>
                    <div className="text-right">
                      <div className="font-bold text-xl text-green-400">{formatCurrency(sale.total_usd)}</div>
                      <div className="text-sm text-green-300/80 mt-1">
                        (Bs. {sale.total_bs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-lg">
                  <Package className="w-5 h-5 mr-2" />
                  Productos ({sale.items?.length || 0} {sale.items?.length === 1 ? 'producto' : 'productos'})
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({sale.items?.reduce((sum, item) => sum + item.qty, 0) || 0} unidades)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sale.items && sale.items.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Producto</TableHead>
                          <TableHead className="text-right">Cantidad</TableHead>
                          <TableHead className="text-right">Precio Unit.</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sale.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div className="font-medium">
                                {item.product_name}
                                {item.category === 'phones' && item.imei && (
                                  <div className="text-xs text-muted-foreground">IMEI: {item.imei}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{item.qty}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.price_usd)}</TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(item.subtotal_usd)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay productos registrados para esta venta
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                variant="default" 
                onClick={handlePrintInvoice}
                disabled={!sale || loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimir Factura
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownloadPDF}
                disabled={!sale || loading}
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar PDF
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteSale}
                disabled={!sale || loading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar Venta
              </Button>
            </div>
          </div>
        )}
      </DialogContent>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        saleData={sale ? {
          id: sale.id,
          invoice_number: sale.id.slice(0, 8),
          customer_name: sale.customer_name,
          items_count: sale.items?.length
        } : undefined}
        loading={deletingSale}
      />
    </Dialog>
  );
}

