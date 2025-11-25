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
import MainLayout from "./components/layout/MainLayout";
import Dashboard from "./pages/Dashboard";
import POS from "./pages/POS";
import { InventoryPage } from "./pages/InventoryPage";
import { ProductsPage } from "./pages/ProductsPage";
import { StoresPage } from "./pages/StoresPage";
import CustomersPage from "./pages/CustomersPage";
import SalesPage from "./pages/SalesPage";
import Users from "./pages/Users";
import Reports from "./pages/ReportsNew";
import SettingsPage from "./pages/SettingsPage";
import ChatPage from "./pages/ChatPage";
// import CashRegisterPage from "./pages/CashRegisterPage";
import AuthPage from "./pages/AuthPage";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle role-based redirection
const RoleBasedRedirect = () => {
  const { userProfile } = useAuth();
  
  if (userProfile?.role === 'cashier') {
    return <Navigate to="/products" replace />;
  }
  
  return <ProtectedRoute requiredRole="manager"><Dashboard /></ProtectedRoute>;
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
    return <AuthPage />;
  }

  return (
    <Routes>
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="/" element={
        <ProtectedRoute>
          <PasswordSetupGuard>
            <MainLayout />
          </PasswordSetupGuard>
        </ProtectedRoute>
      }>
        <Route index element={<RoleBasedRedirect />} />
        <Route path="dashboard" element={<ProtectedRoute requiredRole="manager"><Dashboard /></ProtectedRoute>} />
        <Route path="pos" element={<POS />} />
        <Route path="inventory" element={<ProtectedRoute requiredRole="manager"><InventoryPage /></ProtectedRoute>} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="sales" element={<ProtectedRoute requiredRole="manager"><SalesPage /></ProtectedRoute>} />
        <Route path="customers" element={<ProtectedRoute requiredRole="manager"><CustomersPage /></ProtectedRoute>} />
        <Route path="stores" element={<ProtectedRoute requiredRole="admin"><StoresPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute requiredRole="admin"><Users /></ProtectedRoute>} />
        <Route path="reports" element={<ProtectedRoute requiredRole="admin"><Reports /></ProtectedRoute>} />
        {/* <Route path="cash-register" element={<ProtectedRoute requiredRole="manager"><CashRegisterPage /></ProtectedRoute>} /> */}
        <Route path="settings" element={<ProtectedRoute requiredRole="admin"><SettingsPage /></ProtectedRoute>} />
        <Route path="chat" element={<ProtectedRoute requiredRole="manager"><ChatPage /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<NotFound />} />
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
