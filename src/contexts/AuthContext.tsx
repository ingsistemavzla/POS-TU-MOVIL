import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { sessionKeepAlive } from '@/utils/sessionKeepAlive';
import { clearAuthCache } from '@/utils/clearCache';
import { useToast } from '@/hooks/use-toast';

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
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  const MAX_RETRY_ATTEMPTS = 5; // Máximo 5 intentos antes de considerar error real (aumentado de 3 para mayor resiliencia)
  const PROFILE_FETCH_TIMEOUT = 15000; // 15 segundos (aumentado de 3s)
  
  // Keep session alive with periodic refresh and cache cleanup
  useEffect(() => {
    if (!session) return;
    
    const keepAliveInterval = setInterval(async () => {
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

  const fetchUserProfile = async (userId: string, forceRefresh = false, isRetry = false): Promise<{ success: boolean; isNetworkError?: boolean; error?: string }> => {
    try {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = profileCacheRef.current.get(userId);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          console.log('Using cached profile data for user:', userId);
          setUserProfile(cached.profile);
          setCompany(cached.company);
          setLoading(false);
          setIsSlowNetwork(false);
          return { success: true };
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
          setIsSlowNetwork(true);
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
            return fetchUserProfile(userId, forceRefresh, true);
          }
        }
        
        // Si ya se reintentó y sigue fallando, marcar como error de red (no cerrar sesión)
        setIsSlowNetwork(true);
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
            return fetchUserProfile(userId, forceRefresh, true);
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
                  setIsSlowNetwork(true);
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
          setIsSlowNetwork(true);
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
            return fetchUserProfile(userId, forceRefresh, true);
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
            setIsSlowNetwork(true);
            setLoading(false);
            return { 
              success: false, 
              isNetworkError: false, 
              error: 'rls_forbidden',
              details: 'RLS bloqueó el acceso al perfil. Verificar políticas RLS. Sesión mantenida para corrección administrativa.'
            };
          }

          // Si la consulta se completa sin error pero retorna null, el perfil realmente no existe
          if (!finalRLSCheck.error && !finalRLSCheck.data) {
            console.warn('✅ Verificación RLS completada: Perfil realmente no existe. Cerrando sesión.');
            // Limpiar cache primero
            profileCacheRef.current.delete(userId);
            retryAttemptsRef.current.delete(userId);
            // Limpiar cache de autenticación
            clearAuthCache();
            // Limpiar el estado local inmediatamente
            setUserProfile(null);
            setCompany(null);
            setLoading(false);
            setIsSlowNetwork(false);
            // Forzar limpieza de user y session
            setUser(null);
            setSession(null);
            // Cerrar sesión en background (no esperar)
            supabase.auth.signOut().catch((err) => {
              console.error('Error signing out:', err);
            });
            return { success: false, isNetworkError: false, error: 'profile_not_found' };
          }

          // Si la consulta retorna datos, el perfil existe pero hubo un problema anterior
          if (finalRLSCheck.data) {
            console.warn('⚠️ Verificación RLS encontró perfil pero no se pudo leer completamente. Reintentando...');
            // Reintentar una vez más con delay adicional
            await new Promise(resolve => setTimeout(resolve, 3000));
            return fetchUserProfile(userId, true, false);
          }
        } catch (finalCheckError: any) {
          // Si la verificación final falla con error de red, NO cerrar sesión
          if (finalCheckError?.message?.includes('timeout') || 
              finalCheckError?.message?.includes('network') ||
              finalCheckError?.code === 'ECONNREFUSED' ||
              finalCheckError?.code === 'ETIMEDOUT') {
            console.warn('Error de red en verificación final - manteniendo sesión activa');
            setIsSlowNetwork(true);
            setLoading(false);
            return { success: false, isNetworkError: true, error: 'network_error' };
          }

          // Otro tipo de error en la verificación final - asumir que es problema de RLS
          console.error('Error en verificación final RLS:', finalCheckError);
          setIsSlowNetwork(true);
          setLoading(false);
          return { 
            success: false, 
            isNetworkError: false, 
            error: 'rls_forbidden',
            details: 'Error al verificar RLS. Sesión mantenida para corrección administrativa.'
          };
        }

        // Si llegamos aquí sin retornar, algo inesperado pasó
        console.error('⚠️ Estado inesperado después de verificación RLS - manteniendo sesión activa por seguridad');
        setIsSlowNetwork(true);
        setLoading(false);
        return { 
          success: false, 
          isNetworkError: false, 
          error: 'unexpected_state',
          details: 'Estado inesperado después de verificación RLS. Sesión mantenida.'
        };
      }

      setUserProfile(effectiveProfile);
      setIsSlowNetwork(false);
      retryAttemptsRef.current.delete(userId); // Limpiar contador de reintentos en éxito

      // Verificar si el usuario requiere configuración de contraseña
      if (effectiveProfile && user) {
        const userMetadata = user.user_metadata;
        const needsPasswordSetup = userMetadata?.requiresPasswordSetup === true || 
                                 !userMetadata?.passwordSetupDate;
        setRequiresPasswordSetup(needsPasswordSetup);
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
              setCompany(companyData);
              
              // Cache the profile and company data
              profileCacheRef.current.set(userId, {
                profile: effectiveProfile,
                company: companyData,
                timestamp: Date.now()
              });
            }
          } catch (companyTimeoutErr: any) {
            if (companyTimeoutErr?.message === 'COMPANY_FETCH_TIMEOUT') {
              console.warn('Company fetch timeout - usando perfil sin datos de compañía');
              setIsSlowNetwork(true);
              // Cachear perfil sin compañía para evitar bloqueo
              profileCacheRef.current.set(userId, {
                profile: effectiveProfile,
                company: null as any,
                timestamp: Date.now()
              });
            } else {
              console.error('Company fetch failed:', companyTimeoutErr);
            }
          }
        } catch (companyError) {
          console.error('Company fetch failed:', companyError);
        }

        // Check if default store exists (background, no await)
        ensureDefaultStore((effectiveProfile as any).company_id);
      }

      return { success: true };
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
        setIsSlowNetwork(true);
        if (!isRetry) {
          const retryCount = retryAttemptsRef.current.get(userId) || 0;
          if (retryCount < MAX_RETRY_ATTEMPTS) {
            retryAttemptsRef.current.set(userId, retryCount + 1);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchUserProfile(userId, forceRefresh, true);
          }
        }
        return { success: false, isNetworkError: false, error: 'rls_forbidden' };
      }

      if (isNetworkError) {
        // Error de red - NO cerrar sesión, permitir reintento
        console.warn('Error de red detectado - manteniendo sesión activa para reintento');
        setIsSlowNetwork(true);
        return { success: false, isNetworkError: true, error: 'network_error' };
      }

      // Error real (perfil no existe, permisos, etc.) - cerrar sesión
      console.warn('Error real detectado - cerrando sesión');
      profileCacheRef.current.delete(userId);
      retryAttemptsRef.current.delete(userId);
      setUserProfile(null);
      setCompany(null);
      setUser(null);
      setSession(null);
      setLoading(false);
      setIsSlowNetwork(false);
      // Cerrar sesión en background
      supabase.auth.signOut().catch((err) => {
        console.error('Error signing out:', err);
      });
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

  const signOut = async () => {
    // ✅ LOGOUT COMPLETO: Limpiar navegador y sistema
    try {
      // Cerrar sesión en Supabase
      await supabase.auth.signOut();
      
      // Limpiar localStorage (excepto preferencias)
      const keysToKeep = ['theme', 'language'];
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
    } catch (error) {
      console.error('[Auth] Error en logout completo:', error);
    }
    
    // Limpiar estado de React
    setUser(null);
    setSession(null);
    setUserProfile(null);
    setCompany(null);
    profileCacheRef.current.clear();
    sessionKeepAlive.stop();
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let isInitialized = false;

    const initializeAuth = async () => {
      try {
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth state change:', event, session?.user?.id);

      setSession(session);
      setUser(session?.user ?? null);

      if (event === 'SIGNED_OUT') {
        setUserProfile(null);
        setCompany(null);
        profileCacheRef.current.clear();
        sessionKeepAlive.stop();
        setLoading(false);
        // Limpiar cache del navegador
        clearAuthCache();
    } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      if (session?.user) {
        console.log('[Auth] Session found, user ID:', session.user.id);
        
        // ✨ BLOQUE DE SEGURIDAD: Si ya tenemos perfil cargado y el ID coincide, NO reiniciamos el loading
        if (userProfile && session?.user?.id === userProfile.auth_user_id) {
          console.log('[Auth] Cambio de foco detectado, pero la sesión ya está activa. Omitiendo recarga.');
          return; // ✅ Salir temprano - evitar re-inicialización innecesaria
        }
        
        // CRITICAL: loading must be true until profile is loaded
        setLoading(true);
        
        const hasCachedProfile = profileCacheRef.current.has(session.user.id);
        
        if (!hasCachedProfile || !userProfile) {
          console.log('[Auth] Fetching Profile...');
          try {
            const profileResult = await fetchUserProfile(session.user.id);
            
            if (!profileResult.success) {
              console.error('[Auth] Profile fetch failed:', profileResult.error);
              
              // If profile doesn't exist, sign out
              if (profileResult.error === 'profile_not_found') {
                setUser(null);
                setSession(null);
                setUserProfile(null);
                setCompany(null);
                setLoading(false);
                sessionKeepAlive.stop();
                await supabase.auth.signOut();
                return;
              }
              
              // For network/RLS errors, keep session but mark as slow network
              setIsSlowNetwork(true);
              setLoading(false);
              return;
            }
            
            console.log('[Auth] Profile Loaded');
            
            // Verify profile is in cache
            const cached = profileCacheRef.current.get(session.user.id);
            if (cached) {
              setUserProfile(cached.profile);
              setCompany(cached.company);
              sessionKeepAlive.start();
              console.log('[Auth] Ready');
            } else {
              console.error('[Auth] Profile not in cache after fetch');
              setIsSlowNetwork(true);
            }
            
            setLoading(false);
          } catch (error) {
            console.error('[Auth] Error fetching profile on auth change:', error);
            setIsSlowNetwork(true);
            setLoading(false);
          }
        } else {
          console.log('[Auth] Using cached profile');
          const cached = profileCacheRef.current.get(session.user.id);
          if (cached) {
            setUserProfile(cached.profile);
            setCompany(cached.company);
            sessionKeepAlive.start();
            console.log('[Auth] Ready');
          } else {
            // Cache invalid, try to fetch
            console.log('[Auth] Cache invalid, fetching profile...');
            setLoading(true);
            try {
              const profileResult = await fetchUserProfile(session.user.id);
              if (profileResult.success) {
                const refreshedCache = profileCacheRef.current.get(session.user.id);
                if (refreshedCache) {
                  setUserProfile(refreshedCache.profile);
                  setCompany(refreshedCache.company);
                  sessionKeepAlive.start();
                  console.log('[Auth] Ready');
                }
              }
            } catch (error) {
              console.error('[Auth] Error refreshing profile:', error);
            }
          }
          setLoading(false);
        }
      } else {
        // No session, show login
        console.log('[Auth] No session');
        setLoading(false);
      }
      } else if (event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          // ✨ BLOQUE DE SEGURIDAD: Si ya tenemos perfil cargado y el ID coincide, NO reiniciamos el loading
          if (userProfile && session?.user?.id === userProfile.auth_user_id) {
            console.log('[Auth] Token refreshed, pero perfil ya está cargado. Omitiendo recarga.');
            return; // ✅ Salir temprano - evitar re-inicialización innecesaria
          }
          
          // Solo hacer fetch si realmente no hay perfil Y no está en cache
          const hasCachedProfile = profileCacheRef.current.has(session.user.id);
          if (!userProfile && !hasCachedProfile) {
            console.log('[Auth] Token refreshed, fetching profile...');
            setLoading(true);
            try {
              const profileResult = await fetchUserProfile(session.user.id);
              if (profileResult.success) {
                const cached = profileCacheRef.current.get(session.user.id);
                if (cached) {
                  setUserProfile(cached.profile);
                  setCompany(cached.company);
                  console.log('[Auth] Profile refreshed');
                }
              }
            } catch (error) {
              console.error('[Auth] Error fetching profile on token refresh:', error);
            } finally {
              setLoading(false);
            }
          } else if (hasCachedProfile) {
            // Usar cache si existe
            const cached = profileCacheRef.current.get(session.user.id);
            if (cached) {
              setUserProfile(cached.profile);
              setCompany(cached.company);
              console.log('[Auth] Profile restored from cache on token refresh');
            }
          }
        }
      }
    });

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        company,
        session,
        loading,
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
