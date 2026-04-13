/** Zona usada en Margarita / toda Venezuela (oficial). */
export const VENEZUELA_TIMEZONE = "America/Caracas";

const baseOpts = { timeZone: VENEZUELA_TIMEZONE } as const;

/**
 * Fecha y hora para mostrar ventas/facturas (misma lógica que el reloj del navbar).
 * No usa la zona local del navegador.
 */
export function formatVenezuelaDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("es-VE", {
    ...baseOpts,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Partes separadas para PDFs u otros layouts. */
export function formatVenezuelaDateAndTime(iso: string): { dateStr: string; timeStr: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { dateStr: "", timeStr: "" };
  }
  const dateStr = d.toLocaleDateString("es-VE", {
    ...baseOpts,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = d.toLocaleTimeString("es-VE", {
    ...baseOpts,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { dateStr, timeStr };
}
