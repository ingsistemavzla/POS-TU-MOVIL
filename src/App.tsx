import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { InventoryProvider } from "@/contexts/InventoryContext";
import { StoreProvider } from "@/contexts/StoreContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PasswordSetupGuard } from "@/components/auth/PasswordSetupGuard";
// Lazy load layout and auth pages
const MainLayout = lazy(() => import("./components/layout/MainLayout"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Lazy load heavy pages for code splitting
const Dashboard = lazy(() => import("./pages/Dashboard"));
const POS = lazy(() => import("./pages/POS"));
const InventoryPage = lazy(() => import("./pages/InventoryPage").then(m => ({ default: m.InventoryPage })));
const ProductsPage = lazy(() => import("./pages/ProductsPage").then(m => ({ default: m.ProductsPage })));
const StoresPage = lazy(() => import("./pages/StoresPage").then(m => ({ default: m.StoresPage })));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const SalesPage = lazy(() => import("./pages/SalesPage"));
const Users = lazy(() => import("./pages/Users"));
const Reports = lazy(() => import("./pages/ReportsNew"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));

const queryClient = new QueryClient();

// Component to handle role-based redirection
const RoleBasedRedirect = () => {
  const { userProfile } = useAuth();
  
  if (userProfile?.role === 'cashier') {
    return <Navigate to="/products" replace />;
  }
  
  return (
    <ProtectedRoute requiredRole="manager">
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      }>
        <Dashboard />
      </Suspense>
    </ProtectedRoute>
  );
};

// Protected App Routes Component
const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando...</p>
          </div>
        </div>
      }>
        <AuthPage />
      </Suspense>
    );
  }

  // Loading fallback component
  const LoadingFallback = () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </div>
  );

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
            <Suspense fallback={<LoadingFallback />}>
              <POS />
            </Suspense>
          } 
        />
        <Route 
          path="inventory" 
          element={
            <ProtectedRoute requiredRole="manager">
              <Suspense fallback={<LoadingFallback />}>
                <InventoryPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="products" 
          element={
            <Suspense fallback={<LoadingFallback />}>
              <ProductsPage />
            </Suspense>
          } 
        />
        <Route 
          path="sales" 
          element={
            <ProtectedRoute requiredRole="manager">
              <Suspense fallback={<LoadingFallback />}>
                <SalesPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="customers" 
          element={
            <ProtectedRoute requiredRole="manager">
              <Suspense fallback={<LoadingFallback />}>
                <CustomersPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="stores" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<LoadingFallback />}>
                <StoresPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="users" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<LoadingFallback />}>
                <Users />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="reports" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<LoadingFallback />}>
                <Reports />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="settings" 
          element={
            <ProtectedRoute requiredRole="admin">
              <Suspense fallback={<LoadingFallback />}>
                <SettingsPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="chat" 
          element={
            <ProtectedRoute requiredRole="manager">
              <Suspense fallback={<LoadingFallback />}>
                <ChatPage />
              </Suspense>
            </ProtectedRoute>
          } 
        />
      </Route>
      <Route 
        path="*" 
        element={
          <Suspense fallback={<LoadingFallback />}>
            <NotFound />
          </Suspense>
        } 
      />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <StoreProvider>
        <InventoryProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </InventoryProvider>
      </StoreProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
