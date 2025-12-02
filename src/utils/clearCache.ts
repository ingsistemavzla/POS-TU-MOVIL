/**
 * Utilidad para limpiar el cache del navegador
 * Útil cuando hay problemas de sesión o datos corruptos
 */

export const clearAllCache = () => {
  try {
    // Limpiar localStorage (excepto configuraciones importantes)
    const keysToKeep = ['theme', 'language']; // Mantener preferencias del usuario
    const allKeys = Object.keys(localStorage);
    allKeys.forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });

    // Limpiar sessionStorage completamente
    sessionStorage.clear();

    // Limpiar cache de Supabase Auth
    const supabaseKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('sb-')
    );
    supabaseKeys.forEach(key => {
      localStorage.removeItem(key);
    });

    console.log('Cache limpiado exitosamente');
    return true;
  } catch (error) {
    console.error('Error limpiando cache:', error);
    return false;
  }
};

/**
 * Limpia solo el cache de autenticación
 */
export const clearAuthCache = () => {
  try {
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('auth') || key.includes('sb-') || key.includes('supabase')
    );
    authKeys.forEach(key => {
      localStorage.removeItem(key);
    });
    sessionStorage.clear();
    console.log('Cache de autenticación limpiado');
    return true;
  } catch (error) {
    console.error('Error limpiando cache de autenticación:', error);
    return false;
  }
};





