import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';

export const PasswordSetupGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { requiresPasswordSetup, loading } = useAuth();
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);

  useEffect(() => {
    // Solo mostrar el modal si no está cargando y requiere configuración de contraseña
    if (!loading && requiresPasswordSetup) {
      setShowPasswordSetup(true);
    }
  }, [requiresPasswordSetup, loading]);

  // Si está cargando, mostrar los children normalmente
  if (loading) {
    return <>{children}</>;
  }

  // Si requiere configuración de contraseña, mostrar el modal
  if (requiresPasswordSetup) {
    return (
      <>
        {children}
        <ChangePasswordModal
          isOpen={showPasswordSetup}
          onClose={() => setShowPasswordSetup(false)}
          isInitialSetup={true}
        />
      </>
    );
  }

  // Si no requiere configuración, mostrar los children normalmente
  return <>{children}</>;
};
