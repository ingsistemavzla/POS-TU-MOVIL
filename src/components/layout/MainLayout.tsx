import { useEffect, useState } from "react";
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
  Receipt
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/layout/UserMenu";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { NegativeStockAlert } from "@/components/inventory/NegativeStockAlert";

const getNavigationByRole = (role: string) => {
  const allNavigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      roles: ['admin', 'manager'],
    },
    {
      name: 'POS',
      href: '/pos',
      icon: ShoppingCart,
      roles: ['admin', 'manager', 'cashier'],
    },
    {
      name: 'Productos',
      href: '/products',
      icon: Box,
      roles: ['admin', 'manager', 'cashier'],
    },
    {
      name: 'Inventario',
      href: '/inventory',
      icon: Package,
      roles: ['admin', 'manager'],
    },
    {
      name: 'Ventas',
      href: '/sales',
      icon: Receipt,
      roles: ['admin', 'manager'],
    },
    {
      name: 'Clientes',
      href: '/customers',
      icon: UserCheck,
      roles: ['admin', 'manager'],
    },
    {
      name: 'Tiendas',
      href: '/stores',
      icon: Store,
      roles: ['admin'],
    },
    {
      name: 'Usuarios',
      href: '/users',
      icon: Users,
      roles: ['admin'],
    },
    {
      name: 'Reportes',
      href: '/reports',
      icon: TrendingUp,
      roles: ['admin'],
    },
    // {
    //   name: 'Cierre de Caja',
    //   href: '/cash-register',
    //   icon: DollarSign,
    //   roles: ['admin', 'manager'],
    // },
    {
      name: 'Configuración',
      href: '/settings',
      icon: Settings,
      roles: ['admin'],
    },
  ];

  return allNavigation.filter(item => item.roles.includes(role));
};

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { company, userProfile } = useAuth();
  const [storeName, setStoreName] = useState<string>("Tienda Principal");

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

  // Fetch assigned store name for non-admin users
  useEffect(() => {
    const loadStore = async () => {
      if (!userProfile) return;
      if (userProfile.role === 'admin') {
        setStoreName('Todas las tiendas');
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

  return (
    <div className="min-h-screen bg-background w-full">
      {/* Sidebar - Mobile First */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out",
          sidebarOpen ? "w-64" : "w-14 xs:w-16"
        )}
      >
        <div className="flex h-full flex-col glass-card border-r border-border/50">
          {/* Logo & Toggle - Mobile First */}
          <div className="flex h-14 xs:h-16 items-center justify-between px-2 xs:px-4">
            <Link to={userProfile?.role === 'cashier' ? '/pos' : '/dashboard'} className="flex items-center space-x-2">
              <img src="/logo.png" alt="Logo" className="w-6 h-6 xs:w-8 xs:h-8 object-contain max-w-none" style={{ objectFit: 'contain' }} />
              {sidebarOpen && (
                <img src="/logotipo.png" alt="Logotipo" className="h-4 xs:h-6 object-contain" />
              )}
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hover-glow h-8 w-8 xs:h-9 xs:w-9 p-0"
            >
              {sidebarOpen ? <X className="w-3 h-3 xs:w-4 xs:h-4" /> : <Menu className="w-3 h-3 xs:w-4 xs:h-4" />}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 px-2 py-4">
            {getNavigationByRole(userProfile?.role || 'cashier').map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200",
                    active
                      ? "bg-primary/20 text-primary glow-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 hover-glow"
                  )}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && (
                    <span className="ml-3 animate-fade-in">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Chat IA Button */}
          <div className="p-4">
            <Link to="/chat">
              <Button 
                className="w-full btn-premium bg-gradient-primary hover:shadow-glow-accent"
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
        <header className="h-14 xs:h-16 border-b border-border/50 glass-card">
          <div className="flex h-full items-center justify-between px-3 xs:px-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg xs:text-xl font-semibold truncate">
                {getNavigationByRole(userProfile?.role || 'cashier').find(nav => isActive(nav.href))?.name || 'Dashboard'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-2 xs:space-x-4">
              {/* Store Indicator - Mobile First */}
              <div className="flex items-center space-x-1 xs:space-x-2 px-2 xs:px-3 py-1 rounded-lg glass-card">
                <Store className="w-3 h-3 xs:w-4 xs:h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs xs:text-sm font-medium truncate max-w-[100px] xs:max-w-none">{storeName}</span>
              </div>
              
              {/* User Menu */}
              <UserMenu />
            </div>
          </div>
        </header>

        {/* Page Content - Mobile First */}
        <main className="flex-1 p-3 xs:p-4 sm:p-6">
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