import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSaleAutoPrintScheduler } from '@/utils/saleAutoPrintScheduler';

describe('createSaleAutoPrintScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('SCENARIO 1: parent-style cancel+reschedule does not lose the print attempt', () => {
    const attemptPrint = vi.fn();
    const onAttemptFinished = vi.fn();
    const scheduler = createSaleAutoPrintScheduler({
      delayMs: 2000,
      attemptPrint,
      onAttemptFinished,
    });

    scheduler.schedule('FAC-1');
    // Simula cleanup de effect (re-render): cancela pendiente sin marcar completed
    scheduler.cancelPending();
    // Effect vuelve a armar (mismo invoice, aún no completed)
    scheduler.schedule('FAC-1');

    expect(attemptPrint).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);

    expect(attemptPrint).toHaveBeenCalledTimes(1);
    expect(onAttemptFinished).toHaveBeenCalledTimes(1);
    expect(onAttemptFinished).toHaveBeenCalledWith('FAC-1');
    expect(scheduler.getCompletedInvoice()).toBe('FAC-1');
    scheduler.dispose();
  });

  it('SCENARIO 2: exception in attemptPrint still finishes UI callback', () => {
    const onAttemptFinished = vi.fn();
    const scheduler = createSaleAutoPrintScheduler({
      delayMs: 100,
      attemptPrint: () => {
        throw new Error('print boom');
      },
      onAttemptFinished,
    });

    scheduler.schedule('FAC-2');
    vi.advanceTimersByTime(100);

    expect(onAttemptFinished).toHaveBeenCalledTimes(1);
    expect(scheduler.getCompletedInvoice()).toBe('FAC-2');
    scheduler.dispose();
  });

  it('SCENARIO 3: multiple schedule calls → auto-print at most once per invoice', () => {
    const attemptPrint = vi.fn();
    const onAttemptFinished = vi.fn();
    const scheduler = createSaleAutoPrintScheduler({
      delayMs: 500,
      attemptPrint,
      onAttemptFinished,
    });

    scheduler.schedule('FAC-3');
    scheduler.schedule('FAC-3');
    scheduler.schedule('FAC-3');
    vi.advanceTimersByTime(500);

    expect(attemptPrint).toHaveBeenCalledTimes(1);
    expect(onAttemptFinished).toHaveBeenCalledTimes(1);

    // Tras completed, schedule no vuelve a imprimir
    scheduler.schedule('FAC-3');
    vi.advanceTimersByTime(500);
    expect(attemptPrint).toHaveBeenCalledTimes(1);
    scheduler.dispose();
  });

  it('SCENARIO 4: new invoice allows a new auto-print cycle', () => {
    const attemptPrint = vi.fn();
    const onAttemptFinished = vi.fn();
    const scheduler = createSaleAutoPrintScheduler({
      delayMs: 200,
      attemptPrint,
      onAttemptFinished,
    });

    scheduler.schedule('FAC-A');
    vi.advanceTimersByTime(200);
    expect(attemptPrint).toHaveBeenCalledTimes(1);

    scheduler.schedule('FAC-B');
    vi.advanceTimersByTime(200);
    expect(attemptPrint).toHaveBeenCalledTimes(2);
    expect(onAttemptFinished).toHaveBeenLastCalledWith('FAC-B');
    scheduler.dispose();
  });

  it('SCENARIO 5: finish callback does not wait for afterprint (fires with timer only)', () => {
    const attemptPrint = vi.fn();
    const onAttemptFinished = vi.fn();
    const scheduler = createSaleAutoPrintScheduler({
      delayMs: 50,
      attemptPrint,
      onAttemptFinished,
    });

    scheduler.schedule('FAC-5');
    // Sin simular afterprint: solo el delay
    vi.advanceTimersByTime(50);
    expect(onAttemptFinished).toHaveBeenCalledTimes(1);
    scheduler.dispose();
  });
});
