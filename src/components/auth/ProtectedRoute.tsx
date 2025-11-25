import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'cashier';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
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
    const roleHierarchy = { admin: 3, manager: 2, cashier: 1 };
    const userRoleLevel = roleHierarchy[userProfile.role as keyof typeof roleHierarchy] || 0;
    const requiredRoleLevel = roleHierarchy[requiredRole];

    if (userRoleLevel < requiredRoleLevel) {
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
