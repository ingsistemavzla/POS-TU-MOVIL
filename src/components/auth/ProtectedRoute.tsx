import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'master_admin' | 'admin' | 'manager' | 'cashier';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, userProfile, loading } = useAuth();

  // ✅ OPTIMISTIC UI: Solo mostrar loader si NO tenemos usuario (carga inicial)
  // Si tenemos usuario pero loading es true, es una revalidación en segundo plano - NO bloquear
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user || !userProfile) {
    return null; // Will be handled by App.tsx redirect
  }

  // Check role permissions
  if (requiredRole) {
    // JERARQUÍA DE ROLES:
    // - master_admin (4): Acceso total de auditoría, sin POS
    // - admin (3): Acceso total a su empresa
    // - manager (3): MISMO nivel que admin pero RESTRINGIDO a su assigned_store_id
    // - cashier (1): Solo POS de su tienda
    const roleHierarchy = { master_admin: 4, admin: 3, manager: 3, cashier: 1 };
    const userRoleLevel = roleHierarchy[userProfile.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole];

    // Caso especial: master_admin solo puede acceder a rutas que requieren master_admin
    if (requiredRole === 'master_admin' && userProfile.role !== 'master_admin') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-950/20 to-background">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2 text-red-500">🔒 Acceso Restringido</h2>
            <p className="text-muted-foreground">
              Esta sección es exclusiva para MASTER_ADMIN.
            </p>
          </div>
        </div>
      );
    }

    if (userRoleLevel < requiredRoleLevel) {
      // CAJERO: Redirigir automáticamente a /pos en lugar de mostrar error
      if (userProfile.role === 'cashier') {
        return <Navigate to="/pos" replace />;
      }
      
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
            <p className="text-muted-foreground">
              No tienes permisos suficientes para acceder a esta sección.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};
