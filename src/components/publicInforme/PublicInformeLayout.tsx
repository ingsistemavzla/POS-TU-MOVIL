import { Link } from 'react-router-dom';
import { FileText, ChevronLeft } from 'lucide-react';
import type { PublicInforme, InformeEstado } from '@/types/publicInforme';
import { informePath, INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const verdeVars = {
  ['--verde-primario' as string]: '#30D96B',
  ['--verde-oscuro' as string]: '#022601',
  ['--verde-secundario' as string]: '#64F23D',
} as React.CSSProperties;

function EstadoBadge({ estado }: { estado: InformeEstado }) {
  const map: Record<InformeEstado, { label: string; className: string }> = {
    aprobado: { label: 'Aprobado', className: 'bg-emerald-100 text-emerald-900 ring-emerald-200' },
    respaldo: { label: 'Respaldo', className: 'bg-blue-100 text-blue-900 ring-blue-200' },
    referencia: { label: 'Referencia', className: 'bg-slate-100 text-slate-800 ring-slate-200' },
    historico: { label: 'Histórico', className: 'bg-amber-100 text-amber-900 ring-amber-200' },
  };
  const c = map[estado];
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${c.className}`}>
      {c.label}
    </span>
  );
}

export function PublicInformeLayout({
  informe,
  children,
}: {
  informe: PublicInforme;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#F2F2F2] text-[#0D0D0D] pb-12" style={verdeVars}>
      <div className="mx-auto w-[92%] max-w-[1100px] mt-0">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <Link
            to={informePath(INFORMES_CATALOGO_SLUG)}
            className="inline-flex items-center gap-1 text-[var(--verde-oscuro)] hover:underline font-medium"
          >
            <ChevronLeft className="h-4 w-4" />
            Catálogo informes
          </Link>
          <span className="text-[#0D0D0D]/30">|</span>
          <span className="font-mono text-xs text-[#0D0D0D]/60">/informe/{informe.slug}</span>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
          <header className="relative overflow-hidden bg-[linear-gradient(135deg,var(--verde-primario)_0%,var(--verde-oscuro)_100%)] px-5 py-12 md:px-10 md:py-16 text-center text-white">
            <div className="absolute left-4 top-4 h-9 w-9 rounded-full bg-white shadow flex items-center justify-center">
              <img src="/logo.svg" alt="Logo" className="h-6 w-6 object-contain" />
            </div>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              <EstadoBadge estado={informe.estado} />
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25">
                <FileText className="h-3.5 w-3.5" />
                {informe.categoria}
              </span>
            </div>
            <h1 className="text-xl md:text-3xl font-bold mb-2">{informe.titulo}</h1>
            <p className="text-sm md:text-base text-white/90 max-w-2xl mx-auto">{informe.subtitulo}</p>
            <p className="mt-3 text-xs text-white/70">Fecha referencia: {informe.fecha}</p>
          </header>

          <div className="px-5 py-6 md:px-10 md:py-8 border-b border-[#0D0D0D]/8 bg-[#fafafa]">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs md:text-sm">
              {informe.meta.map((m) => (
                <div key={m.label} className="flex flex-col sm:flex-row sm:gap-2">
                  <dt className="font-semibold text-[var(--verde-oscuro)] shrink-0">{m.label}:</dt>
                  <dd className="font-mono text-[#0D0D0D]/80 break-all">{m.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="px-5 py-8 md:px-10 md:py-10 space-y-10">{children}</div>

          {informe.relacionados.length > 0 && (
            <footer className="px-5 py-6 md:px-10 border-t border-[#0D0D0D]/8 bg-[#fafafa]">
              <p className="text-sm font-semibold text-[var(--verde-oscuro)] mb-3">Informes relacionados</p>
              <div className="flex flex-wrap gap-2">
                {informe.relacionados.map((slug) => (
                  <Link
                    key={slug}
                    to={informePath(slug)}
                    className="rounded-lg border border-[var(--verde-primario)]/40 bg-white px-3 py-2 text-xs font-medium text-[var(--verde-oscuro)] hover:bg-[var(--verde-primario)]/10"
                  >
                    {slug}
                  </Link>
                ))}
              </div>
            </footer>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[#0D0D0D]/45">
          Public operational report · No authentication · Inventory System
        </p>
      </div>
    </div>
  );
}
