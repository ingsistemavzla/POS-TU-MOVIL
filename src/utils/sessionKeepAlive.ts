// Session keep-alive utility for POS system
// Prevents session expiration during long POS usage sessions

import { supabase } from '@/integrations/supabase/client';

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
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (session) {
          // Only refresh if there's been recent activity (within last 2 hours)
          const timeSinceActivity = Date.now() - this.lastActivity;
          const twoHours = 2 * 60 * 60 * 1000;
          
          if (timeSinceActivity < twoHours) {
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.warn('Session refresh failed:', refreshError);
            } else {
              console.log('Session refreshed automatically');
            }
          }
        }
      } catch (error) {
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
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Manual session refresh failed:', error);
        return false;
      }
      console.log('Session refreshed manually');
      this.lastActivity = Date.now();
      return true;
    } catch (error) {
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
