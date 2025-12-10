import { Suspense, lazy, useEffect, useRef } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PasswordSetupGuard } from "@/components/auth/PasswordSetupGuard";
import { ShoppingCart } from "lucide-react";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
// Lazy load layout and auth pages
const MainLayout = lazy(() => import("./components/layout/MainLayout"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));

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

const queryClient = new QueryClient();

// Loading fallback component - Eco-Pulse
const LoadingFallback = () => (
  <LoadingScreen message="Cargando aplicación..." />
);

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

  return <LoadingFallback />;
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
      <Suspense fallback={<LoadingFallback />}>
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
      if (window.location.pathname !== '/') {
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
    // Solo bloqueamos si REALMENTE no sabemos quién es el usuario (carga inicial fría)
    return <LoadingFallback />;
  }

  // ✅ Si no hay usuario O no hay perfil, mostrar login
  if (!user || !userProfile) {
    return (
      <Routes>
        <Route path="/" element={
          <Suspense fallback={<LoadingFallback />}>
            <AuthPage />
          </Suspense>
        } />
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
        path="/auth/callback" 
        element={
          <Suspense fallback={<LoadingFallback />}>
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
          <Suspense fallback={<LoadingFallback />}>
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
              <Suspense fallback={<LoadingFallback />}>
                <Dashboard />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="pos" 
          element={
            <POSAccessGuard>
              <Suspense fallback={<LoadingFallback />}>
                <POS />
              </Suspense>
            </POSAccessGuard>
          } 
        />
        <Route 
          path="master-audit" 
          element={
            <ProtectedRoute requiredRole="master_admin">
              <Suspense fallback={<LoadingFallback />}>
                <MasterAuditDashboardPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="store/:storeId" 
          element={
            <ProtectedRoute requiredRole="master_admin">
              <Suspense fallback={<LoadingFallback />}>
                <StoreDashboardPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="almacen" 
          element={
            <ProtectedRoute requiredRole="cashier">
              <Suspense fallback={<LoadingFallback />}>
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
                <Suspense fallback={<LoadingFallback />}>
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
              <Suspense fallback={<LoadingFallback />}>
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
                <Suspense fallback={<LoadingFallback />}>
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
                <Suspense fallback={<LoadingFallback />}>
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
                <Suspense fallback={<LoadingFallback />}>
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
                <Suspense fallback={<LoadingFallback />}>
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
                <Suspense fallback={<LoadingFallback />}>
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
                <Suspense fallback={<LoadingFallback />}>
                  <Reports />
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
                <Suspense fallback={<LoadingFallback />}>
                  <SettingsPage />
                </Suspense>
              </ProtectedRoute>
            </CashierRouteGuard>
          } 
        />
        <Route 
          path="chat" 
          element={
            <CashierRouteGuard>
              <ProtectedRoute requiredRole="manager">
                <Suspense fallback={<LoadingFallback />}>
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
            <Suspense fallback={<LoadingFallback />}>
              <NotFound />
            </Suspense>
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StoreProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </StoreProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
