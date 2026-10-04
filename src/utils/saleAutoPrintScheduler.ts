/**
 * Programa un único intento de impresión automática por número de factura.
 * Pensado para el cierre de venta POS: la venta ya está persistida; print es secundario.
 *
 * Reglas:
 * - Misma factura: no rearma si el intento ya finalizó.
 * - cancel() del timer pendiente NO marca la factura como “hecha” → se puede reprogramar.
 * - attemptPrint puede lanzar: onAttemptFinished igual se llama (liberar UI).
 */

export type SaleAutoPrintScheduler = {
  /** Programa intento (idempotente si ya finalizó para esa factura). */
  schedule(invoiceNumber: string): void;
  /** Cancela timer pendiente sin marcar factura como hecha. */
  cancelPending(): void;
  /** Olvida factura y cancela pendiente (cierre de modal). */
  reset(): void;
  getPendingInvoice(): string | null;
  getCompletedInvoice(): string | null;
  dispose(): void;
};

export function createSaleAutoPrintScheduler(options: {
  delayMs?: number;
  attemptPrint: () => void;
  /** Siempre tras el intento (éxito o excepción). No implica impresión física confirmada. */
  onAttemptFinished: (invoiceNumber: string) => void;
  onSchedule?: (invoiceNumber: string) => void;
}): SaleAutoPrintScheduler {
  const delayMs = options.delayMs ?? 2000;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingInvoice: string | null = null;
  let completedInvoice: string | null = null;

  const clearTimer = () => {
    if (timer != null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return {
    schedule(invoiceNumber: string) {
      if (!invoiceNumber) return;
      if (completedInvoice === invoiceNumber) return;
      if (pendingInvoice === invoiceNumber && timer != null) return;

      clearTimer();
      pendingInvoice = invoiceNumber;
      options.onSchedule?.(invoiceNumber);

      timer = setTimeout(() => {
        timer = null;
        const invoice = pendingInvoice;
        pendingInvoice = null;
        if (!invoice) return;
        try {
          options.attemptPrint();
        } catch {
          // La venta ya está persistida; el error de print no debe bloquear UI.
        } finally {
          completedInvoice = invoice;
          options.onAttemptFinished(invoice);
        }
      }, delayMs);
    },

    cancelPending() {
      clearTimer();
      pendingInvoice = null;
    },

    reset() {
      clearTimer();
      pendingInvoice = null;
      completedInvoice = null;
    },

    getPendingInvoice: () => pendingInvoice,
    getCompletedInvoice: () => completedInvoice,

    dispose() {
      clearTimer();
      pendingInvoice = null;
      completedInvoice = null;
    },
  };
}
