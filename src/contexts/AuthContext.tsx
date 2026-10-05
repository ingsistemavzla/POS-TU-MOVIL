import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { sessionKeepAlive } from '@/utils/sessionKeepAlive';
import { clearAuthCache } from '@/utils/clearCache';
import { useToast } from '@/hooks/use-toast';
import {
  blockAuthForMaintenance,
  isMaintenanceModeActive,
  MAINTENANCE_LOGIN_MESSAGE,
  MAINTENANCE_PROTOCOL_ENABLED,
  registerMaintenanceSessionEvict,
  subscribeMaintenanceMode,
} from '@/config/maintenance';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { isPublicAppPath } from '@/lib/publicInformePaths';
import {
  isAuthDeferredStillValid,
  planAuthStateSync,
  planLoadingForAuthSync,
  scheduleAuthDeferredWork,
  type AuthDeferredSnapshot,
} from '@/utils/authStateChangeDefer';
import { applyDeferredProfileResult } from '@/utils/authProfileApply';

type UserProfile = Tables<'users'>;

type Company = Tables<'companies'>;

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  company: Company | null;
  session: Session | null;
  loading: boolean;
  requiresPasswordSetup: boolean;
  isSlowNetwork: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string, 
    password: string, 
    companyName: string, 
    userName: string,
    companyId?: string,
    role?: string,
    assignedStoreId?: string | null
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  markPasswordAsSetup: () => Promise<void>;
  retryProfileFetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};



export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { active: maintenanceActive } = useMaintenanceMode();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [requiresPasswordSetup, setRequiresPasswordSetup] = useState(false);
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  const creatingProfileRef = useRef(false);
  const profileCacheRef = useRef<Map<string, { profile: UserProfile; company: Company; timestamp: number }>>(new Map());
  const retryAttemptsRef = useRef<Map<string, number>>(new Map());
  /** L1-05M: evita stale closure en onAuthStateChange. */
  const userProfileRef = useRef<UserProfile | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const authEpochRef = useRef(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  const MAX_RETRY_ATTEMPTS = 5; // Máximo 5 intentos antes de considerar error real (aumentado de 3 para mayor resiliencia)
  const PROFILE_FETCH_TIMEOUT = 15000; // 15 segundos (aumentado de 3s)

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  
  // Keep session alive with periodic refresh and cache cleanup
  useEffect(() => {
    if (!session || isMaintenanceModeActive()) return;
    
    const keepAliveInterval = setInterval(async () => {
      if (isMaintenanceModeActive()) {
        void evictSessionForMaintenance();
        return;
      }
      try {
        const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
        if (error) {
          console.warn('Session refresh failed:', error);
        } else if (refreshedSession) {
          console.log('Session refreshed successfully');
          setSession(refreshedSession);
        }
      } catch (error) {
        console.error('Error refreshing session:', error);
      }
    }, 30 * 60 * 1000); // Refresh every 30 minutes
    
    // Clean up expired cache entries
    const cacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [userId, cached] of profileCacheRef.current.entries()) {
        if ((now - cached.timestamp) > CACHE_DURATION) {
          profileCacheRef.current.delete(userId);
        }
      }
    }, 10 * 60 * 1000); // Clean up every 10 minutes
    
    return () => {
      clearInterval(keepAliveInterval);
      clearInterval(cacheCleanupInterval);
    };
  }, [session]);

  type ProfileFetchResult = {
    success: boolean;
    isNetworkError?: boolean;
    error?: string;
    details?: string;
    profile?: UserProfile | null;
    company?: Company | null;
  };

  /**
   * L1-05M.1: applyEffects=false → solo resuelve datos (sin React/Auth side effects).
   * applyEffects=true (default) → preserva semántica histórica para callers existentes.
   */
  const fetchUserProfile = async (
    userId: string,
    forceRefresh = false,
    isRetry = false,
    options?: { applyEffects?: boolean }
  ): Promise<ProfileFetchResult> => {
    const applyEffects = options?.applyEffects !== false;
    let resolvedCompany: Company | null = null;
    if (isMaintenanceModeActive()) {
      console.warn('[Maintenance] Validación de perfil cancelada.');
      return { success: false, error: 'maintenance' };
    }

    try {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = profileCacheRef.current.get(userId);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          console.log('Using cached profile data for user:', userId);
          if (applyEffects) {
            setUserProfile(cached.profile);
            setCompany(cached.company);
            setLoading(false);
            setIsSlowNetwork(false);
          }
          return { success: true, profile: cached.profile, company: cached.company };
        }
      }

      // Crear un timeout de 15 segundos para la búsqueda principal
      const profileFetchPromise = supabase
        .from('users')
        .select('id, auth_user_id, company_id, email, name, role, assigned_store_id, active, created_at, updated_at')
        .eq('auth_user_id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('PROFILE_FETCH_TIMEOUT')), PROFILE_FETCH_TIMEOUT);
      });

      let profileResult: any;
      let error: any;

      try {
        const result = await Promise.race([profileFetchPromise, timeoutPromise]);
        profileResult = result;
        error = null;
      } catch (raceError: any) {
        if (raceError?.message === 'PROFILE_FETCH_TIMEOUT') {
          // Timeout - NO es un error fatal, es un problema de red
          console.warn('Profile fetch timeout - conexión lenta detectada');
          if (applyEffects) setIsSlowNetwork(true);
          return { success: false, isNetworkError: true, error: 'timeout' };
        }
        // Otro tipo de error
        error = raceError;
      }

      let effectiveProfile = (profileResult?.data as any) as UserProfile | null;
      const queryError = profileResult?.error || error;

      // 🚨 VERIFICACIÓN CRÍTICA: Error 403 (Forbidden) - RLS bloqueó el acceso
      if (queryError?.code === 'PGRST301' || queryError?.status === 403) {
        console.error('❌ RLS bloqueó el acceso al perfil (403 Forbidden)');
        console.error('Error details:', {
          code: queryError.code,
          message: queryError.message,
          details: queryError.details,
          hint: queryError.hint
        });
        
        // NO cerrar sesión inmediatamente - puede ser un problema temporal de RLS
        // Reintentar si no es un retry
        if (!isRetry) {
          const retryCount = retryAttemptsRef.current.get(userId) || 0;
          if (retryCount < MAX_RETRY_ATTEMPTS) {
            retryAttemptsRef.current.set(userId, retryCount + 1);
            console.log(`🔄 Reintentando después de error 403 (intento ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
            // Esperar 2 segundos antes de reintentar (dar tiempo a que RLS se sincronice)
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchUserProfile(userId, forceRefresh, true, { applyEffects });
          }
        }
        
        // Si ya se reintentó y sigue fallando, marcar como error de red (no cerrar sesión)
        if (applyEffects) setIsSlowNetwork(true);
        return { 
          success: false, 
          isNetworkError: false, 
          error: 'rls_forbidden',
          details: 'RLS bloqueó el acceso al perfil. Verificar políticas RLS.'
        };
      }

      // 🚨 VERIFICACIÓN: Si el resultado es null pero NO hay error (posible bloqueo RLS silencioso)
      if (!effectiveProfile && !queryError) {
        console.warn('⚠️ Query retornó null sin error - posible bloqueo RLS silencioso');
        // Reintentar una vez más con delay si no es retry
        if (!isRetry) {
          const retryCount = retryAttemptsRef.current.get(userId) || 0;
          if (retryCount < MAX_RETRY_ATTEMPTS) {
            retryAttemptsRef.current.set(userId, retryCount + 1);
            console.log(`🔄 Reintentando después de null silencioso (intento ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
            // Esperar 2 segundos antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchUserProfile(userId, forceRefresh, true, { applyEffects });
          }
        }
      }

      // PASO 2: Si no existe por auth_user_id, buscar por email (solo si no hay error de red)
      if (!effectiveProfile && (!queryError || queryError.code === 'PGRST116')) {
        if (!creatingProfileRef.current) {
          creatingProfileRef.current = true;
          try {
            const { data: authUser } = await supabase.auth.getUser();
            const email = authUser.user?.email;
            
            if (email) {
              // Buscar por email con timeout de 10 segundos (menos agresivo que antes)
              const emailSearchPromise = supabase
                .from('users')
                .select('id, auth_user_id, company_id, email, name, role, assigned_store_id, active, created_at, updated_at')
                .eq('email', email)
                .maybeSingle();
              
              const emailTimeout = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('EMAIL_SEARCH_TIMEOUT')), 10000);
              });

              try {
                const emailResult = await Promise.race([emailSearchPromise, emailTimeout]) as any;
                const existingProfile = emailResult?.data;
                
                if (existingProfile) {
                  // Vincular perfil con auth_user_id
                  // Intentar UPDATE directo primero
                  try {
                    const { data: linkedProfile, error: updateError } = await supabase
                      .from('users')
                      .update({ auth_user_id: userId, updated_at: new Date().toISOString() })
                      .eq('id', existingProfile.id)
                      .select()
                      .single();
                    
                    if (!updateError && linkedProfile) {
                      effectiveProfile = linkedProfile as UserProfile;
                      console.log('✅ Profile linked successfully by email (direct update)');
                    } else {
                      // Si el UPDATE falla (probablemente por RLS), usar función RPC
                      console.log('⚠️ Direct update failed, trying RPC function...', updateError);
                      const { data: rpcResult, error: rpcError } = await supabase.rpc('link_user_profile_by_email');
                      
                      if (rpcError) {
                        console.error('❌ Error linking profile via RPC:', rpcError);
                        // Usar el perfil existente aunque no esté vinculado
                        effectiveProfile = existingProfile as UserProfile;
                      } else if (rpcResult?.success) {
                        console.log('✅ Profile linked successfully via RPC');
                        // Recargar el perfil después de vincular
                        const { data: reloadedProfile } = await supabase
                          .from('users')
                          .select('id, auth_user_id, company_id, email, name, role, assigned_store_id, active, created_at, updated_at')
                          .eq('auth_user_id', userId)
                          .single();
                        effectiveProfile = reloadedProfile as UserProfile || existingProfile as UserProfile;
                      } else {
                        console.warn('⚠️ RPC returned unsuccessful:', rpcResult);
                        effectiveProfile = existingProfile as UserProfile;
                      }
                    }
                  } catch (linkErr: any) {
                    console.error('❌ Error linking profile:', linkErr);
                    // Intentar RPC como último recurso
                    try {
                      const { data: rpcResult } = await supabase.rpc('link_user_profile_by_email');
                      if (rpcResult?.success) {
                        const { data: reloadedProfile } = await supabase
                          .from('users')
                          .select('id, auth_user_id, company_id, email, name, role, assigned_store_id, active, created_at, updated_at')
                          .eq('auth_user_id', userId)
                          .single();
                        effectiveProfile = reloadedProfile as UserProfile || existingProfile as UserProfile;
                        console.log('✅ Profile linked via RPC fallback');
                      } else {
                        effectiveProfile = existingProfile as UserProfile;
                      }
                    } catch (rpcFallbackErr) {
                      console.error('❌ RPC fallback also failed:', rpcFallbackErr);
                      effectiveProfile = existingProfile as UserProfile;
                    }
                  }
                }
              } catch (emailSearchErr: any) {
                if (emailSearchErr?.message === 'EMAIL_SEARCH_TIMEOUT') {
                  // Timeout en búsqueda por email - no es fatal, continuar
                  console.warn('Email search timeout - continuando sin vincular por email');
                  if (applyEffects) setIsSlowNetwork(true);
                } else {
                  console.warn('Email search failed:', emailSearchErr?.message);
                }
              }
            }
          } catch (bootstrapErr) {
            console.error('Error bootstrapping profile:', bootstrapErr);
          } finally {
            creatingProfileRef.current = false;
          }
        }
      }

      // Si no se encontró perfil después de todos los intentos
      // DIFERENCIAR: ¿Es error de red, timeout, RLS bloqueando, o perfil realmente no existe?
      if (!effectiveProfile) {
        // Si hay error de timeout/red (pero NO 403), NO cerrar sesión
        if (queryError?.message?.includes('timeout') || queryError?.message?.includes('network')) {
          console.warn('Error de red al buscar perfil - manteniendo sesión activa');
          if (applyEffects) setIsSlowNetwork(true);
          return { success: false, isNetworkError: true, error: 'network_error' };
        }

        // Si el error es "no encontrado" (PGRST116) y no es retry, intentar una vez más
        if (queryError?.code === 'PGRST116' && !isRetry) {
          const retryCount = retryAttemptsRef.current.get(userId) || 0;
          if (retryCount < MAX_RETRY_ATTEMPTS) {
            retryAttemptsRef.current.set(userId, retryCount + 1);
            console.log(`🔄 Reintentando fetchUserProfile (intento ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
            // Esperar 2 segundos antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchUserProfile(userId, forceRefresh, true, { applyEffects });
          }
        }

        // 🛡️ BLINDAJE DE CIERRE DE SESIÓN: Verificación RLS explícita antes de cerrar sesión
        // Última consulta de prueba para diferenciar entre "RLS bloqueando" y "perfil no existe"
        console.log('🛡️ Ejecutando verificación RLS explícita antes de cerrar sesión...');
        try {
          const finalRLSCheck = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', userId)
            .maybeSingle();

          // Si la consulta falla con 403 Forbidden, significa que RLS está bloqueando
          if (finalRLSCheck.error?.code === 'PGRST301' || finalRLSCheck.error?.status === 403) {
            console.error('❌ RLS bloquea acceso al perfil (403 Forbidden) - NO cerrando sesión');
            console.error('   El usuario está autenticado pero RLS impide leer su perfil.');
            console.error('   Esto puede ser un problema de sincronización RLS o permisos incorrectos.');
            console.error('   El Admin debe verificar las políticas RLS en public.users');
            
            // NO cerrar sesión - mantener al usuario logueado para que el Admin pueda corregir
            if (applyEffects) {
              setIsSlowNetwork(true);
              setLoading(false);
            }
            return { 
              success: false, 
              isNetworkError: false, 
              error: 'rls_forbidden',
              details: 'RLS bloqueó el acceso al perfil. Verificar políticas RLS. Sesión mantenida para corrección administrativa.'
            };
          }

          // Si la consulta se completa sin error pero retorna null, el perfil realmente no existe
          if (!finalRLSCheck.error && !finalRLSCheck.data) {
            console.warn('✅ Verificación RLS completada: Perfil realmente no existe.');
            retryAttemptsRef.current.delete(userId);
            if (applyEffects) {
              profileCacheRef.current.delete(userId);
              clearAuthCache();
              setUserProfile(null);
              setCompany(null);
              setLoading(false);
              setIsSlowNetwork(false);
              setUser(null);
              setSession(null);
              supabase.auth.signOut().catch((err) => {
                console.error('Error signing out:', err);
              });
            }
            return { success: false, isNetworkError: false, error: 'profile_not_found' };
          }

          // Si la consulta retorna datos, el perfil existe pero hubo un problema anterior
          if (finalRLSCheck.data) {
            console.warn('⚠️ Verificación RLS encontró perfil pero no se pudo leer completamente. Reintentando...');
            // Reintentar una vez más con delay adicional
            await new Promise(resolve => setTimeout(resolve, 3000));
            return fetchUserProfile(userId, true, false, { applyEffects });
          }
        } catch (finalCheckError: any) {
          // Si la verificación final falla con error de red, NO cerrar sesión
          if (finalCheckError?.message?.includes('timeout') || 
              finalCheckError?.message?.includes('network') ||
              finalCheckError?.code === 'ECONNREFUSED' ||
              finalCheckError?.code === 'ETIMEDOUT') {
            console.warn('Error de red en verificación final - manteniendo sesión activa');
            if (applyEffects) {
              setIsSlowNetwork(true);
              setLoading(false);
            }
            return { success: false, isNetworkError: true, error: 'network_error' };
          }

          // Otro tipo de error en la verificación final - asumir que es problema de RLS
          console.error('Error en verificación final RLS:', finalCheckError);
          if (applyEffects) {
            setIsSlowNetwork(true);
            setLoading(false);
          }
          return { 
            success: false, 
            isNetworkError: false, 
            error: 'rls_forbidden',
            details: 'Error al verificar RLS. Sesión mantenida para corrección administrativa.'
          };
        }

        // Si llegamos aquí sin retornar, algo inesperado pasó
        console.error('⚠️ Estado inesperado después de verificación RLS - manteniendo sesión activa por seguridad');
        if (applyEffects) {
          setIsSlowNetwork(true);
          setLoading(false);
        }
        return { 
          success: false, 
          isNetworkError: false, 
          error: 'unexpected_state',
          details: 'Estado inesperado después de verificación RLS. Sesión mantenida.'
        };
      }

      retryAttemptsRef.current.delete(userId); // Limpiar contador de reintentos en éxito

      // Verificar si el usuario requiere configuración de contraseña
      if (applyEffects && effectiveProfile && user) {
        const userMetadata = user.user_metadata;
        const needsPasswordSetup = userMetadata?.requiresPasswordSetup === true || 
                                 !userMetadata?.passwordSetupDate;
        setRequiresPasswordSetup(needsPasswordSetup);
      }

      if (applyEffects) {
        setUserProfile(effectiveProfile);
        setIsSlowNetwork(false);
      }

      // Fetch company data (con timeout también)
      if (effectiveProfile?.company_id) {
        try {
          const companyFetchPromise = supabase
            .from('companies')
            .select('id, name, created_at, updated_at')
            .eq('id', effectiveProfile.company_id)
            .single();

          const companyTimeout = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('COMPANY_FETCH_TIMEOUT')), 10000);
          });

          try {
            const companyResult = await Promise.race([companyFetchPromise, companyTimeout]);
            const companyData = companyResult?.data;
            const companyError = companyResult?.error;

            if (companyError) {
              console.error('Error fetching company:', companyError);
            } else if (companyData) {
              resolvedCompany = companyData as Company;
              if (applyEffects) {
                setCompany(companyData);
                profileCacheRef.current.set(userId, {
                  profile: effectiveProfile,
                  company: companyData,
                  timestamp: Date.now()
                });
              }
            }
          } catch (companyTimeoutErr: any) {
            if (companyTimeoutErr?.message === 'COMPANY_FETCH_TIMEOUT') {
              console.warn('Company fetch timeout - usando perfil sin datos de compañía');
              if (applyEffects) {
                setIsSlowNetwork(true);
                profileCacheRef.current.set(userId, {
                  profile: effectiveProfile,
                  company: null as any,
                  timestamp: Date.now()
                });
              }
            } else {
              console.error('Company fetch failed:', companyTimeoutErr);
            }
          }
        } catch (companyError) {
          console.error('Company fetch failed:', companyError);
        }

        if (applyEffects) {
          // Check if default store exists (background, no await)
          ensureDefaultStore((effectiveProfile as any).company_id);
        }
      }

      return { success: true, profile: effectiveProfile, company: resolvedCompany };
    } catch (error: any) {
      console.error('Error in fetchUserProfile:', error);
      
      // DIFERENCIAR entre error de red y error real
      // NOTA: PGRST301 (403) NO se considera error de red aquí porque ya se maneja arriba
      const isNetworkError = 
        error?.message?.includes('timeout') ||
        error?.message?.includes('network') ||
        error?.message?.includes('fetch') ||
        error?.code === 'ECONNREFUSED' ||
        error?.code === 'ETIMEDOUT';
      
      // Verificar si es error 403 (ya debería haberse manejado arriba, pero por si acaso)
      if (error?.code === 'PGRST301' || error?.status === 403) {
        console.error('❌ Error 403 detectado en catch - reintentando');
        if (applyEffects) setIsSlowNetwork(true);
        if (!isRetry) {
          const retryCount = retryAttemptsRef.current.get(userId) || 0;
          if (retryCount < MAX_RETRY_ATTEMPTS) {
            retryAttemptsRef.current.set(userId, retryCount + 1);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchUserProfile(userId, forceRefresh, true, { applyEffects });
          }
        }
        return { success: false, isNetworkError: false, error: 'rls_forbidden' };
      }

      if (isNetworkError) {
        // Error de red - NO cerrar sesión, permitir reintento
        console.warn('Error de red detectado - manteniendo sesión activa para reintento');
        if (applyEffects) setIsSlowNetwork(true);
        return { success: false, isNetworkError: true, error: 'network_error' };
      }

      // Error real (perfil no existe, permisos, etc.)
      console.warn('Error real detectado');
      retryAttemptsRef.current.delete(userId);
      if (applyEffects) {
        profileCacheRef.current.delete(userId);
        setUserProfile(null);
        setCompany(null);
        setUser(null);
        setSession(null);
        setLoading(false);
        setIsSlowNetwork(false);
        supabase.auth.signOut().catch((err) => {
          console.error('Error signing out:', err);
        });
      }
      return { success: false, isNetworkError: false, error: 'real_error' };
    }
  };

  const ensureDefaultStore = async (companyId: string) => {
    try {
      const { data: stores, error: storesError } = await supabase
        .from('stores')
        .select('id')
        .eq('company_id', companyId)
        .limit(1);

      if (storesError) {
        console.error('Error checking stores:', storesError);
        return;
      }

      if (!stores || stores.length === 0) {
        console.log('No stores found, creating default store...');
        supabase
          .rpc('create_default_store', { 
            p_company_id: companyId,
            p_store_name: 'Tienda Principal'
          })
          .then(({ data: storeData, error: storeError }) => {
            if (storeError || (storeData && storeData.error)) {
              console.error('Error creating default store:', storeError || storeData);
            } else {
              console.log('Default store created successfully');
            }
          });
      }
    } catch (error) {
      console.error('Error in ensureDefaultStore:', error);
    }
  };

  const refreshProfile = async () => {
    if (isMaintenanceModeActive()) return;
    if (user?.id) {
      setIsSlowNetwork(false);
      retryAttemptsRef.current.delete(user.id); // Reset retry counter
      const result = await fetchUserProfile(user.id, true);
      if (!result.success && result.isNetworkError) {
        setIsSlowNetwork(true);
      }
    }
  };

  const retryProfileFetch = async () => {
    if (isMaintenanceModeActive()) return;
    if (user?.id) {
      setIsSlowNetwork(false);
      retryAttemptsRef.current.delete(user.id); // Reset retry counter
      setLoading(true);
      try {
        const result = await fetchUserProfile(user.id, true, false);
        if (result.success) {
          setIsSlowNetwork(false);
        } else if (result.isNetworkError) {
          setIsSlowNetwork(true);
        }
      } catch (error) {
        console.error('Error retrying profile fetch:', error);
        setIsSlowNetwork(true);
      } finally {
        setLoading(false);
      }
    }
  };

  const markPasswordAsSetup = async () => {
    try {
      if (!user?.id) return;
      
      const { error } = await supabase.auth.updateUser({
        data: { 
          requiresPasswordSetup: false,
          passwordSetupDate: new Date().toISOString()
        }
      });

      if (error) {
        console.error('Error marking password as setup:', error);
        return;
      }

      setRequiresPasswordSetup(false);
      
      setUser(prev => prev ? {
        ...prev,
        user_metadata: {
          ...prev.user_metadata,
          requiresPasswordSetup: false,
          passwordSetupDate: new Date().toISOString()
        }
      } : null);
    } catch (error) {
      console.error('Error in markPasswordAsSetup:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('[Auth] Starting signIn...');

    if (isMaintenanceModeActive()) {
      const maintenanceBlock = await blockAuthForMaintenance();
      if (maintenanceBlock.blocked) return { error: maintenanceBlock.error };
      return { error: { message: MAINTENANCE_LOGIN_MESSAGE, name: 'TypeError' } };
    }

    const maintenanceBlock = await blockAuthForMaintenance();
    if (maintenanceBlock.blocked) {
      return { error: maintenanceBlock.error };
    }
    
    // Step 1: Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('[Auth] Authentication failed:', authError);
      return { error: authError };
    }

    if (!authData.session?.user) {
      console.error('[Auth] No session after authentication');
      return { error: { message: 'No session created' } };
    }

    console.log('[Auth] Session found, user ID:', authData.session.user.id);
    
    // Step 2: Wait for profile to be loaded
    console.log('[Auth] Fetching Profile...');
    setLoading(true);
    
    try {
      const profileResult = await fetchUserProfile(authData.session.user.id, false, false);
      
      if (!profileResult.success) {
        console.error('[Auth] Profile fetch failed:', profileResult.error);
        
        // If profile doesn't exist, sign out
        if (profileResult.error === 'profile_not_found') {
          await supabase.auth.signOut();
          return { error: { message: 'Perfil de usuario no encontrado. Contacte al administrador.' } };
        }
        
        // For other errors (network, RLS), return error but keep session
        return { error: { message: profileResult.details || 'Error al cargar perfil de usuario' } };
      }

      console.log('[Auth] Profile Loaded');
      
      // Step 3: Verify profile exists in state
      // Wait a bit for state to update (React state is async)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check if profile is in cache (most reliable way)
      const cachedProfile = profileCacheRef.current.get(authData.session.user.id);
      if (!cachedProfile) {
        console.error('[Auth] Profile not found in cache after fetch');
        return { error: { message: 'Error al cargar perfil de usuario' } };
      }

      console.log('[Auth] Ready - User authenticated and profile loaded');
      setLoading(false);
      return { error: null };
    } catch (error: any) {
      console.error('[Auth] Error during signIn:', error);
      setLoading(false);
      return { error: { message: error.message || 'Error al iniciar sesión' } };
    }
  };

  const signUp = async (
    email: string, 
    password: string, 
    companyName: string, 
    userName: string,
    companyId?: string,
    role?: string,
    assignedStoreId?: string | null
  ) => {
    console.log('[Auth] Starting signUp...', { email, companyId, role, assignedStoreId });

    const maintenanceBlock = await blockAuthForMaintenance();
    if (maintenanceBlock.blocked) {
      return { error: maintenanceBlock.error };
    }
    
    // Build metadata object for the trigger
    const metadata: Record<string, any> = {
      name: userName,
      user_name: userName, // Keep for backward compatibility
      company_name: companyName, // Keep for backward compatibility
    };
    
    // CRITICAL: company_id is REQUIRED by the trigger to create the profile
    if (companyId) {
      metadata.company_id = companyId;
    }
    
    // Optional: role (defaults to 'cashier' in trigger if not provided)
    if (role) {
      metadata.role = role;
    }
    
    // Optional: assigned_store_id (nullable)
    if (assignedStoreId) {
      metadata.assigned_store_id = assignedStoreId;
    }
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });
    
    if (error) {
      console.error('[Auth] signUp failed:', error);
    } else {
      console.log('[Auth] signUp successful - trigger will create profile automatically');
    }
    
    return { error };
  };

  const clearBrowserAuthStorage = () => {
    const keysToKeep = ['theme', 'language', 'pos_maintenance_mode'];
    const allKeys = Object.keys(localStorage);
    allKeys.forEach((key) => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    sessionStorage.clear();
    const supabaseKeys = Object.keys(localStorage).filter(
      (key) => key.includes('supabase') || key.includes('sb-')
    );
    supabaseKeys.forEach((key) => localStorage.removeItem(key));
    clearAuthCache();
  };

  const resetAuthState = () => {
    userProfileRef.current = null;
    sessionRef.current = null;
    setUser(null);
    setSession(null);
    setUserProfile(null);
    setCompany(null);
    setRequiresPasswordSetup(false);
    setIsSlowNetwork(false);
    profileCacheRef.current.clear();
    sessionKeepAlive.stop();
    setLoading(false);
  };

  const evictSessionForMaintenance = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (error) {
      console.error('[Maintenance] Error en signOut:', error);
    }
    clearBrowserAuthStorage();
    resetAuthState();

    // No recargar si ya estamos en login: eso provoca bucle carga ↔ login.
    const path = window.location.pathname || '/';
    const search = window.location.search || '';
    const alreadyOnLogin =
      path === '/' ||
      path === '' ||
      path.startsWith('/auth') ||
      search.includes('maintenance=');
    if (alreadyOnLogin) return;

    if (!isPublicAppPath(path)) {
      window.location.replace('/?maintenance=1');
    }
  };

  const signOut = async () => {
    // ✅ LOGOUT COMPLETO: Limpiar navegador y sistema
    try {
      await supabase.auth.signOut();
      clearBrowserAuthStorage();
    } catch (error) {
      console.error('[Auth] Error en logout completo:', error);
    }
    resetAuthState();
  };

  // [MANTENIMIENTO] Sin efecto si MAINTENANCE_PROTOCOL_ENABLED = false
  useLayoutEffect(() => {
    if (!MAINTENANCE_PROTOCOL_ENABLED) return;
    registerMaintenanceSessionEvict(evictSessionForMaintenance);
    if (isMaintenanceModeActive()) {
      void evictSessionForMaintenance();
    }
    return () => registerMaintenanceSessionEvict(null);
  }, []);

  useEffect(() => {
    if (!MAINTENANCE_PROTOCOL_ENABLED) return;
    return subscribeMaintenanceMode(() => {
      if (isMaintenanceModeActive()) {
        void evictSessionForMaintenance();
      }
    });
  }, []);

  useEffect(() => {
    if (MAINTENANCE_PROTOCOL_ENABLED && maintenanceActive) {
      void evictSessionForMaintenance();
      return;
    }

    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let isInitialized = false;

    const initializeAuth = async () => {
      try {
        if (isMaintenanceModeActive()) {
          console.warn('[Maintenance] Modo activo al iniciar — cerrando sesión.');
          await evictSessionForMaintenance();
          isInitialized = true;
          return;
        }

        // ✅ DETECCIÓN DE HARD REFRESH DESHABILITADA: Causaba loop infinito
        // La detección automática de hard refresh causaba problemas de recarga constante
        // Se manejará solo cuando no hay sesión válida después de cargar

        // Limpiar cache de autenticación al inicio si es la primera vez en esta sesión
        const cacheCleared = sessionStorage.getItem('auth_cache_cleared');
        if (!cacheCleared) {
          console.log('Limpiando cache de autenticación al inicio...');
          clearAuthCache();
          sessionStorage.setItem('auth_cache_cleared', 'true');
        }
        
        // ✅ CORRECCIÓN #3: Verificar sesión UNA vez al inicio, decidir rápidamente
        // 1. Obtener Sesión PRIMERO (antes de establecer timeout)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) {
          return;
        }
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setLoading(false);
          isInitialized = true;
          return;
        }

        if (isMaintenanceModeActive()) {
          console.warn('[Maintenance] Sesión detectada con mantenimiento ON — expulsando.');
          await evictSessionForMaintenance();
          isInitialized = true;
          return;
        }
        
        // ✅ CORRECCIÓN #2: Si NO hay sesión, establecer loading = false INMEDIATAMENTE
        if (!session) {
          // ✅ No hay sesión después de refresh - forzar logout y limpiar estado
          console.log('[Auth] No hay sesión después de refresh. Limpiando estado y redirigiendo al login INMEDIATAMENTE.');
          setUser(null);
          setUserProfile(null);
          setCompany(null);
          setSession(null);
          setLoading(false); // ✅ QUITAR loading INMEDIATAMENTE
          sessionKeepAlive.stop();
          profileCacheRef.current.clear();
          isInitialized = true;
          // ✅ NO establecer timeout si no hay sesión
          return;
        }
        
        // ✅ CORRECCIÓN #1: El timeout SOLO debe ejecutarse si HAY sesión
        timeoutId = setTimeout(async () => {
          if (mounted && !isInitialized) {
            console.warn('[Auth] Timeout de inicialización alcanzado (5s). Forzando estado.');
            // Obtener la sesión actual para verificar
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            // Si hay sesión pero no hay perfil, puede ser conexión lenta
            if (currentSession?.user) {
              // Verificar si hay perfil en cache
              const hasCachedProfile = profileCacheRef.current.has(currentSession.user.id);
              if (!hasCachedProfile) {
                // No hay perfil después del timeout - puede ser conexión lenta
                console.warn('Timeout: Sesión activa sin perfil. Marcando como conexión lenta.');
                setIsSlowNetwork(true);
                setLoading(false); // Permitir que la UI se renderice
                // NO cerrar sesión automáticamente - permitir reintento
                isInitialized = true;
              } else {
                // Hay perfil en cache, establecerlo y continuar
                const cached = profileCacheRef.current.get(currentSession.user.id);
                if (cached) {
                  setUserProfile(cached.profile);
                  setCompany(cached.company);
                }
                setIsSlowNetwork(false);
                setLoading(false);
                isInitialized = true;
              }
            } else {
              // No hay sesión, mostrar login
              setIsSlowNetwork(false);
              setLoading(false);
              isInitialized = true;
            }
          }
        }, 5000); // ✅ 5 segundos (solo si hay sesión)
        
        setSession(session);
        setUser(session.user);
        
        if (!session.user) {
          setLoading(false);
          sessionKeepAlive.stop();
          isInitialized = true;
          clearTimeout(timeoutId);
          return;
        }
        
        console.log('[Auth] Session found on initialization, user ID:', session.user.id);
        
        // CRITICAL: loading must be true until profile is loaded
        setLoading(true);
        
        // Check cache first (fastest path)
        const hasCachedProfile = profileCacheRef.current.has(session.user.id);
        
        if (hasCachedProfile) {
          console.log('[Auth] Using cached profile on initialization');
          const cached = profileCacheRef.current.get(session.user.id);
          if (cached) {
            setUserProfile(cached.profile);
            setCompany(cached.company);
            sessionKeepAlive.start();
            setLoading(false);
            isInitialized = true;
            clearTimeout(timeoutId);
            console.log('[Auth] Ready (cached)');
            return;
          }
        }
        
        // --- ⚡ FAST LANE (Vía Rápida) ---
        // Intentamos traer Perfil + Compañía en un solo viaje.
        // Usamos el alias 'company' para la relación 'companies' para que coincida con el estado local.
        try {
          const { data: fastData, error: fastError } = await supabase
            .from('users')
            .select('*, company:companies(id, name, created_at, updated_at)')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();
          
          // Validamos: No error, Datos existen, y Compañía existe (no es null por RLS/Trigger)
          if (!fastError && fastData && fastData.company) {
            console.log('⚡ Fast Lane Auth: Carga optimizada exitosa');
            
            if (mounted) {
              // Desestructuramos para separar perfil de compañía
              const { company, ...profile } = fastData;
              
              // Establecer estados
              setUserProfile(profile as UserProfile);
              setCompany(company as Company);
              
              // Cachear el resultado
              profileCacheRef.current.set(session.user.id, {
                profile: profile as UserProfile,
                company: company as Company,
                timestamp: Date.now()
              });
              
              sessionKeepAlive.start();
              setLoading(false);
              isInitialized = true;
              clearTimeout(timeoutId);
              console.log('[Auth] Ready (Fast Lane)');
              return; // ¡Terminamos en <300ms!
            }
          }
          
          // --- 🐢 SLOW LANE (Fallback / Recuperación) ---
          // Si llegamos aquí, el trigger de creación no ha terminado o es un caso legacy.
          console.warn('Fast lane omitido (Trigger pendiente o RLS), usando carga legacy...', fastError?.message || 'company is null');
          
          if (mounted) {
            // Llamamos a la lógica original robusta con reintentos
            const profileResult = await fetchUserProfile(session.user.id);
            
            if (!profileResult.success) {
              console.error('[Auth] Profile fetch failed:', profileResult.error);
              
              // If profile doesn't exist, clear session
              if (profileResult.error === 'profile_not_found') {
                setUser(null);
                setSession(null);
                setUserProfile(null);
                setCompany(null);
                setLoading(false);
                sessionKeepAlive.stop();
                isInitialized = true;
                clearTimeout(timeoutId);
                return;
              }
              
              // For network/RLS errors, keep session but mark as slow network
              setIsSlowNetwork(true);
              setLoading(false);
              isInitialized = true;
              clearTimeout(timeoutId);
              return;
            }
            
            console.log('[Auth] Profile Loaded (Slow Lane)');
            
            // Verify profile is in cache
            const currentCached = profileCacheRef.current.get(session.user.id);
            if (currentCached) {
              setUserProfile(currentCached.profile);
              setCompany(currentCached.company);
              sessionKeepAlive.start();
              console.log('[Auth] Ready (Slow Lane)');
            } else {
              console.error('[Auth] Profile not in cache after fetch');
              setIsSlowNetwork(true);
            }
            
            setLoading(false);
            isInitialized = true;
            clearTimeout(timeoutId);
          }
        } catch (profileError) {
          console.error('[Auth] Error in profile fetch:', profileError);
          setIsSlowNetwork(true);
          setLoading(false);
          isInitialized = true;
          clearTimeout(timeoutId);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setLoading(false);
          isInitialized = true;
        }
      }
    };

    initializeAuth();

    const isDeferredValid = (
      snapshot: AuthDeferredSnapshot,
      requireUserMatch: boolean
    ): boolean =>
      isAuthDeferredStillValid({
        mounted,
        epoch: snapshot.epoch,
        currentEpoch: authEpochRef.current,
        expectedUserId: snapshot.userId,
        currentUserId: sessionRef.current?.user?.id ?? null,
        requireUserMatch,
      });

    const handleAuthStateDeferred = async (snapshot: AuthDeferredSnapshot) => {
      const cancel = (_reason: string) => {
        /* stale epoch/user — early return only */
      };

      try {
        if (snapshot.kind === 'maintenance_evict') {
          if (!isDeferredValid(snapshot, true)) {
            cancel('stale_epoch_or_user');
            return;
          }
          console.warn('[Maintenance] Sesión detectada con mantenimiento activo — cerrando.');
          await evictSessionForMaintenance();
          return;
        }

        // profile_fetch — resolve SIN side effects; apply solo si epoch/user vigentes.
        if (!snapshot.userId || !isDeferredValid(snapshot, true)) {
          cancel('stale_epoch_or_user');
          return;
        }

        console.log('[Auth] Fetching Profile (deferred, no side effects)...');
        let profileResult: ProfileFetchResult;
        try {
          profileResult = await fetchUserProfile(snapshot.userId, false, false, {
            applyEffects: false,
          });
        } catch (error) {
          console.error('[Auth] Error fetching profile (deferred):', error);
          if (!isDeferredValid(snapshot, true)) {
            cancel('stale_after_fetch_error');
            return;
          }
          // Solo epoch vigente puede tocar loading/network flags.
          setIsSlowNetwork(true);
          setLoading(false);
          return;
        }

        const applyStatus = await applyDeferredProfileResult({
          mounted,
          epoch: snapshot.epoch,
          currentEpoch: authEpochRef.current,
          expectedUserId: snapshot.userId,
          currentUserId: sessionRef.current?.user?.id ?? null,
          result: profileResult,
          hooks: {
            setUserProfile: (p) => setUserProfile(p),
            setCompany: (c) => setCompany(c),
            setLoading,
            setIsSlowNetwork,
            setUser: (u) => setUser(u),
            setSession: (s) => setSession(s),
            setUserProfileRef: (p) => {
              userProfileRef.current = p;
            },
            setSessionRef: (s) => {
              sessionRef.current = s;
            },
            writeCache: (uid, profile, company) => {
              profileCacheRef.current.set(uid, {
                profile,
                company: company as Company,
                timestamp: Date.now(),
              });
            },
            deleteCache: (uid) => {
              profileCacheRef.current.delete(uid);
            },
            startKeepAlive: () => sessionKeepAlive.start(),
            stopKeepAlive: () => sessionKeepAlive.stop(),
            signOut: async () => {
              await supabase.auth.signOut();
            },
            onReady: () => {
              console.log('[Auth] Ready (deferred apply)');
              const companyId = profileResult.profile?.company_id;
              if (companyId) ensureDefaultStore(companyId);
            },
          },
        });

        if (applyStatus === 'cancelled') {
          cancel('stale_after_fetch');
          return;
        }

        if (profileResult.error === 'profile_not_found' || profileResult.error === 'real_error') {
          if (applyStatus === 'signed_out') {
            return;
          }
        }

        if (!profileResult.success && applyStatus === 'failed') {
          console.error('[Auth] Profile fetch failed:', profileResult.error);
        }

      } catch (error) {
        console.error('[Auth] Deferred auth handler error:', error);
      }
    };

    // L1-05M: callback síncrono — sin await/red; diferir con setTimeout(0).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!mounted) return;

        const epoch = ++authEpochRef.current;
        const userId = session?.user?.id ?? null;

        sessionRef.current = session;
        setSession(session);
        setUser(session?.user ?? null);

        const plan = planAuthStateSync({
          event,
          userId,
          maintenanceActive: isMaintenanceModeActive(),
          profileAuthUserId: userProfileRef.current?.auth_user_id ?? null,
          hasCachedProfile: !!userId && profileCacheRef.current.has(userId),
        });

        console.log('Auth state change:', event, userId, plan.action);

        if (plan.action === 'maintenance_schedule') {
          console.warn('[Maintenance] Sesión detectada — programando eviction diferida.');
          const snapshot: AuthDeferredSnapshot = {
            epoch,
            event,
            userId,
            kind: 'maintenance_evict',
          };
          scheduleAuthDeferredWork(() => handleAuthStateDeferred(snapshot));
          return;
        }

        if (plan.action === 'signed_out_cleanup') {
          userProfileRef.current = null;
          setUserProfile(null);
          setCompany(null);
          profileCacheRef.current.clear();
          sessionKeepAlive.stop();
          setLoading(false);
          clearAuthCache();
          return;
        }

        if (plan.action === 'no_session') {
          console.log('[Auth] No session');
          setLoading(false);
          return;
        }

        if (plan.action === 'fast_path_profile_match') {
          console.log('[Auth] Perfil ya activo (ref). Omitiendo recarga.');
          // L1-05M.3: epoch vigente con perfil resuelto posee loading.
          if (planLoadingForAuthSync(plan, event) === 'set_false') {
            setLoading(false);
          }
          return;
        }

        if (plan.action === 'restore_from_cache') {
          const cached = profileCacheRef.current.get(plan.userId);
          if (cached) {
            userProfileRef.current = cached.profile;
            setUserProfile(cached.profile);
            setCompany(cached.company);
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
              sessionKeepAlive.start();
            }
            // L1-05M.3: también TOKEN_REFRESHED cache-hit debe bajar loading.
            if (planLoadingForAuthSync(plan, event) === 'set_false') {
              setLoading(false);
            }
            console.log('[Auth] Profile restored from cache (sync)');
            return;
          }
          // Cache race: caer a fetch diferido
          if (planLoadingForAuthSync({ action: 'schedule_profile_fetch', userId: plan.userId }, event) === 'set_true') {
            setLoading(true);
          }
          const snapshot: AuthDeferredSnapshot = {
            epoch,
            event,
            userId: plan.userId,
            kind: 'profile_fetch',
          };
          scheduleAuthDeferredWork(() => handleAuthStateDeferred(snapshot));
          return;
        }

        if (plan.action === 'schedule_profile_fetch') {
          console.log('[Auth] Scheduling deferred profile fetch...');
          if (planLoadingForAuthSync(plan, event) === 'set_true') {
            setLoading(true);
          }
          const snapshot: AuthDeferredSnapshot = {
            epoch,
            event,
            userId: plan.userId,
            kind: 'profile_fetch',
          };
          scheduleAuthDeferredWork(() => handleAuthStateDeferred(snapshot));
        }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [maintenanceActive]);

  const authBlocked =
    MAINTENANCE_PROTOCOL_ENABLED && (maintenanceActive || isMaintenanceModeActive());

  return (
    <AuthContext.Provider
      value={{
        user: authBlocked ? null : user,
        userProfile: authBlocked ? null : userProfile,
        company: authBlocked ? null : company,
        session: authBlocked ? null : session,
        loading: authBlocked ? false : loading,
        requiresPasswordSetup,
        isSlowNetwork,
        signIn,
        signUp,
        signOut,
        refreshProfile,
        markPasswordAsSetup,
        retryProfileFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
