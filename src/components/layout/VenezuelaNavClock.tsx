import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { VENEZUELA_TIMEZONE } from "@/utils/venezuelaTime";

/**
 * Reloj compacto para el navbar: hora según el reloj del sistema del usuario,
 * mostrada en zona Venezuela (no depende de la hora local del PC para el cálculo del huso).
 */
export function VenezuelaNavClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const timeStr = new Intl.DateTimeFormat("es-VE", {
    timeZone: VENEZUELA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);

  return (
    <div
      className="flex items-center gap-1 xs:gap-1.5 px-1.5 xs:px-2.5 py-0.5 xs:py-1 rounded-md bg-emerald-500/15 border border-emerald-400/45 shrink-0 shadow-sm shadow-emerald-900/20"
      title="Hora Venezuela (America/Caracas). Nueva Esparta — Margarita. Útil para ventanas de facturación; el instante es el del reloj de tu equipo convertido a esta zona."
    >
      <Clock className="w-3 h-3 xs:w-3.5 xs:h-3.5 text-emerald-300 flex-shrink-0 brightness-110" aria-hidden />
      <span className="tabular-nums text-[10px] xs:text-xs font-semibold tracking-tight text-white">
        {timeStr}
      </span>
      <span className="hidden sm:inline text-[10px] font-medium text-emerald-100/95 border-l border-emerald-400/55 pl-1.5 ml-0.5">
        Margarita
      </span>
    </div>
  );
}
