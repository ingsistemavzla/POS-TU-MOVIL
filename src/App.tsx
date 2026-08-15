import { Suspense, lazy, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MaintenanceEnforcer } from "@/components/auth/MaintenanceEnforcer";
import { MaintenanceLoginShell } from "@/components/auth/MaintenanceLoginShell";
import { useMaintenanceMode } from "@/hooks/useMaintenanceMode";
import { isMaintenanceModeActive } from "@/config/maintenance";
import { StoreProvider } from "@/contexts/StoreContext";
import { BcvProvider } from "@/contexts/BcvContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PasswordSetupGuard } from "@/components/auth/PasswordSetupGuard";
import { ShoppingCart } from "lucide-react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { RoutePageLoader } from "@/components/ui/RoutePageLoader";
import { DashboardPageLoader } from "@/components/ui/DashboardPageLoader";
import { isPublicAppPath } from "@/lib/publicInformePaths";
import { InventorySystemDocumentMeta } from "@/components/layout/InventorySystemDocumentMeta";
// Lazy load layout and auth pages
const MainLayout = lazy(() => import("./components/layout/MainLayout"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ServerStatusPage = lazy(() => import("./pages/ServerStatusPage"));
const PresupuestoServicioTecnicoPage = lazy(() => import("./pages/PresupuestoServicioTecnicoPage"));
const PublicInformePage = lazy(() => import("./pages/PublicInformePage"));
const PublicInformesCatalogPage = lazy(() => import("./pages/PublicInformesCatalogPage"));

// Lazy load heavy pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const POS = lazy(() => import("./pages/POS"));
const AlmacenPage = lazy(() => import("./pages/AlmacenPage").then(m => ({ default: m.AlmacenPage })));
const ArticulosPage = lazy(() => import("./pages/ArticulosPage").then(m => ({ default: m.ArticulosPage })));
const EstadisticasPage = lazy(() => import("./pages/EstadisticasPage").then(m => ({ default: m.EstadisticasPage })));
const StoresPage = lazy(() => import("./pages/StoresPage").then(m => ({ default: m.StoresPage })));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const SalesPage = lazy(() => import("./pages/SalesPage"));
const Users = lazy(() => import("./pages/Users"));
const Reports = lazy(() => import("./pages/ReportsNew"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));

const StoreDashboardPage = lazy(() => import("./pages/StoreDashboardPage"));
const MasterAuditDashboardPage = lazy(() => import("./pages/MasterAuditDashboardPage"));
const CashierValidationPage = lazy(() => import("./pages/CashierValidationPage"));
const DeletedProductsPage = lazy(() => import("./pages/DeletedProductsPage").then(m => ({ default: m.DeletedProductsPage })));
const GestionWebPage = lazy(() => import("./pages/GestionWebPage").then(m => ({ default: m.GestionWebPage })));
const HistorialPage = lazy(() => import("./pages/HistorialPage").then(m => ({ default: m.HistorialPage })));

const queryClient = new QueryClient();

/** Solo arranque en frío (sin sesión) */
const AuthBootLoader = () => (
  <LoadingScreen message="Iniciando sesión..." />
);

/** Navegación entre módulos: spinner liviano, sin pantalla completa */
const RouteLoadingFallback = () => <RoutePageLoader />;

// Componente de validación de sesión para rutas específicas por rol
const RoleValidationRoute = ({ 
  requiredRole, 
  redirectTo 
}: { 
  requiredRole: 'admin' | 'manager' | 'cashier';
  redirectTo: string;
}) => {
  const { user, userProfile, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user || !userProfile) {
        navigate('/', { replace: true });
        return;
      }

      if (userProfile.role !== requiredRole) {
        navigate('/', { replace: true });
        return;
      }

      // Rol correcto, redirigir al destino
      navigate(redirectTo, { replace: true });
    }
  }, [user, userProfile, loading, requiredRole, redirectTo, navigate]);

  return <RouteLoadingFallback />;
};

// Component to handle role-based redirection
const RoleBasedRedirect = () => {
  const { userProfile } = useAuth();
  
  // Si no hay perfil, mostrar login
  if (!userProfile) {
    return <Navigate to="/" replace />;
  }
  
  // MASTER_ADMIN redirige a panel de auditoría
  if (userProfile.role === 'master_admin') {
    return <Navigate to="/master-audit" replace />;
  }
  
  // ADMIN redirige a dashboard
  if (userProfile.role === 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  // MANAGER redirige a estadísticas
  if (userProfile.role === 'manager') {
    return <Navigate to="/estadisticas" replace />;
  }
  
  // CAJERO redirige a POS
  if (userProfile.role === 'cashier') {
    return <Navigate to="/pos" replace />;
  }
  
  // Por defecto, dashboard
  return (
    <ProtectedRoute requiredRole="manager">
      <Suspense fallback={<RouteLoadingFallback />}>
        <Dashboard />
      </Suspense>
    </ProtectedRoute>
  );
};

// Guard para bloquear MASTER_ADMIN del POS
const POSAccessGuard = ({ children }: { children: React.ReactNode }) => {
  const { userProfile } = useAuth();
  
  // MASTER_ADMIN NO puede acceder al POS - redirigir a panel de auditoría
  if (userProfile?.role === 'master_admin') {
    return <Navigate to="/master-audit" replace />;
  }
  
  return <>{children}</>;
};

// Guard para redirigir CAJEROS a /pos si intentan acceder a rutas no permitidas
const CashierRouteGuard = ({ children }: { children: React.ReactNode }) => {
  const { userProfile } = useAuth();
  
  // CAJERO solo puede acceder a /pos y /almacen - redirigir a /pos si intenta otra ruta
  if (userProfile?.role === 'cashier') {
    return <Navigate to="/pos" replace />;
  }
  
  return <>{children}</>;
};

// Protected App Routes Component
const AppRoutes = () => {
  const { user, userProfile, loading } = useAuth();

  // ✅ CORRECCIÓN: Mover hooks ANTES de cualquier return condicional (reglas de React Hooks)
  // ✅ Limpiar URL cuando no hay sesión (quita /articulos, /dashboard, etc. de la URL)
  const urlCleanedRef = useRef(false);
  useEffect(() => {
    if (!user && !userProfile && !loading && !urlCleanedRef.current) {
      // Solo limpiar si NO estamos ya en la raíz
      const path = window.location.pathname;
      if (!isPublicAppPath(path)) {
        urlCleanedRef.current = true;
        // ✅ window.location.replace limpia la URL completamente sin dejar historial
        window.location.replace('/');
        return;
      }
    }
    // Resetear el flag si el usuario vuelve a loguearse
    if (user && userProfile) {
      urlCleanedRef.current = false;
    }
  }, [user, userProfile, loading]);

  // ✅ ESTRATEGIA OPTIMISTIC UI:
  // Solo bloqueamos si REALMENTE no sabemos quién es el usuario (carga inicial fría)
  // Si "loading" es true por una revalidación en segundo plano, dejamos al usuario ver la app
  if (loading && !user) {
    return <AuthBootLoader />;
  }

  // Sesión activa pero perfil aún cargando: no mostrar login por error
  if (user && !userProfile && loading) {
    return <RouteLoadingFallback />;
  }

  if (!user || !userProfile) {
    return (
      <Routes>
        <Route path="/" element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <AuthPage />
          </Suspense>
        } />
        <Route
          path="/server"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <ServerStatusPage />
            </Suspense>
          }
        />
        <Route
          path="/presupuesto-sistema-servicio-tecnico"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <PresupuestoServicioTecnicoPage />
            </Suspense>
          }
        />
        <Route
          path="/informes"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <PublicInformesCatalogPage />
            </Suspense>
          }
        />
        <Route
          path="/informe/:slug"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <PublicInformePage />
            </Suspense>
          }
        />
        <Route path="/admin" element={<Navigate to="/" replace />} />
        <Route path="/manager" element={<Navigate to="/" replace />} />
        <Route path="/cashier" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path="/server"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <ServerStatusPage />
          </Suspense>
        }
      />
      <Route
        path="/presupuesto-sistema-servicio-tecnico"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <PresupuestoServicioTecnicoPage />
          </Suspense>
        }
      />
      <Route
        path="/informes"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <PublicInformesCatalogPage />
          </Suspense>
        }
      />
      <Route
        path="/informe/:slug"
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <PublicInformePage />
          </Suspense>
        }
      />
      <Route 
        path="/auth/callback" 
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <AuthCallback />
          </Suspense>
        } 
      />
      <Route path="/auth" element={<Navigate to="/" replace />} />
      
      {/* Rutas de validación por rol */}
      <Route 
        path="/admin" 
        element={
          <RoleValidationRoute requiredRole="admin" redirectTo="/dashboard" />
        } 
      />
      <Route 
        path="/manager" 
        element={
          <RoleValidationRoute requiredRole="manager" redirectTo="/estadisticas" />
        } 
      />
      <Route 
        path="/cashier" 
        element={
          <Suspense fallback={<RouteLoadingFallback />}>
            <CashierValidationPage />
          </Suspense>
        } 
      />
      
      <Route path="/" element={
        <ProtectedRoute>
          <PasswordSetupGuard>
            <MainLayout />
          </PasswordSetupGuard>
        </ProtectedRoute>
      }>
        <Route index element={<RoleBasedRedirect />} />
        <Route 
          path="dashboard" 
          element={
            <ProtectedRoute requiredRole="manager">
              <Suspense fallback={<DashboardPageLoader />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="pos" 
          element={
            <POSAccessGuard>
              <Suspense fallback={<RouteLoadingFallback />}>
                <POS />
              </Suspense>
            </POSAccessGuard>
          } 
        />
        <Route 
          path="master-audit" 
          element={
            <ProtectedRoute requiredRole="master_admin">
              <Suspense fallback={<RouteLoadingFallback />}>
                <MasterAuditDashboardPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="store/:storeId" 
          element={
            <ProtectedRoute requiredRole="master_admin">
              <Suspense fallback={<RouteLoadingFallback />}>
                <StoreDashboardPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="almacen" 
          element={
            <ProtectedRoute requiredRole="cashier">
              <Suspense fallback={<RouteLoadingFallback />}>
                <AlmacenPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="articulos" 
          element={
            <CashierRouteGuard>
              <ProtectedRoute requiredRole="manager">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <ArticulosPage />
                </Suspense>
              </ProtectedRoute>
            </CashierRouteGuard>
          } 
        />
        <Route 
          path="deleted-products" 
          element={
            <ProtectedRoute requiredRole="master_admin">
              <Suspense fallback={<RouteLoadingFallback />}>
                <DeletedProductsPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="estadisticas" 
          element={
            <CashierRouteGuard>
              <ProtectedRoute requiredRole="manager">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <EstadisticasPage />
                </Suspense>
              </ProtectedRoute>
            </CashierRouteGuard>
          } 
        />
        <Route 
          path="sales" 
          element={
            <CashierRouteGuard>
              <ProtectedRoute requiredRole="manager">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <SalesPage />
                </Suspense>
              </ProtectedRoute>
            </CashierRouteGuard>
          } 
        />
        <Route 
          path="customers" 
          element={
            <CashierRouteGuard>
              <ProtectedRoute requiredRole="manager">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <CustomersPage />
                </Suspense>
              </ProtectedRoute>
            </CashierRouteGuard>
          } 
        />
        <Route 
          path="stores" 
          element={
            <CashierRouteGuard>
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <StoresPage />
                </Suspense>
              </ProtectedRoute>
            </CashierRouteGuard>
          } 
        />
        <Route 
          path="users" 
          element={
            <CashierRouteGuard>
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Users />
                </Suspense>
              </ProtectedRoute>
            </CashierRouteGuard>
          } 
        />
        <Route 
          path="reports" 
          element={
            <CashierRouteGuard>
              <ProtectedRoute requiredRole="manager">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <Reports />
                </Suspense>
              </ProtectedRoute>
            </CashierRouteGuard>
          } 
        />
        <Route 
          path="historial" 
          element={
            <CashierRouteGuard>
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <HistorialPage />
                </Suspense>
              </ProtectedRoute>
            </CashierRouteGuard>
          } 
        />
        <Route 
          path="settings" 
          element={
            <CashierRouteGuard>
              <ProtectedRoute requiredRole="admin">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <SettingsPage />
                </Suspense>
              </ProtectedRoute>
            </CashierRouteGuard>
          } 
        />
        <Route 
          path="gestion-web" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<RouteLoadingFallback />}>
                <GestionWebPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="chat" 
          element={
            <CashierRouteGuard>
              <ProtectedRoute requiredRole="manager">
                <Suspense fallback={<RouteLoadingFallback />}>
                  <ChatPage />
                </Suspense>
              </ProtectedRoute>
            </CashierRouteGuard>
          } 
        />
      </Route>
      <Route 
        path="*" 
        element={
          <ProtectedRoute>
            <Suspense fallback={<RouteLoadingFallback />}>
              <NotFound />
            </Suspense>
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

/**
 * Shell reactivo: con mantenimiento ON bota al login y bloquea el POS;
 * con OFF (o protocolo deshabilitado en maintenance.ts) monta rutas normales.
 */
const AppRouterShell = () => {
  const { active: hookMaintenance } = useMaintenanceMode();
  const maintenanceBlocked = hookMaintenance || isMaintenanceModeActive();

  if (maintenanceBlocked) {
    return (
      <BrowserRouter>
        <InventorySystemDocumentMeta />
        <Routes>
          <Route path="*" element={<MaintenanceLoginShell />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <InventorySystemDocumentMeta />
      <MaintenanceEnforcer />
      <AppRoutes />
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StoreProvider>
        <BcvProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRouterShell />
          </TooltipProvider>
        </BcvProvider>
      </StoreProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
