import React, { useEffect, useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import CustomerDetailModal from "@/components/customers/CustomerDetailModal";
import { exportCustomersToCSV, exportCustomerReport } from "@/utils/customerExporter";
import {
  Search,
  Plus,
  Users,
  Mail,
  Phone,
  MapPin,
  IdCard,
  Edit,
  Trash2,
  RefreshCw,
  Filter,
  Download,
  Upload,
  Calendar,
  UserPlus,
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
} from "lucide-react";

type Customer = Tables<"customers">;

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newThisMonth: number;
  totalSales: number;
}

interface CustomerWithStats extends Customer {
  totalPurchases: number;
  totalSpent: number;
  lastPurchase: string | null;
}

export default function CustomersPage() {
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const [customers, setCustomers] = useState<CustomerWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerStats>({
    totalCustomers: 0,
    activeCustomers: 0,
    newThisMonth: 0,
    totalSales: 0,
  });

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    id_number: "",
  });

  // Filter state
  const [filterBy, setFilterBy] = useState<"all" | "active" | "inactive" | "new">("all");
  const [sortBy, setSortBy] = useState<"name" | "created_at" | "totalPurchases" | "totalSpent">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const companyId = userProfile?.company_id;

  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter((customer) => {
      const matchesSearch = 
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.id_number?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      switch (filterBy) {
        case "active":
          return customer.totalPurchases > 0;
        case "inactive":
          return customer.totalPurchases === 0;
        case "new":
          const thisMonth = new Date();
          thisMonth.setDate(1);
          return new Date(customer.created_at) >= thisMonth;
        default:
          return true;
      }
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "created_at":
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case "totalPurchases":
          aValue = a.totalPurchases;
          bValue = b.totalPurchases;
          break;
        case "totalSpent":
          aValue = a.totalSpent;
          bValue = b.totalSpent;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [customers, searchTerm, filterBy, sortBy, sortOrder]);

  const fetchCustomers = async () => {
    if (!companyId) return;
    
    setLoading(true);
    try {
      // Fetch customers with their sales statistics
      const { data: customersData, error: customersError } = await supabase
        .from('customers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (customersError) throw customersError;

      // Fetch sales data for statistics
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('customer_id, total_usd, created_at')
        .eq('company_id', companyId)
        .not('customer_id', 'is', null);

      if (salesError) throw salesError;

      // Calculate statistics for each customer
      const customersWithStats: CustomerWithStats[] = (customersData || []).map(customer => {
        const customerSales = salesData?.filter(sale => sale.customer_id === customer.id) || [];
        const totalPurchases = customerSales.length;
        const totalSpent = customerSales.reduce((sum, sale) => sum + (sale.total_usd || 0), 0);
        const lastPurchase = customerSales.length > 0 
          ? customerSales.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
          : null;

        return {
          ...customer,
          totalPurchases,
          totalSpent,
          lastPurchase,
        };
      });

      setCustomers(customersWithStats);

      // Calculate overall stats
      const totalCustomers = customersWithStats.length;
      const activeCustomers = customersWithStats.filter(c => c.totalPurchases > 0).length;
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const newThisMonth = customersWithStats.filter(c => new Date(c.created_at) >= thisMonth).length;
      const totalSales = customersWithStats.reduce((sum, c) => sum + c.totalSpent, 0);

      setStats({
        totalCustomers,
        activeCustomers,
        newThisMonth,
        totalSales,
      });

    } catch (error) {
      console.error('Error fetching customers:', error);
      toast({
        title: "Error cargando clientes",
        description: "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    try {
      if (editingCustomer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;

        toast({
          title: "Cliente actualizado",
          description: "El cliente se actualizó correctamente",
        });
      } else {
        // Create new customer
        const { error } = await supabase
          .from('customers')
          .insert([{
            ...formData,
            company_id: companyId,
          }]);

        if (error) throw error;

        toast({
          title: "Cliente creado",
          description: "El cliente se creó correctamente",
        });
      }

      setShowForm(false);
      setEditingCustomer(null);
      setFormData({ name: "", email: "", phone: "", address: "", id_number: "" });
      fetchCustomers();
    } catch (error) {
      console.error('Error saving customer:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar el cliente",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingCustomer) return;

    try {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', deletingCustomer.id);

      if (error) throw error;

      toast({
        title: "Cliente eliminado",
        description: "El cliente se eliminó correctamente",
      });

      setDeletingCustomer(null);
      fetchCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el cliente",
        variant: "destructive",
      });
    }
  };

  const openEditForm = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      id_number: customer.id_number || "",
    });
    setShowForm(true);
  };

  const openCreateForm = () => {
    setEditingCustomer(null);
    setFormData({ name: "", email: "", phone: "", address: "", id_number: "" });
    setShowForm(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-VE');
  };

  const getCustomerStatus = (customer: CustomerWithStats) => {
    if (customer.totalPurchases === 0) {
      return { label: "Nuevo", color: "bg-blue-100 text-blue-800", icon: UserPlus };
    } else if (customer.totalPurchases >= 5) {
      return { label: "Frecuente", color: "bg-green-100 text-green-800", icon: CheckCircle };
    } else {
      return { label: "Activo", color: "bg-yellow-100 text-yellow-800", icon: Clock };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 xs:space-y-4 sm:space-y-6 p-3 xs:p-4 sm:p-6">
      {/* Header Mobile First */}
      <div className="flex flex-col space-y-3 xs:space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div className="space-y-1 xs:space-y-2">
          <h1 className="text-lg xs:text-xl sm:text-2xl font-bold">Clientes</h1>
          <p className="text-xs xs:text-sm text-muted-foreground">Gestiona tu base de clientes</p>
        </div>
        <div className="flex flex-col xs:flex-row gap-2 xs:gap-2">
          <Button 
            variant="outline" 
            onClick={() => exportCustomerReport(filteredCustomers, stats)}
            disabled={filteredCustomers.length === 0}
            className="w-full xs:w-auto h-10 xs:h-9 text-sm xs:text-sm touch-manipulation"
          >
            <Download className="w-4 h-4 mr-2" />
            <span className="hidden xs:inline">Exportar</span>
            <span className="xs:hidden">Exportar</span>
          </Button>
          <Button 
            onClick={openCreateForm} 
            className="w-full xs:w-auto h-10 xs:h-9 text-sm xs:text-sm touch-manipulation bg-gradient-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden xs:inline">Nuevo Cliente</span>
            <span className="xs:hidden">Nuevo</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards - 4 columnas en PC */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 xs:gap-3 sm:gap-4">
        <Card className="p-3 xs:p-4">
          <div className="flex items-center space-x-2 xs:space-x-3">
            <div className="p-1.5 xs:p-2 bg-blue-100 rounded-lg">
              <Users className="w-4 h-4 xs:w-5 xs:h-5 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs xs:text-sm text-muted-foreground">Total Clientes</p>
              <p className="text-lg xs:text-xl sm:text-2xl font-bold">{stats.totalCustomers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 xs:p-4">
          <div className="flex items-center space-x-2 xs:space-x-3">
            <div className="p-1.5 xs:p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-4 h-4 xs:w-5 xs:h-5 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs xs:text-sm text-muted-foreground">Clientes Activos</p>
              <p className="text-lg xs:text-xl sm:text-2xl font-bold">{stats.activeCustomers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 xs:p-4">
          <div className="flex items-center space-x-2 xs:space-x-3">
            <div className="p-1.5 xs:p-2 bg-yellow-100 rounded-lg">
              <UserPlus className="w-4 h-4 xs:w-5 xs:h-5 text-yellow-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs xs:text-sm text-muted-foreground">Nuevos este Mes</p>
              <p className="text-lg xs:text-xl sm:text-2xl font-bold">{stats.newThisMonth}</p>
            </div>
          </div>
        </Card>

        <Card className="p-3 xs:p-4">
          <div className="flex items-center space-x-2 xs:space-x-3">
            <div className="p-1.5 xs:p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-4 h-4 xs:w-5 xs:h-5 text-purple-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs xs:text-sm text-muted-foreground">Ventas Totales</p>
              <p className="text-lg xs:text-xl sm:text-2xl font-bold">{formatCurrency(stats.totalSales)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters and Search - Mobile First */}
      <Card className="p-3 xs:p-4">
        <div className="flex flex-col space-y-3 xs:space-y-4 sm:flex-row sm:gap-4">
          {/* Búsqueda - Full width en móvil */}
          <div className="flex-1 min-w-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full text-sm xs:text-base h-10 xs:h-11"
              />
            </div>
          </div>
          
          {/* Filtros - Stack en móvil, flex en desktop */}
          <div className="flex flex-col xs:flex-row gap-2 xs:gap-2">
            <Select value={filterBy} onValueChange={(value) => setFilterBy(value as any)}>
              <SelectTrigger className="w-full xs:w-[140px] text-sm xs:text-base h-10 xs:h-11">
                <SelectValue placeholder="Filtrar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
                <SelectItem value="new">Nuevos</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={`${sortBy}-${sortOrder}`} 
              onValueChange={(value) => {
                const [field, order] = value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
            >
              <SelectTrigger className="w-full xs:w-[160px] text-sm xs:text-base h-10 xs:h-11">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Nombre A-Z</SelectItem>
                <SelectItem value="name-desc">Nombre Z-A</SelectItem>
                <SelectItem value="created_at-desc">Más Recientes</SelectItem>
                <SelectItem value="created_at-asc">Más Antiguos</SelectItem>
                <SelectItem value="totalPurchases-desc">Más Compras</SelectItem>
                <SelectItem value="totalSpent-desc">Mayor Gasto</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={fetchCustomers}
              className="w-full xs:w-auto h-10 xs:h-11 text-sm xs:text-sm touch-manipulation"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Customers Grid - Mobile First */}
      <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 xs:gap-4">
        {filteredCustomers.map((customer) => {
          const status = getCustomerStatus(customer);
          const StatusIcon = status.icon;

          return (
            <Card key={customer.id} className="p-3 xs:p-4 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-2 xs:mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base xs:text-lg truncate">{customer.name}</h3>
                  <Badge className={`${status.color} text-xs mt-1`}>
                    <StatusIcon className="w-3 h-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                <div className="flex space-x-1 ml-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setViewingCustomer(customer)}
                    title="Ver detalles"
                    className="h-8 w-8 xs:h-9 xs:w-9 p-0 touch-manipulation"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openEditForm(customer)}
                    title="Editar"
                    className="h-8 w-8 xs:h-9 xs:w-9 p-0 touch-manipulation"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeletingCustomer(customer)}
                    title="Eliminar"
                    className="h-8 w-8 xs:h-9 xs:w-9 p-0 touch-manipulation text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5 xs:space-y-2 text-xs xs:text-sm">
                {customer.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3 h-3 xs:w-4 xs:h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                
                {customer.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3 h-3 xs:w-4 xs:h-4 text-muted-foreground flex-shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                )}

                {customer.id_number && (
                  <div className="flex items-center space-x-2">
                    <IdCard className="w-3 h-3 xs:w-4 xs:h-4 text-muted-foreground flex-shrink-0" />
                    <span>{customer.id_number}</span>
                  </div>
                )}

                {customer.address && (
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3 h-3 xs:w-4 xs:h-4 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{customer.address}</span>
                  </div>
                )}

                <div className="pt-1.5 xs:pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-1.5 xs:space-x-2">
                      <ShoppingBag className="w-3 h-3 xs:w-4 xs:h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs xs:text-sm">{customer.totalPurchases} compras</span>
                    </div>
                    <span className="font-semibold text-green-600 text-xs xs:text-sm">
                      {formatCurrency(customer.totalSpent)}
                    </span>
                  </div>
                  
                  {customer.lastPurchase && (
                    <div className="flex items-center space-x-1.5 xs:space-x-2 mt-1">
                      <Calendar className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        Última compra: {formatDate(customer.lastPurchase)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <Card className="p-6 xs:p-8 text-center">
          <Users className="w-8 h-8 xs:w-12 xs:h-12 text-muted-foreground mx-auto mb-3 xs:mb-4" />
          <h3 className="text-base xs:text-lg font-semibold mb-2">No se encontraron clientes</h3>
          <p className="text-sm xs:text-base text-muted-foreground mb-4 px-4">
            {searchTerm ? "Intenta con otros términos de búsqueda" : "Comienza agregando tu primer cliente"}
          </p>
          {!searchTerm && (
            <Button 
              onClick={openCreateForm}
              className="h-10 xs:h-11 text-sm xs:text-base touch-manipulation"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden xs:inline">Agregar Cliente</span>
              <span className="xs:hidden">Agregar</span>
            </Button>
          )}
        </Card>
      )}

      {/* Create/Edit Customer Modal - Mobile First */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg xs:text-xl">
              {editingCustomer ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
            <DialogDescription className="text-sm xs:text-base">
              {editingCustomer 
                ? "Modifica la información del cliente"
                : "Agrega un nuevo cliente a tu base de datos"
              }
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-3 xs:space-y-4">
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 xs:gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="h-10 xs:h-11 text-sm xs:text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="id_number" className="text-sm">Cédula</Label>
                <Input
                  id="id_number"
                  value={formData.id_number}
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                  className="h-10 xs:h-11 text-sm xs:text-base"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 xs:gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-10 xs:h-11 text-sm xs:text-base"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm">Teléfono</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-10 xs:h-11 text-sm xs:text-base"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm">Dirección</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="h-10 xs:h-11 text-sm xs:text-base"
              />
            </div>

            <DialogFooter className="flex flex-col xs:flex-row gap-2 xs:gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowForm(false)}
                className="w-full xs:w-auto h-10 xs:h-11 text-sm xs:text-base touch-manipulation"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="w-full xs:w-auto h-10 xs:h-11 text-sm xs:text-base touch-manipulation"
              >
                {editingCustomer ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal - Mobile First */}
      <Dialog open={!!deletingCustomer} onOpenChange={() => setDeletingCustomer(null)}>
        <DialogContent className="w-[95vw] max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-lg xs:text-xl">Eliminar Cliente</DialogTitle>
            <DialogDescription className="text-sm xs:text-base">
              ¿Estás seguro de que quieres eliminar a {deletingCustomer?.name}? 
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex flex-col xs:flex-row gap-2 xs:gap-2">
            <Button 
              variant="outline" 
              onClick={() => setDeletingCustomer(null)}
              className="w-full xs:w-auto h-10 xs:h-11 text-sm xs:text-base touch-manipulation"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              className="w-full xs:w-auto h-10 xs:h-11 text-sm xs:text-base touch-manipulation"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Detail Modal */}
      <CustomerDetailModal
        customer={viewingCustomer}
        isOpen={!!viewingCustomer}
        onClose={() => setViewingCustomer(null)}
        onCustomerUpdated={fetchCustomers}
      />
    </div>
  );
}
