// Session keep-alive utility for POS system
// Prevents session expiration during long POS usage sessions

import { supabase } from '@/integrations/supabase/client';
import { beginAuthTimedOp, endAuthTimedOp } from '@/utils/authLoadDiagnostics';

class SessionKeepAlive {
  private intervalId: NodeJS.Timeout | null = null;
  private isActive = false;
  private lastActivity = Date.now();
  
  // Start the keep-alive mechanism
  start() {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('Session keep-alive started');
    
    // Refresh session every 15 minutes
    this.intervalId = setInterval(async () => {
      const keepAliveT0 = beginAuthTimedOp('AUTH_KEEPALIVE_START', {
        SOURCE: 'sessionKeepAlive.interval15m',
      });
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
          // Only refresh if there's been recent activity (within last 2 hours)
          const timeSinceActivity = Date.now() - this.lastActivity;
          const twoHours = 2 * 60 * 60 * 1000;
          
          if (timeSinceActivity < twoHours) {
            const refreshT0 = beginAuthTimedOp('AUTH_REFRESH_EXPLICIT_START', {
              SOURCE: 'sessionKeepAlive.refreshSession',
            });
            const { error: refreshError } = await supabase.auth.refreshSession();
            endAuthTimedOp('AUTH_REFRESH_EXPLICIT_END', refreshT0, {
              SOURCE: 'sessionKeepAlive.refreshSession',
              STATUS: refreshError ? 'error' : 'success',
              SESSION_PRESENT: true,
              USER_ID_PRESENT: !!session.user?.id,
            });
            if (refreshError) {
              console.warn('Session refresh failed:', refreshError);
            } else {
              console.log('Session refreshed automatically');
            }
            endAuthTimedOp('AUTH_KEEPALIVE_END', keepAliveT0, {
              SOURCE: 'sessionKeepAlive.interval15m',
              STATUS: refreshError ? 'refresh_error' : 'refreshed',
              SESSION_PRESENT: true,
              USER_ID_PRESENT: !!session.user?.id,
            });
            return;
          }
        }
        endAuthTimedOp('AUTH_KEEPALIVE_END', keepAliveT0, {
          SOURCE: 'sessionKeepAlive.interval15m',
          STATUS: error ? 'get_session_error' : session ? 'skipped_inactive' : 'no_session',
          SESSION_PRESENT: !!session,
          USER_ID_PRESENT: !!session?.user?.id,
        });
      } catch (error) {
        endAuthTimedOp('AUTH_KEEPALIVE_END', keepAliveT0, {
          SOURCE: 'sessionKeepAlive.interval15m',
          STATUS: 'error',
          SESSION_PRESENT: false,
          USER_ID_PRESENT: false,
        });
        console.error('Error in session keep-alive:', error);
      }
    }, 15 * 60 * 1000); // 15 minutes
    
    // Track user activity
    this.setupActivityTracking();
  }
  
  // Stop the keep-alive mechanism
  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    console.log('Session keep-alive stopped');
  }
  
  // Track user activity to determine if session should be kept alive
  private setupActivityTracking() {
    const updateActivity = () => {
      this.lastActivity = Date.now();
    };
    
    // Track various user interactions
    document.addEventListener('click', updateActivity);
    document.addEventListener('keypress', updateActivity);
    document.addEventListener('scroll', updateActivity);
    document.addEventListener('mousemove', updateActivity);
    
    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        updateActivity();
      }
    });
  }
  
  // Manual session refresh
  async refreshNow() {
    const refreshT0 = beginAuthTimedOp('AUTH_REFRESH_EXPLICIT_START', {
      SOURCE: 'sessionKeepAlive.refreshNow',
    });
    try {
      const { data, error } = await supabase.auth.refreshSession();
      endAuthTimedOp('AUTH_REFRESH_EXPLICIT_END', refreshT0, {
        SOURCE: 'sessionKeepAlive.refreshNow',
        STATUS: error ? 'error' : 'success',
        SESSION_PRESENT: !!data?.session,
        USER_ID_PRESENT: !!data?.session?.user?.id,
      });
      if (error) {
        console.error('Manual session refresh failed:', error);
        return false;
      }
      console.log('Session refreshed manually');
      this.lastActivity = Date.now();
      return true;
    } catch (error) {
      endAuthTimedOp('AUTH_REFRESH_EXPLICIT_END', refreshT0, {
        SOURCE: 'sessionKeepAlive.refreshNow',
        STATUS: 'error',
        SESSION_PRESENT: false,
        USER_ID_PRESENT: false,
      });
      console.error('Error in manual session refresh:', error);
      return false;
    }
  }
  
  // Get session status
  async getSessionStatus() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      return {
        hasSession: !!session,
        expiresAt: session?.expires_at,
        timeUntilExpiry: session?.expires_at ? 
          new Date(session.expires_at * 1000).getTime() - Date.now() : null,
        error
      };
    } catch (error) {
      return {
        hasSession: false,
        expiresAt: null,
        timeUntilExpiry: null,
        error
      };
    }
  }
}

// Export singleton instance
export const sessionKeepAlive = new SessionKeepAlive();

// Auto-start when imported (for POS usage)
if (typeof window !== 'undefined') {
  // Start keep-alive after a short delay to ensure auth is initialized
  setTimeout(() => {
    sessionKeepAlive.start();
  }, 5000);
}
