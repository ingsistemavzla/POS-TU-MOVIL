/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_BUILD_ID?: string;
  readonly VITE_MAINTENANCE_MODE?: string;
  readonly VITE_MAINTENANCE_MESSAGE?: string;
  readonly VITE_MAINTENANCE_BYPASS_EMAILS?: string;
  readonly VITE_MAINTENANCE_LOGIN_ERROR?: 'failed_to_fetch' | 'auth_timeout' | 'service_unavailable';
  readonly VITE_MAINTENANCE_LOGIN_DELAY_MS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
