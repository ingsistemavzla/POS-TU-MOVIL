/**
 * Utilidad para limpiar el cache del navegador.
 * clearAuthCache / clearAllCache son para operaciones EXPLÍCITAS
 * (logout, mantenimiento, perfil inexistente confirmado) — nunca en init/refresh.
 */

const KEYS_TO_KEEP = new Set(['theme', 'language', 'pos_maintenance_mode']);

function isAuthStorageKey(key: string): boolean {
  return (
    key !== 'pos_maintenance_mode' &&
    (key.includes('auth') || key.includes('sb-') || key.includes('supabase'))
  );
}

/** Iteración estándar Storage (evita depender de Object.keys en mocks/navegadores). */
function listStorageKeys(storage: Storage): string[] {
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key != null) keys.push(key);
  }
  return keys;
}

export const clearAllCache = () => {
  try {
    for (const key of listStorageKeys(localStorage)) {
      if (!KEYS_TO_KEEP.has(key)) {
        localStorage.removeItem(key);
      }
    }

    for (const key of listStorageKeys(sessionStorage)) {
      if (isAuthStorageKey(key) || key === 'auth_cache_cleared') {
        sessionStorage.removeItem(key);
      }
    }

    console.log('Cache limpiado exitosamente');
    return true;
  } catch (error) {
    console.error('Error limpiando cache:', error);
    return false;
  }
};

/**
 * Limpia solo el cache de autenticación en localStorage.
 * Uso: logout voluntario, eviction por mantenimiento, SIGNED_OUT, perfil confirmado inexistente.
 * NO llamar en inicialización ni al montar AuthPage.
 */
export const clearAuthCache = () => {
  try {
    for (const key of listStorageKeys(localStorage)) {
      if (isAuthStorageKey(key)) {
        localStorage.removeItem(key);
      }
    }
    // No sessionStorage.clear(): destruía flags y datos de pestaña ajenos a auth.
    for (const key of listStorageKeys(sessionStorage)) {
      if (isAuthStorageKey(key) || key === 'auth_cache_cleared') {
        sessionStorage.removeItem(key);
      }
    }
    console.log('Cache de autenticación limpiado');
    return true;
  } catch (error) {
    console.error('Error limpiando cache de autenticación:', error);
    return false;
  }
};
