import { useAuth } from '@/contexts/AuthContext';

export const useAuthUser = () => {
  const { user, userProfile, company, loading } = useAuth();

  return {
    user,
    userProfile,
    company,
    loading,
    isAuthenticated: !!user && !!userProfile,
    isAdmin: userProfile?.role === 'admin',
    isManager: userProfile?.role === 'manager' || userProfile?.role === 'admin',
    isCashier: userProfile?.role === 'cashier',
  };
};
