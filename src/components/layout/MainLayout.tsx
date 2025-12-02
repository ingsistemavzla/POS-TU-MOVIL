import { useEffect, useState, useRef } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  Store, 
  Settings,
  MessageCircle,
  Menu,
  X,
  TrendingUp,
  DollarSign,
  Box,
  UserCheck,
  Receipt,
  Warehouse,
  BarChart3,
  Grid3x3,
  Shield,
  RefreshCw,
  AlertTriangle,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/layout/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { NegativeStockAlert } from "@/components/inventory/NegativeStockAlert";
import { useToast } from "@/hooks/use-toast";

const getNavigationByRole = (role: string) => {
  const allNavigation = [
    // ========== MASTER_ADMIN - Panel de Auditoría ==========
    {
      name: 'Panel de Auditoría',
      href: '/master-audit',
      icon: Shield,
      roles: ['master_admin'],  // EXCLUSIVO para master_admin
    },
    {
      name: 'Papelera',
      href: '/deleted-products',
      icon: Trash2,
      roles: ['master_admin'],  // EXCLUSIVO para master_admin
    },
    {
      name: 'Estadísticas',
      href: '/estadisticas',
      icon: BarChart3,
      roles: ['admin', 'manager', 'master_admin'],  // Lectura permitida
    },
    // ========== ROLES OPERATIVOS (admin, manager, cashier) ==========
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'manager'],  // NO master_admin
    },
    {
      name: 'POS',
      href: '/pos',
      icon: ShoppingCart,
      roles: ['admin', 'manager', 'cashier'],  // NO master_admin
    },
    {
      name: 'Almacén',
      href: '/almacen',
      icon: Warehouse,
      roles: ['admin', 'manager', 'cashier'],  // Cashier: solo lectura
    },
    {
      name: 'Artículos',
      href: '/articulos',
      icon: Grid3x3,
      roles: ['admin', 'manager'],  // NO master_admin
    },
    {
      name: 'Ventas',
      href: '/sales',
      icon: Receipt,
      roles: ['admin', 'manager'],  // NO master_admin
    },
    {
      name: 'Clientes',
      href: '/customers',
      icon: UserCheck,
      roles: ['admin', 'manager'],  // NO master_admin
    },
    {
      name: 'Tiendas',
      href: '/stores',
      icon: Store,
      roles: ['admin'],  // NO master_admin - Gestión de sucursales
    },
    {
      name: 'Usuarios',
      href: '/users',
      icon: Users,
      roles: ['admin'],  // NO master_admin - Gestión de usuarios
    },
    {
      name: 'Reportes',
      href: '/reports',
      icon: TrendingUp,
      roles: ['admin', 'manager'],  // Manager puede ver reportes de su tienda
    },
    {
      name: 'Configuración',
      href: '/settings',
      icon: Settings,
      roles: ['admin'],  // NO master_admin - Configuración del sistema
    },
  ];

  return allNavigation.filter(item => item.roles.includes(role));
};

interface StoreOption {
  id: string;
  name: string;
}

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { company, userProfile, isSlowNetwork, retryProfileFetch } = useAuth();
  const { toast } = useToast();
  const slowNetworkToastShown = useRef(false);
  const [storeName, setStoreName] = useState<string>("Tienda Principal");
  const [storesList, setStoresList] = useState<StoreOption[]>([]);

  const isActive = (path: string) => {
    if (path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')) return true;
    if (path === '/' && location.pathname === '/') return true;
    return path !== '/' && path !== '/dashboard' && location.pathname.startsWith(path);
  };

  // Update page title dynamically with company name
  useEffect(() => {
    if (company?.name) {
      document.title = `${company.name} - POS Multitienda`;
    }
  }, [company?.name]);

  // Fetch stores list for master_admin
  useEffect(() => {
    const loadStoresList = async () => {
      if (userProfile?.role !== 'master_admin') return;
      
      const { data } = await (supabase as any)
        .from('stores')
        .select('id, name')
        .eq('active', true)
        .order('name');
      
      if (data) setStoresList(data);
    };
    loadStoresList();
  }, [userProfile?.role]);

  // Fetch assigned store name for non-admin users
  useEffect(() => {
    const loadStore = async () => {
      if (!userProfile) return;
      if (userProfile.role === 'admin' || userProfile.role === 'master_admin') {
        setStoreName(userProfile.role === 'master_admin' ? 'MASTER AUDIT' : 'Todas las tiendas');
        return;
      }
      
      // Use the assigned_store_id directly from userProfile instead of making another query
      const assignedStoreId = userProfile.assigned_store_id;
      console.log('Loading store for user:', {
        userId: userProfile.id,
        role: userProfile.role,
        assignedStoreId: assignedStoreId,
        userProfile: userProfile
      });
      
      if (!assignedStoreId) {
        console.warn('User has no assigned store:', userProfile);
        setStoreName('Sin tienda asignada');
        return;
      }
      
      try {
        const { data: store, error: sErr } = await (supabase as any)
          .from('stores')
          .select('name')
          .eq('id', assignedStoreId)
          .maybeSingle();
        if (sErr) throw sErr;
        setStoreName((store as any)?.name ?? 'Tienda asignada');
      } catch (e) {
        console.error('Error loading store name:', e);
        setStoreName('Tienda asignada');
      }
    };
    loadStore();
  }, [userProfile?.assigned_store_id, userProfile?.role]);

  // Mostrar toast de advertencia cuando hay conexión lenta
  useEffect(() => {
    if (isSlowNetwork && !slowNetworkToastShown.current) {
      slowNetworkToastShown.current = true;
      toast({
        variant: "warning",
        title: "Cargando datos",
        description: "Actualizando...",
        action: (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              retryProfileFetch();
              slowNetworkToastShown.current = false;
            }}
            className="text-white hover:bg-yellow-600/20 h-8 px-3"
          >
            <RefreshCw className="h-3 w-3 mr-1.5" />
            Actualizar
          </Button>
        ),
      });
    } else if (!isSlowNetwork) {
      slowNetworkToastShown.current = false;
    }
  }, [isSlowNetwork, retryProfileFetch, toast]);

  return (
    <div className="min-h-screen bg-app-background text-main-text font-sans w-full">
      {/* Sidebar - Mobile First */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-14 xs:w-16"
        )}
      >
        <div className="flex h-full flex-col bg-dark-bg">
          {/* User Name & Toggle - Mobile First */}
          <div className="flex h-14 xs:h-16 items-center justify-between px-2 xs:px-4">
            {sidebarOpen ? (
              <div className="flex items-center space-x-2 min-w-0 flex-1">
                <span className="text-sm xs:text-base font-semibold truncate text-white/90">
                  {userProfile?.name || 'Usuario'}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full">
                <span className="text-xs font-semibold truncate text-white/90">
                  {userProfile?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="h-8 w-8 xs:h-9 xs:w-9 p-0 text-white/70 hover:text-white hover:bg-white/10"
            >
              {sidebarOpen ? <X className="w-3 h-3 xs:w-4 xs:h-4" /> : <Menu className="w-3 h-3 xs:w-4 xs:h-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 px-2 py-4 overflow-y-auto">
            {getNavigationByRole(userProfile?.role || 'cashier').map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                    active
                      ? "bg-accent-primary text-white font-medium"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0 text-white/80" />
                  {sidebarOpen && (
                    <span className="ml-3 animate-fade-in">{item.name}</span>
                  )}
                </Link>
              );
            })}

            {/* Sucursales para MASTER_ADMIN */}
            {userProfile?.role === 'master_admin' && storesList.length > 0 && (
              <>
                {sidebarOpen && (
                  <div className="pt-4 pb-2 px-3">
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                      Sucursales
                    </p>
                  </div>
                )}
                {storesList.map((store) => {
                  const isStoreActive = location.pathname === `/store/${store.id}`;
                  return (
                    <Link
                      key={store.id}
                      to={`/store/${store.id}`}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                        isStoreActive
                          ? "bg-accent-primary text-white font-medium"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <Store className="w-5 h-5 flex-shrink-0 text-white/80" />
                      {sidebarOpen && (
                        <span className="ml-3 animate-fade-in truncate">
                          {store.name.replace('Tu Móvil ', '').replace('Zona Gamer ', 'ZG ')}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          {/* Chat IA Button */}
          <div className="p-4">
            <Link to="/chat">
              <Button 
                className="w-full bg-accent-primary hover:bg-accent-hover text-white font-medium"
                size={sidebarOpen ? "default" : "sm"}
              >
                <MessageCircle className="w-4 h-4" />
                {sidebarOpen && <span className="ml-2">Chat IA</span>}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content - Mobile First */}
      <div
        className={cn(
          "transition-all duration-300 ease-in-out",
          sidebarOpen ? "ml-64" : "ml-14 xs:ml-16"
        )}
      >
        {/* Top Bar - Mobile First */}
        <header className="h-14 xs:h-16 shadow-sm" style={{ backgroundColor: 'rgba(2, 38, 1, 0.9)' }}>
          <div className="flex h-full items-center justify-between px-3 xs:px-6">
            <div className="min-w-0 flex-1 flex items-center space-x-2">
              <Link to="/dashboard" className="flex items-center space-x-2">
                <img src="/logo.png" alt="Logo" className="w-6 h-6 xs:w-8 xs:h-8 object-contain max-w-none" style={{ objectFit: 'contain' }} />
                <img src="/logotipo.png" alt="Logotipo" className="h-4 xs:h-6 object-contain" />
              </Link>
            </div>
            
            <div className="flex items-center space-x-2 xs:space-x-4">
              {/* Store Indicator - Mobile First */}
              <div className="flex items-center space-x-1 xs:space-x-2 px-2 xs:px-3 py-1 rounded-md bg-white/20">
                <Store className="w-3 h-3 xs:w-4 xs:h-4 text-dark-bg flex-shrink-0" />
                <span className="text-xs xs:text-sm font-medium text-dark-bg truncate max-w-[100px] xs:max-w-none">{storeName}</span>
              </div>
              
              {/* User Menu */}
              <UserMenu />
            </div>
          </div>
        </header>


        {/* Page Content - Mobile First */}
        <main className="flex-1 p-3 xs:p-4 sm:p-6 min-h-screen">
          {/* Alerta global de stock negativo - Solo para admins */}
          {userProfile?.role === 'admin' && (
            <div className="mb-4">
              <NegativeStockAlert />
            </div>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  );
}