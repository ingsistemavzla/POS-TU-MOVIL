/**
 * Modo mantenimiento (solo frontend).
 * Activar: window.posMaintenance.enable()
 * Probar en local: http://localhost:8080/?maintenance=1
 */

export const MAINTENANCE_STORAGE_KEY = 'pos_maintenance_mode';
export const MAINTENANCE_LOGIN_MESSAGE = 'Failed to fetch';

/**
 * Mantenimiento forzado en el build desplegado.
 * COMMIT DE DESACTIVACIÓN: poner en `false` → commit → push → redeploy.
 * Guía: DESACTIVAR_MANTENIMIENTO.md
 */
export const MAINTENANCE_FORCED_FROM_BUILD = true;

export type MaintenanceLoginErrorStyle =
  | 'failed_to_fetch'
  | 'auth_timeout'
  | 'service_unavailable';

export interface MaintenanceSettings {
  enabled: boolean;
  userMessage: string;
  loginErrorStyle: MaintenanceLoginErrorStyle;
  loginDelayMs: number;
  bypassEmails: string[];
}

const listeners = new Set<() => void>();
type SessionEvictHandler = () => void | Promise<void>;
let sessionEvictHandler: SessionEvictHandler | null = null;

/** Estado en memoria (no se pierde con HMR ni lecturas tardías de localStorage) */
let maintenanceActiveMemory = false;
/** Permite apagar con disable() aunque VITE_MAINTENANCE_MODE=true */
let maintenanceUserDisabled = false;

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

function parseBool(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function parseEmailList(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function readEnvMaintenance(): boolean {
  return parseBool(import.meta.env.VITE_MAINTENANCE_MODE);
}

function readStorageMaintenance(): boolean {
  if (typeof window === 'undefined') return false;
  return parseBool(localStorage.getItem(MAINTENANCE_STORAGE_KEY) ?? undefined);
}

function persistMaintenanceFlag(active: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MAINTENANCE_STORAGE_KEY, active ? 'true' : 'false');
}

function syncMaintenanceFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const q = params.get('maintenance');
  if (q === '1' || q === 'true' || q === 'on') {
    maintenanceActiveMemory = true;
    persistMaintenanceFlag(true);
    return true;
  }
  return false;
}

function bootstrapMaintenance(): void {
  if (typeof window === 'undefined') return;
  const stored = localStorage.getItem(MAINTENANCE_STORAGE_KEY);
  if (stored === 'false') {
    maintenanceUserDisabled = true;
  }
  if (syncMaintenanceFromUrl()) {
    maintenanceUserDisabled = false;
    notifyListeners();
    return;
  }
  if (!maintenanceUserDisabled) {
    maintenanceActiveMemory = readStorageMaintenance() || readEnvMaintenance();
    if (maintenanceActiveMemory) {
      persistMaintenanceFlag(true);
    }
  }
}

export function registerMaintenanceSessionEvict(handler: SessionEvictHandler | null): void {
  sessionEvictHandler = handler;
}

async function evictActiveSessions(): Promise<void> {
  if (!sessionEvictHandler) {
    console.warn('[Maintenance] AuthProvider aún no registró cierre de sesión.');
    return;
  }
  try {
    await sessionEvictHandler();
  } catch (e) {
    console.error('[Maintenance] Error al cerrar sesiones:', e);
  }
}

/** Configuración efectiva */
export function getMaintenanceSettings(): MaintenanceSettings {
  return {
    enabled: isMaintenanceModeActive(),
    userMessage: MAINTENANCE_LOGIN_MESSAGE,
    loginErrorStyle:
      (import.meta.env.VITE_MAINTENANCE_LOGIN_ERROR as MaintenanceLoginErrorStyle) ||
      'failed_to_fetch',
    loginDelayMs: Number(import.meta.env.VITE_MAINTENANCE_LOGIN_DELAY_MS || 1500),
    bypassEmails: parseEmailList(import.meta.env.VITE_MAINTENANCE_BYPASS_EMAILS),
  };
}

export function isMaintenanceModeActive(): boolean {
  if (maintenanceUserDisabled) return false;
  if (MAINTENANCE_FORCED_FROM_BUILD) return true;
  if (readEnvMaintenance()) return true;
  if (maintenanceActiveMemory) return true;
  if (typeof window !== 'undefined' && readStorageMaintenance()) {
    maintenanceActiveMemory = true;
    return true;
  }
  return false;
}

export async function enableMaintenanceMode(): Promise<void> {
  if (typeof window === 'undefined') return;
  maintenanceUserDisabled = false;
  maintenanceActiveMemory = true;
  persistMaintenanceFlag(true);
  console.warn('[Maintenance] ACTIVADO — cerrando sesiones y bloqueando login.');
  await evictActiveSessions();
  notifyListeners();
}

export function disableMaintenanceMode(): void {
  if (typeof window === 'undefined') return;
  maintenanceUserDisabled = true;
  maintenanceActiveMemory = false;
  persistMaintenanceFlag(false);
  console.info('[Maintenance] DESACTIVADO.');
  notifyListeners();
}

export function clearMaintenanceRuntimeOverride(): void {
  if (typeof window === 'undefined') return;
  maintenanceActiveMemory = false;
  localStorage.removeItem(MAINTENANCE_STORAGE_KEY);
  notifyListeners();
}

export async function toggleMaintenanceMode(): Promise<boolean> {
  if (isMaintenanceModeActive()) {
    disableMaintenanceMode();
    return false;
  }
  await enableMaintenanceMode();
  return true;
}

export function subscribeMaintenanceMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function shouldBlockNewAuth(): boolean {
  return isMaintenanceModeActive();
}

function buildMaintenanceAuthError() {
  return {
    name: 'TypeError',
    message: MAINTENANCE_LOGIN_MESSAGE,
    status: 0,
  };
}

export async function blockAuthForMaintenance(): Promise<
  { blocked: true; error: ReturnType<typeof buildMaintenanceAuthError> } | { blocked: false }
> {
  if (!shouldBlockNewAuth()) {
    return { blocked: false };
  }

  const { loginDelayMs } = getMaintenanceSettings();
  if (loginDelayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, loginDelayMs));
  }

  return { blocked: true, error: buildMaintenanceAuthError() };
}

declare global {
  interface Window {
    posMaintenance?: {
      enable: () => Promise<void>;
      disable: () => void;
      toggle: () => Promise<boolean>;
      status: () => boolean;
      settings: () => MaintenanceSettings;
      clearOverride: () => void;
    };
  }
}

bootstrapMaintenance();

if (typeof window !== 'undefined') {
  window.posMaintenance = {
    enable: enableMaintenanceMode,
    disable: disableMaintenanceMode,
    toggle: toggleMaintenanceMode,
    status: isMaintenanceModeActive,
    settings: getMaintenanceSettings,
    clearOverride: clearMaintenanceRuntimeOverride,
  };
}
