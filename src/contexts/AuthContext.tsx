import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { sessionKeepAlive } from '@/utils/sessionKeepAlive';
import { getAuthRedirectUrl } from '@/config/environment';

type UserProfile = Tables<'users'>;
type Company = Tables<'companies'>;

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  company: Company | null;
  session: Session | null;
  loading: boolean;
  requiresPasswordSetup: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, companyName: string, userName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  markPasswordAsSetup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
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
  const creatingProfileRef = useRef(false);
  const profileCacheRef = useRef<Map<string, { profile: UserProfile; company: Company; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache
  
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

  const fetchUserProfile = async (userId: string, forceRefresh = false) => {
    try {
      // Check cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = profileCacheRef.current.get(userId);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          console.log('Using cached profile data for user:', userId);
          setUserProfile(cached.profile);
          setCompany(cached.company);
          return;
        }
      }

      // Add timeout for the entire profile fetch operation
      const profilePromise = supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Profile fetch timeout')), 15000); // Increased to 15 seconds
      });

      const { data: profile, error } = await Promise.race([profilePromise, timeoutPromise]) as any;

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        setLoading(false);
        return;
      }

      // If profile does not exist, try to bootstrap from an invitation
      let effectiveProfile = (profile as any) as UserProfile | null;
      if (!effectiveProfile) {
        // If another concurrent creation is in progress, wait briefly and re-check
        if (creatingProfileRef.current) {
          await new Promise((r) => setTimeout(r, 500));
          const { data: recheck } = await (supabase as any)
            .from('users')
            .select('*')
            .eq('auth_user_id', userId)
            .maybeSingle();
          effectiveProfile = (recheck as UserProfile) ?? null;
        } else {
          creatingProfileRef.current = true;
          try {
            const { data: authUser } = await supabase.auth.getUser();
            const email = authUser.user?.email ?? null;
            if (email) {
              const { data: invitation, error: inviteError } = await (supabase as any)
                .from('invitations')
                .select('*')
                .eq('email', email)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

              if (inviteError && inviteError.code !== 'PGRST116') {
                console.warn('Invitation lookup error (ignorable if none):', inviteError);
              }

              if (invitation) {
                const defaultName = email.split('@')[0];
                console.log('Creating user profile from invitation:', {
                  auth_user_id: userId,
                  company_id: (invitation as any).company_id,
                  name: defaultName,
                  email: email,
                  role: (invitation as any).role,
                  assigned_store_id: (invitation as any).assigned_store_id,
                  invitation: invitation
                });
                
                const { data: createdProfile, error: profileErr } = await (supabase as any)
                  .from('users')
                  .upsert(
                    {
                      auth_user_id: userId,
                      company_id: (invitation as any).company_id,
                      name: defaultName,
                      email: email,
                      role: (invitation as any).role,
                      active: true,
                      assigned_store_id: (invitation as any).assigned_store_id ?? null,
                    },
                    { onConflict: 'auth_user_id' }
                  )
                  .select()
                  .single();

                if (profileErr) {
                  console.error('Failed creating user profile from invitation:', profileErr);
                } else {
                  effectiveProfile = createdProfile as UserProfile;
                  console.log('User profile created successfully from invitation:', {
                    createdProfile: effectiveProfile,
                    assigned_store_id: effectiveProfile.assigned_store_id
                  });
                  
                  // Mark invitation as accepted (best effort)
                  await supabase
                    .from('invitations')
                    .update({ status: 'accepted' })
                    .eq('id', (invitation as any).id);
                }
              }
            }
          } catch (bootstrapErr) {
            console.error('Error bootstrapping profile from invitation:', bootstrapErr);
          } finally {
            creatingProfileRef.current = false;
          }
        }
      }

      setUserProfile(effectiveProfile);

      // Verificar si el usuario requiere configuración de contraseña
      if (effectiveProfile && user) {
        const userMetadata = user.user_metadata;
        const needsPasswordSetup = userMetadata?.requiresPasswordSetup === true || 
                                 !userMetadata?.passwordSetupDate;
        setRequiresPasswordSetup(needsPasswordSetup);
      }

      // Fetch company data with timeout
      if (effectiveProfile?.company_id) {
        try {
          const companyPromise = supabase
            .from('companies')
            .select('*')
            .eq('id', effectiveProfile.company_id)
            .single();

          const companyTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Company fetch timeout')), 10000); // Increased to 10 seconds
          });

          const { data: companyData, error: companyError } = await Promise.race([companyPromise, companyTimeoutPromise]) as any;

          if (companyError) {
            console.error('Error fetching company:', companyError);
          } else {
            setCompany(companyData);
          }
        } catch (companyError) {
          console.error('Company fetch failed:', companyError);
        }

        // Check if default store exists, if not create it (for users who registered before this fix)
        ensureDefaultStore((effectiveProfile as any).company_id); // Don't await - run in background
        
        // Cache the profile and company data
        if (effectiveProfile && company) {
          profileCacheRef.current.set(userId, {
            profile: effectiveProfile,
            company: company,
            timestamp: Date.now()
          });
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      setLoading(false); // Always stop loading
    }
  };

  const ensureDefaultStore = async (companyId: string) => {
    try {
      // Check if company has any stores
        const { data: stores, error: storesError } = await (supabase as any)
        .from('stores')
        .select('id, name')
        .eq('company_id', companyId)
        .limit(10); // Get more stores to check if there are multiple

      if (storesError) {
        console.error('Error checking stores:', storesError);
        return;
      }

      // If no stores exist, create default store (but don't block loading)
      if (!stores || stores.length === 0) {
        console.log('No stores found, creating default store...');
        // Don't await this - let it run in background
        (supabase as any)
          .rpc('create_default_store', { 
            p_company_id: companyId,
            p_store_name: 'Tienda Principal'
          })
          .then(({ data: storeData, error: storeError }) => {
            if (storeError || (storeData && storeData.error)) {
              console.error('Error creating default store on login:', storeError || storeData);
            } else {
              console.log('Default store created successfully on login:', storeData);
            }
          });
      } else {
          console.log(`Company has ${stores.length} stores: ${(stores as any[]).map((s: any) => (s as any).name).join(', ')}`);
      }
    } catch (error) {
      console.error('Error in ensureDefaultStore:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id, true); // Force refresh
    }
  };

  const markPasswordAsSetup = async () => {
    try {
      if (!user?.id) return;
      
      // Actualizar metadata del usuario para marcar que ya configuró su contraseña
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

      // Actualizar estado local
      setRequiresPasswordSetup(false);
      
      // Actualizar el usuario local
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

  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    let isInitialized = false;

    const initializeAuth = async () => {
      try {
        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted && !isInitialized) {
            console.warn('Auth initialization timeout - forcing loading to false');
            setLoading(false);
          }
        }, 15000); // Increased to 15 seconds

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if we have cached data first
          const hasCachedProfile = profileCacheRef.current.has(session.user.id);
          if (!hasCachedProfile) {
          await fetchUserProfile(session.user.id);
          } else {
            console.log('Using cached profile on initialization');
            const cached = profileCacheRef.current.get(session.user.id);
            if (cached) {
              setUserProfile(cached.profile);
              setCompany(cached.company);
            }
          }
          // Start session keep-alive for authenticated users
          sessionKeepAlive.start();
        } else {
          setLoading(false);
          // Stop keep-alive if no session
          sessionKeepAlive.stop();
        }
        
        isInitialized = true;
        // Clear timeout if we reach here successfully
        if (timeoutId) clearTimeout(timeoutId);
      } catch (error) {
        console.error('Error in initializeAuth:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('Auth state change:', event, session?.user?.id);
        
        // Skip processing for certain events that don't require state changes
        if (['TOKEN_REFRESHED', 'USER_UPDATED', 'MFA_CHALLENGE_VERIFIED', 'SIGNED_OUT', 'PASSWORD_RECOVERY'].includes(event) && session?.user?.id === user?.id) {
          console.log(`${event} for same user, skipping profile fetch`);
          return;
        }
        
        // Handle token refresh failures - but don't clear state immediately
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.warn('Token refresh failed - attempting manual refresh');
          try {
            const { data: { session: manualSession }, error } = await supabase.auth.refreshSession();
            if (manualSession) {
              console.log('Manual session refresh successful');
              setSession(manualSession);
              return;
            }
          } catch (error) {
            console.error('Manual session refresh failed:', error);
          }
          
          // Only clear state if manual refresh also fails
          console.warn('All refresh attempts failed - clearing auth state');
          setSession(null);
          setUser(null);
          setUserProfile(null);
          setCompany(null);
          setLoading(false);
          return;
        }
        
        // Only update session and user if they actually changed
        setSession(prevSession => {
          if (prevSession?.access_token !== session?.access_token) {
            return session;
          }
          return prevSession;
        });
        
        setUser(prevUser => {
          if (prevUser?.id !== session?.user?.id) {
            // Clear cache when user changes
            if (prevUser?.id) {
              profileCacheRef.current.delete(prevUser.id);
            }
            return session?.user ?? null;
          }
          return prevUser;
        });
        
        // Skip profile fetch if we already have the profile for this user
        if (session?.user?.id === userProfile?.auth_user_id && userProfile && company) {
          console.log('Profile already loaded for user, skipping fetch');
          return;
        }
        
        // Skip profile fetch for certain events that don't require profile updates
        if (event === 'TOKEN_REFRESHED' && session?.user?.id === userProfile?.auth_user_id) {
          console.log('Token refreshed for same user, skipping profile fetch');
          return;
        }
        
        // Skip profile fetch for events that don't require profile updates
        if (['TOKEN_REFRESHED', 'USER_UPDATED', 'MFA_CHALLENGE_VERIFIED', 'SIGNED_OUT', 'PASSWORD_RECOVERY'].includes(event) && session?.user?.id === userProfile?.auth_user_id) {
          console.log(`Event ${event} for same user, skipping profile fetch`);
          return;
        }
        
        if (session?.user && event === 'SIGNED_IN') {
          // Only show loading for initial sign-in, not for token refresh or other events
          if (!isInitialized) {
          setLoading(true);
          }
          
          // Only fetch profile if we don't have it cached or if it's a new user
          const hasCachedProfile = profileCacheRef.current.has(session.user.id);
          if (!hasCachedProfile || !userProfile) {
          try {
            await fetchUserProfile(session.user.id);
          } catch (error) {
            console.error('Error fetching profile on auth change:', error);
              if (mounted && !isInitialized) setLoading(false);
            }
          } else {
            console.log('Using cached profile, skipping fetch');
            if (mounted && !isInitialized) setLoading(false);
          }
        } else if (session?.user && event === 'TOKEN_REFRESHED') {
          // For token refresh, only update session if needed, don't fetch profile
          console.log('Token refreshed, updating session only');
        } else if (!session) {
          setUserProfile(null);
          setCompany(null);
          setLoading(false);
          // Stop keep-alive when session ends
          sessionKeepAlive.stop();
        } else if (event === 'USER_UPDATED') {
          // Skip profile fetch for user updates that don't affect profile
          console.log('User updated, skipping profile fetch');
        } else if (event === 'MFA_CHALLENGE_VERIFIED') {
          // Skip profile fetch for MFA events
          console.log('MFA verified, skipping profile fetch');
        } else if (event === 'SIGNED_OUT') {
          // Skip profile fetch for sign out events
          console.log('User signed out, skipping profile fetch');
        } else if (event === 'PASSWORD_RECOVERY') {
          // Skip profile fetch for password recovery events
          console.log('Password recovery initiated, skipping profile fetch');
        } else if (event === 'MFA_CHALLENGE_VERIFIED') {
          // Skip profile fetch for MFA events
          console.log('MFA verified, skipping profile fetch');
        }
      }
    );

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    // Si hay error en autenticación, retornar el error
    if (error) {
      return { error };
    }
    
    // Si la autenticación fue exitosa, verificar si el usuario está activo
    if (data?.user) {
      try {
        // Buscar el perfil del usuario para verificar si está activo
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('active, email')
          .eq('email', email)
          .single();
        
        if (profileError) {
          console.error('Error checking user profile:', profileError);
          // Si no se puede verificar, permitir acceso (no bloquear por error de consulta)
          return { error: null };
        }
        
        // Si el usuario no está activo, cerrar sesión y mostrar error
        if (profileData && !profileData.active) {
          // Cerrar sesión inmediatamente
          await supabase.auth.signOut();
          return { 
            error: { 
              message: 'Cuenta Deshabilitada. Contacta al administrador para más información.' 
            } 
          };
        }
      } catch (error) {
        console.error('Error verifying user active status:', error);
        // Si hay error verificando, permitir acceso (no bloquear por error técnico)
      }
    }
    
    return { error: null };
  };

  const signUp = async (email: string, password: string, companyName: string, userName: string) => {
    try {
      console.log('Starting registration process...');
      
      // First, create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthRedirectUrl()
        }
      });

      console.log('Auth signup result:', { authData, authError });

      if (authError) {
        console.error('Auth error:', authError);
        return { error: authError };
      }

      if (!authData.user) {
        console.error('No user returned from auth signup');
        return { error: { message: 'Failed to create user account' } };
      }

      // Wait a moment for the user to be properly created
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('Creating company...');
      // Create company using service role bypass
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: companyName,
          plan: 'basic',
          settings: {}
        })
        .select()
        .single();

      console.log('Company creation result:', { companyData, companyError });

      if (companyError) {
        console.error('Company creation error:', companyError);
        return { error: companyError };
      }

      console.log('Creating user profile...');
      // Create user profile
      const { data: userData, error: profileError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authData.user.id,
          company_id: companyData.id,
          name: userName,
          email: email,
          role: 'admin',
          active: true
        })
        .select()
        .single();

      console.log('User profile creation result:', { userData, profileError });

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { error: profileError };
      }

      // Wait for user profile to be committed and refresh auth state
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Skip store creation during registration - will be created on first login
      console.log('Registration completed - store will be created on first login');

      console.log('Registration completed successfully');
      return { error: null };
    } catch (error) {
      console.error('Registration error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('Signing out user...');
      
      // Stop session keep-alive before signing out
      sessionKeepAlive.stop();
      
      // Clear cache
      profileCacheRef.current.clear();
      
      // Clear local state first
      setUserProfile(null);
      setCompany(null);
      setUser(null);
      setSession(null);
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during sign out:', error);
        // Even if there's an error, we've cleared local state
      } else {
        console.log('Sign out successful');
      }

    } catch (error) {
      console.error('Unexpected error during sign out:', error);
      // Clear state anyway and redirect
      setUserProfile(null);
      setCompany(null);
      setUser(null);
      setSession(null);
    }
  };

  const value = {
    user,
    userProfile,
    company,
    session,
    loading,
    requiresPasswordSetup,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    markPasswordAsSetup,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
