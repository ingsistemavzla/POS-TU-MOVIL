/**
 * =============================================================================
 * PROTOCOLO DE MANTENIMIENTO (solo frontend) — APAGADO por defecto
 * =============================================================================
 * ACTIVAR (bote sesiones + bloquea login):
 *   MAINTENANCE_PROTOCOL_ENABLED = true
 *   MAINTENANCE_FORCED_FROM_BUILD = true
 *   → commit + push (AppRouterShell ya está cableado de forma permanente)
 *
 * DESACTIVAR (login e interfaz vuelven a la normalidad):
 *   MAINTENANCE_PROTOCOL_ENABLED = false
 *   MAINTENANCE_FORCED_FROM_BUILD = false
 *   → commit + push
 *   Al arrancar con protocolo OFF se limpia localStorage y no queda bloqueo.
 *
 * Ver ACTIVAR_MANTENIMIENTO.md / DESACTIVAR_MANTENIMIENTO.md
 * =============================================================================
 */

/** Interruptor maestro: false = el sistema opera normal (login, transacciones, rutas). */
export const MAINTENANCE_PROTOCOL_ENABLED = true;

/**
 * Solo aplica si MAINTENANCE_PROTOCOL_ENABLED es true.
 * true = ON en todos los clientes tras el deploy (no se puede apagar solo con localStorage).
 */
export const MAINTENANCE_FORCED_FROM_BUILD = true;

export const MAINTENANCE_STORAGE_KEY = 'pos_maintenance_mode';
export const MAINTENANCE_LOGIN_MESSAGE = 'Failed to fetch';

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

let maintenanceActiveMemory = false;
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
  if (!MAINTENANCE_PROTOCOL_ENABLED) return false;
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
  // Protocolo OFF → limpiar residuos y nunca bloquear (restauración total).
  if (!MAINTENANCE_PROTOCOL_ENABLED) {
    localStorage.removeItem(MAINTENANCE_STORAGE_KEY);
    maintenanceActiveMemory = false;
    maintenanceUserDisabled = false;
    notifyListeners();
    return;
  }
  // Deploy forzado ON: ignorar overrides locales viejos.
  if (MAINTENANCE_FORCED_FROM_BUILD) {
    maintenanceUserDisabled = false;
    maintenanceActiveMemory = true;
    persistMaintenanceFlag(true);
    notifyListeners();
    return;
  }
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
  if (!MAINTENANCE_PROTOCOL_ENABLED) return;
  sessionEvictHandler = handler;
}

async function evictActiveSessions(): Promise<void> {
  if (!MAINTENANCE_PROTOCOL_ENABLED || !sessionEvictHandler) return;
  try {
    await sessionEvictHandler();
  } catch (e) {
    console.error('[Maintenance] Error al cerrar sesiones:', e);
  }
}

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
  // Maestro OFF = nunca bloquea (garantiza login + UI normal tras desactivar en código).
  if (!MAINTENANCE_PROTOCOL_ENABLED) return false;
  // Deploy forzado: bota a todos; no se puede saltar con localStorage.
  if (MAINTENANCE_FORCED_FROM_BUILD) return true;
  if (maintenanceUserDisabled) return false;
  if (readEnvMaintenance()) return true;
  if (maintenanceActiveMemory) return true;
  if (typeof window !== 'undefined' && readStorageMaintenance()) {
    maintenanceActiveMemory = true;
    return true;
  }
  return false;
}

export async function enableMaintenanceMode(): Promise<void> {
  if (!MAINTENANCE_PROTOCOL_ENABLED || typeof window === 'undefined') return;
  maintenanceUserDisabled = false;
  maintenanceActiveMemory = true;
  persistMaintenanceFlag(true);
  console.warn('[Maintenance] ACTIVADO — cerrando sesiones y bloqueando login.');
  notifyListeners();
  await evictActiveSessions();
}

/**
 * Apaga mantenimiento en runtime (consola).
 * Si MAINTENANCE_FORCED_FROM_BUILD=true, no tiene efecto hasta redesplegar con FORCED=false.
 * Con protocolo OFF en el build, esta función solo limpia residuos locales.
 */
export function disableMaintenanceMode(): void {
  if (typeof window === 'undefined') return;
  if (MAINTENANCE_PROTOCOL_ENABLED && MAINTENANCE_FORCED_FROM_BUILD) {
    console.warn(
      '[Maintenance] FORCED_FROM_BUILD=true — disable() no apaga el bloqueo. Redesplegar con ambos flags en false.',
    );
    return;
  }
  maintenanceUserDisabled = true;
  maintenanceActiveMemory = false;
  persistMaintenanceFlag(false);
  console.info('[Maintenance] DESACTIVADO — login e interfaz vuelven a la normalidad.');
  notifyListeners();
}

export function clearMaintenanceRuntimeOverride(): void {
  if (typeof window === 'undefined') return;
  if (MAINTENANCE_PROTOCOL_ENABLED && MAINTENANCE_FORCED_FROM_BUILD) {
    console.warn('[Maintenance] clearOverride ignorado: FORCED_FROM_BUILD=true.');
    return;
  }
  maintenanceUserDisabled = false;
  maintenanceActiveMemory = false;
  localStorage.removeItem(MAINTENANCE_STORAGE_KEY);
  notifyListeners();
}

export async function toggleMaintenanceMode(): Promise<boolean> {
  if (!MAINTENANCE_PROTOCOL_ENABLED) return false;
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
