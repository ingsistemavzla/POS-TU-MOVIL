import { useLocation, Navigate, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn, RefreshCw } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userProfile, loading } = useAuth();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  // ✅ SIEMPRE redirigir al login si no hay usuario o perfil
  // Esto asegura que después de un hard refresh, si la sesión se perdió, se redirija al login
  if (!user || !userProfile) {
    return <Navigate to="/" replace />;
  }

  // ✅ Página de error personalizada con estilo de la app
  const handleGoToLogin = () => {
    // Limpiar URL completamente y redirigir a raíz
    window.location.replace('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          {/* Logo o Icono */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mb-4">
              <RefreshCw className="w-10 h-10 text-white" />
            </div>
          </div>

          {/* Título */}
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Sesión Expirada
          </h1>

          {/* Mensaje */}
          <p className="text-gray-600 dark:text-gray-300 mb-2">
            Tu sesión ha expirado o la caché fue borrada.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Por favor, inicia sesión nuevamente para continuar.
          </p>

          {/* Botón de Iniciar Sesión */}
          <Button
            onClick={handleGoToLogin}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-6 text-lg shadow-lg transition-all duration-200"
            size="lg"
          >
            <LogIn className="mr-2 h-5 w-5" />
            Iniciar Sesión
          </Button>

          {/* Mensaje adicional */}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
            Si el problema persiste, intenta limpiar la caché del navegador
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
