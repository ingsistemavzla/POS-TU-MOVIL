import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { blockAuthForMaintenance, isMaintenanceModeActive } from '@/config/maintenance';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const finalize = async () => {
      try {
        if (isMaintenanceModeActive()) {
          const block = await blockAuthForMaintenance();
          if (block.blocked) {
            await supabase.auth.signOut();
            if (mounted) {
              navigate('/?maintenance=1', { replace: true });
            }
            return;
          }
        }
        // Force a session fetch so tokens in URL are processed
        await supabase.auth.getSession();
      } catch (e) {
        // ignore
      } finally {
        if (mounted) {
          navigate('/', { replace: true });
        }
      }
    };

    finalize();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Verificando enlace de acceso...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
