import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getLegacyMinimumLoadingMs,
  getPerformanceExperienceMode,
  shouldApplyLegacyPresentation,
  type PerformanceExperienceMode,
  type PresentationReason,
} from '@/config/performanceExperience';

export type DataReadyStatus = 'success' | 'error' | 'abort';

export type MinimumLoadingPresentationApi = {
  /** true → la UI debe mantener skeleton/splash (solo LEGACY + razón aplicable). */
  showPresentation: boolean;
  beginPresentation: (reason: PresentationReason) => void;
  markDataReady: (status: DataReadyStatus) => void;
};

type GateSnapshot = {
  mode: PerformanceExperienceMode;
  reasonApplies: boolean;
  dataReady: boolean;
  dataStatus: DataReadyStatus | null;
  windowElapsed: boolean;
};

/**
 * Pure: ¿debe mostrarse el gate visual?
 * - OPTIMIZED → nunca
 * - error/abort → liberar inmediato
 * - success → esperar ventana mínima
 */
export function computeShowPresentation(s: GateSnapshot): boolean {
  if (s.mode !== 'LEGACY_SIMULATION') return false;
  if (!s.reasonApplies) return false;
  if (s.dataStatus === 'error' || s.dataStatus === 'abort') return false;
  if (!s.dataReady) return true;
  return !s.windowElapsed;
}

type TimerHandle = ReturnType<typeof setTimeout>;

/** Controlador puro (testeable) usado por el hook. */
export class MinimumLoadingPresentationController {
  private gen = 0;
  private timer: TimerHandle | null = null;
  private reasonApplies = false;
  private dataReady = false;
  private dataStatus: DataReadyStatus | null = null;
  private windowElapsed = false;
  private disposed = false;
  private show = false;

  constructor(
    private readonly mode: PerformanceExperienceMode,
    private readonly minMs: number,
    private readonly onChange: (show: boolean) => void,
    private readonly schedule: (fn: () => void, ms: number) => TimerHandle = (fn, ms) =>
      setTimeout(fn, ms),
    private readonly cancel: (h: TimerHandle) => void = (h) => clearTimeout(h)
  ) {}

  get showPresentation(): boolean {
    return this.show;
  }

  private emit() {
    const next = computeShowPresentation({
      mode: this.mode,
      reasonApplies: this.reasonApplies,
      dataReady: this.dataReady,
      dataStatus: this.dataStatus,
      windowElapsed: this.windowElapsed,
    });
    this.show = next;
    if (!this.disposed) this.onChange(next);
  }

  private clearTimer() {
    if (this.timer != null) {
      this.cancel(this.timer);
      this.timer = null;
    }
  }

  beginPresentation(reason: PresentationReason) {
    if (this.disposed) return;

    if (this.mode !== 'LEGACY_SIMULATION') {
      this.reasonApplies = false;
      this.dataReady = false;
      this.dataStatus = null;
      this.windowElapsed = false;
      this.clearTimer();
      this.emit();
      return;
    }

    // Razones no aplicables (background/manual/filter): no reinician ni cancelan un gate activo.
    if (!shouldApplyLegacyPresentation(reason)) {
      return;
    }

    this.gen += 1;
    const gen = this.gen;
    this.clearTimer();

    this.reasonApplies = true;
    this.dataReady = false;
    this.dataStatus = null;
    this.windowElapsed = false;

    this.emit();
    this.timer = this.schedule(() => {
      if (this.disposed || gen !== this.gen) return;
      this.windowElapsed = true;
      this.emit();
    }, this.minMs);
  }

  markDataReady(status: DataReadyStatus) {
    if (this.disposed) return;
    if (this.mode !== 'LEGACY_SIMULATION') return;
    if (!this.reasonApplies) return;

    this.dataReady = true;
    this.dataStatus = status;

    if (status === 'error' || status === 'abort') {
      this.clearTimer();
      this.windowElapsed = true;
      this.emit();
      return;
    }

    this.emit();
  }

  dispose() {
    this.disposed = true;
    this.clearTimer();
    this.gen += 1;
  }
}

/**
 * Gate presentacional desacoplado del fetch.
 * En OPTIMIZED es no-op (showPresentation siempre false).
 */
export function useMinimumLoadingPresentation(): MinimumLoadingPresentationApi {
  const mode = getPerformanceExperienceMode();
  const minMs = getLegacyMinimumLoadingMs();
  const [showPresentation, setShowPresentation] = useState(false);
  const controllerRef = useRef<MinimumLoadingPresentationController | null>(null);

  useEffect(() => {
    const controller = new MinimumLoadingPresentationController(mode, minMs, (show) => {
      setShowPresentation(show);
    });
    controllerRef.current = controller;
    setShowPresentation(false);
    return () => {
      controller.dispose();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [mode, minMs]);

  const beginPresentation = useCallback((reason: PresentationReason) => {
    controllerRef.current?.beginPresentation(reason);
  }, []);

  const markDataReady = useCallback((status: DataReadyStatus) => {
    controllerRef.current?.markDataReady(status);
  }, []);

  return {
    showPresentation,
    beginPresentation,
    markDataReady,
  };
}
