import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import {
  User,
  Mail,
  Phone,
  MapPin,
  IdCard,
  Edit,
  Save,
  X,
  Calendar,
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Clock,
  UserPlus,
  CheckCircle,
  AlertCircle,
  Receipt,
  Store,
  Package,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
} from "lucide-react";

type Customer = Tables<"customers">;
type Sale = Tables<"sales">;

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onCustomerUpdated: () => void;
}

interface CustomerStats {
  totalPurchases: number;
  totalSpent: number;
  averageTicket: number;
  lastPurchase: string | null;
  firstPurchase: string | null;
  favoriteStore: string | null;
  purchaseFrequency: number;
}

interface SaleItem {
  id: string;
  product_name: string;
  quantity: number; // qty from database
  unit_price: number; // price_usd from database
  total_price: number; // subtotal_usd from database
  product_id: string;
}

interface CustomerSale extends Sale {
  store_name: string;
  items_count: number;
  items?: SaleItem[];
}

export default function CustomerDetailModal({
  customer,
  isOpen,
  onClose,
  onCustomerUpdated,
}: CustomerDetailModalProps) {
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    id_number: "",
  });
  const [stats, setStats] = useState<CustomerStats>({
    totalPurchases: 0,
    totalSpent: 0,
    averageTicket: 0,
    lastPurchase: null,
    firstPurchase: null,
    favoriteStore: null,
    purchaseFrequency: 0,
  });
  const [sales, setSales] = useState<CustomerSale[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      setFormData({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        id_number: customer.id_number || "",
      });
      fetchCustomerData();
    }
  }, [customer, isOpen]);

  const fetchCustomerData = async () => {
    if (!customer || !userProfile?.company_id) return;

    setLoading(true);
    try {
      // Fetch customer sales with store information
      const { data: salesData, error: salesError } = await (supabase as any)
        .from('sales')
        .select(`
          *,
          stores!inner(name)
        `)
        .eq('company_id', userProfile.company_id)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // Fetch items for each sale
      const customerSales: CustomerSale[] = await Promise.all(
        (salesData || []).map(async (sale) => {
          // Get sale items with product information
          const { data: itemsData, error: itemsError } = await supabase
            .from('sale_items')
            .select(`
              *,
              products!inner(name)
            `)
            .eq('sale_id', sale.id);

          if (itemsError) {
            console.error('Error fetching items for sale:', sale.id, itemsError);
          }



          const items: SaleItem[] = (itemsData || []).map((item: any) => ({
            id: item.id,
            product_name: item.products?.name || 'Producto',
            quantity: Number(item.qty) || 0,
            unit_price: Number(item.price_usd) || 0,
            total_price: Number(item.subtotal_usd) || 0,
            product_id: item.product_id,
          }));

          return {
            ...sale,
            store_name: (sale as any).stores?.name || 'Tienda Principal',
            items_count: items.length,
            items: items,
          };
        })
      );

      setSales(customerSales);

      // Calculate statistics
      if (customerSales.length > 0) {
        const totalSpent = customerSales.reduce((sum, sale) => sum + (sale.total_usd || 0), 0);
        const averageTicket = totalSpent / customerSales.length;
        const lastPurchase = customerSales[0].created_at;
        const firstPurchase = customerSales[customerSales.length - 1].created_at;

        // Calculate favorite store
        const storeCounts = customerSales.reduce((acc, sale) => {
          acc[sale.store_name] = (acc[sale.store_name] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const favoriteStore = Object.entries(storeCounts)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

        // Calculate purchase frequency
        let purchaseFrequency = 0;
        if (customerSales.length > 1) {
          const firstDate = new Date(firstPurchase);
          const lastDate = new Date(lastPurchase);
          const totalDays = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
          purchaseFrequency = Math.round(totalDays / (customerSales.length - 1));
        }

        setStats({
          totalPurchases: customerSales.length,
          totalSpent,
          averageTicket,
          lastPurchase,
          firstPurchase,
          favoriteStore,
          purchaseFrequency,
        });
      } else {
        setStats({
          totalPurchases: 0,
          totalSpent: 0,
          averageTicket: 0,
          lastPurchase: null,
          firstPurchase: null,
          favoriteStore: null,
          purchaseFrequency: 0,
        });
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
      toast({
        title: "Error cargando datos",
        description: "No se pudieron cargar los datos del cliente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customer || !userProfile?.company_id) return;

    try {
      const { error } = await (supabase as any)
        .from('customers')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', customer.id);

      if (error) throw error;

      toast({
        title: "Cliente actualizado",
        description: "La información del cliente se actualizó correctamente",
      });

      setIsEditing(false);
      onCustomerUpdated();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el cliente",
        variant: "destructive",
      });
    }
  };

  const toggleSaleExpansion = (saleId: string) => {
    const newExpanded = new Set(expandedSales);
    if (newExpanded.has(saleId)) {
      newExpanded.delete(saleId);
    } else {
      newExpanded.add(saleId);
    }
    setExpandedSales(newExpanded);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    const numAmount = Number(amount) || 0;
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCustomerStatus = () => {
    if (stats.totalPurchases === 0) {
      return { label: "Nuevo", color: "bg-blue-100 text-blue-800", icon: UserPlus };
    } else if (stats.totalPurchases >= 5) {
      return { label: "Frecuente", color: "bg-green-100 text-green-800", icon: CheckCircle };
    } else {
      return { label: "Activo", color: "bg-yellow-100 text-yellow-800", icon: Clock };
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'efectivo':
        return DollarSign;
      case 'tarjeta':
      case 'card':
        return CreditCard;
      case 'transferencia':
        return FileText;
      default:
        return DollarSign;
    }
  };

  if (!customer) return null;

  const status = getCustomerStatus();
  const StatusIcon = status.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Detalles del Cliente</DialogTitle>
              <DialogDescription>
                Información completa y historial de compras
              </DialogDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className={`${status.color} text-xs`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {status.label}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Information */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <User className="w-4 h-4 mr-2" />
                Información Personal
              </h3>
              
              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="name">Nombre *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="id_number">Cédula / RIF</Label>
                    <Input
                      id="id_number"
                      value={formData.id_number}
                      onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="address">Dirección</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button size="sm" onClick={handleSave} className="flex-1">
                      <Save className="w-4 h-4 mr-1" />
                      Guardar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{customer.name}</span>
                  </div>
                  
                  {customer.id_number && (
                    <div className="flex items-center space-x-2">
                      <IdCard className="w-4 h-4 text-muted-foreground" />
                      <span>{customer.id_number}</span>
                    </div>
                  )}
                  
                  {customer.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{customer.email}</span>
                    </div>
                  )}
                  
                  {customer.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{customer.phone}</span>
                    </div>
                  )}
                  
                  {customer.address && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{customer.address}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2 pt-2 border-t">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Cliente desde: {formatDate(customer.created_at)}
                    </span>
                  </div>
                </div>
              )}
            </Card>

            {/* Statistics */}
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Estadísticas
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total de Compras:</span>
                  <span className="font-semibold">{stats.totalPurchases}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total Gastado:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(stats.totalSpent)}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Ticket Promedio:</span>
                  <span className="font-semibold">
                    {formatCurrency(stats.averageTicket)}
                  </span>
                </div>
                
                {stats.favoriteStore && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Tienda Favorita:</span>
                    <span className="font-semibold">{stats.favoriteStore}</span>
                  </div>
                )}
                
                {stats.purchaseFrequency > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Frecuencia:</span>
                    <span className="font-semibold">{stats.purchaseFrequency} días</span>
                  </div>
                )}
                
                {stats.lastPurchase && (
                  <div className="pt-2 border-t">
                    <div className="text-sm text-muted-foreground">
                      Última compra: {formatDate(stats.lastPurchase)}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Purchase History */}
          <div className="lg:col-span-2">
            <Card className="p-4">
              <h3 className="font-semibold mb-3 flex items-center">
                <Receipt className="w-4 h-4 mr-2" />
                Historial de Compras
              </h3>
              
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                  ))}
                </div>
              ) : sales.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {sales.map((sale) => {
                    const isExpanded = expandedSales.has(sale.id);
                    const PaymentIcon = getPaymentMethodIcon(sale.payment_method);
                    
                    return (
                      <div key={sale.id} className="border rounded-lg overflow-hidden">
                        {/* Sale Header */}
                        <div 
                          className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => toggleSaleExpansion(sale.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex items-center space-x-2">
                                <Store className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{sale.store_name}</span>
                              </div>
                                                             <Badge variant="outline" className="text-xs">
                                 #{sale.id}
                               </Badge>
                              <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                                <PaymentIcon className="w-3 h-3" />
                                <span>{sale.payment_method}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className="font-semibold text-green-600">
                                {formatCurrency(sale.total_usd || 0)}
                              </span>
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-sm text-muted-foreground mt-2">
                            <span>{formatDate(sale.created_at)}</span>
                            <div className="flex items-center space-x-2">
                              <ShoppingBag className="w-3 h-3" />
                              <span>{sale.items_count} items</span>
                            </div>
                          </div>
                        </div>

                        {/* Sale Items (Expanded) */}
                        {isExpanded && sale.items && sale.items.length > 0 && (
                          <div className="border-t bg-muted/20">
                            <div className="p-4">
                              <h4 className="font-medium mb-3 flex items-center">
                                <Package className="w-4 h-4 mr-2" />
                                Items de la Factura
                              </h4>
                              <div className="space-y-3">
                                {sale.items.map((item) => (
                                  <div key={item.id} className="flex items-center justify-between p-3 bg-background rounded border">
                                    <div className="flex-1">
                                      <p className="font-medium text-sm">{item.product_name}</p>
                                      <div className="flex items-center space-x-3 text-xs text-muted-foreground mt-1">
                                        <span className="flex items-center space-x-1">
                                          <span className="font-medium">Cantidad:</span>
                                          <span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                                            {item.quantity}
                                          </span>
                                        </span>
                                        <span className="flex items-center space-x-1">
                                          <span className="font-medium">Precio Unitario:</span>
                                          <span className="bg-muted px-2 py-1 rounded">
                                            {formatCurrency(item.unit_price)}
                                          </span>
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-bold text-sm text-green-600">
                                        {formatCurrency(item.total_price)}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Subtotal
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              
                              {/* Sale Summary */}
                              <div className="mt-4 pt-3 border-t">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">Total Factura:</span>
                                  <span className="font-bold text-lg text-green-600">
                                    {formatCurrency(sale.total_usd || 0)}
                                  </span>
                                </div>
                                                                 {(sale as any).notes && (
                                   <div className="mt-2 text-sm text-muted-foreground">
                                     <span className="font-medium">Notas:</span> {(sale as any).notes}
                                   </div>
                                 )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="font-medium mb-2">Sin compras registradas</h4>
                  <p className="text-sm text-muted-foreground">
                    Este cliente aún no ha realizado ninguna compra
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
