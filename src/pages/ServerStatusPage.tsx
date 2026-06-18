import React, { useMemo, useState } from 'react';
import { INVENTORY_SYSTEM_NAME } from '@/constants/inventorySystemBranding';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Copy,
  ExternalLink,
  Info,
  Wrench,
  Search,
  ClipboardList,
  BarChart3,
  ShieldCheck,
  Server,
} from 'lucide-react';

const PROJECT_REF = 'swsqmsbyikznalrvydny';
const SUPABASE_PROJECT_URL = `https://${PROJECT_REF}.supabase.co`;

type HealthState = 'healthy' | 'unhealthy' | 'unknown';

function StatusPill({ state }: { state: HealthState }) {
  const cfg = useMemo(() => {
    switch (state) {
      case 'healthy':
        return {
          label: 'Healthy',
          icon: <CheckCircle2 className="h-4 w-4" />,
          className: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200',
        };
      case 'unhealthy':
        return {
          label: 'Unhealthy',
          icon: <AlertTriangle className="h-4 w-4" />,
          className: 'bg-rose-50 text-rose-800 ring-1 ring-rose-200',
        };
      default:
        return {
          label: 'Unknown',
          icon: <CircleDot className="h-4 w-4" />,
          className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
        };
    }
  }, [state]);

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${cfg.className}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <button
      type="button"
      onClick={onCopy}
      className="inline-flex items-center gap-2 rounded-lg border border-white/70 bg-white/80 px-3 py-2 text-xs text-[#022601] shadow-sm ring-1 ring-[rgba(48,217,107,0.2)] backdrop-blur-sm hover:bg-white hover:ring-[rgba(48,217,107,0.35)]"
      aria-label={label}
      title={label}
    >
      <Copy className="h-4 w-4 text-[#30D96B]" />
      <span className="font-mono">{value}</span>
      <span className="text-[#0D0D0D]/45">{copied ? 'Copiado' : ''}</span>
    </button>
  );
}

export default function ServerStatusPage() {
  const [database, setDatabase] = useState<HealthState>('unknown');
  const [postgrest, setPostgrest] = useState<HealthState>('unknown');
  const [auth, setAuth] = useState<HealthState>('unknown');
  const [storage, setStorage] = useState<HealthState>('unknown');

  const incidentDate = '7–8 de mayo 2026';
  const systemName = INVENTORY_SYSTEM_NAME;
  const transferFeeUsd = 25;
  const proMonthlyUsd = 35;
  const advancedMonthlyUsd = 45;
  const enterpriseMonthlyUsd = 55;

  return (
    <div
      className="min-h-screen w-full bg-[#F2F2F2] text-[#0D0D0D] pb-10"
      style={
        {
          // Variables de color (alineadas al HTML de referencia)
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          ['--verde-primario' as any]: '#30D96B',
          ['--verde-oscuro' as any]: '#022601',
          ['--verde-secundario' as any]: '#64F23D',
          ['--negro' as any]: '#0D0D0D',
          ['--blanco' as any]: '#ffffff',
        } as React.CSSProperties
      }
    >
      <div className="mx-auto w-[90%] max-w-[1200px] mt-10 overflow-hidden rounded-[12px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
        {/* Header impacto (estructura del HTML original, adaptada a Tailwind) */}
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,var(--verde-primario)_0%,var(--verde-oscuro)_100%)] px-6 py-20 text-center text-white">
          <div className="absolute -top-12 -left-12 h-[400px] w-[300px] opacity-20 bg-[linear-gradient(135deg,var(--verde-secundario),var(--verde-primario))] [transform:rotate(-15deg)] [border-radius:30%_70%_70%_30%/30%_30%_70%_70%]" />
          <div className="absolute -bottom-24 -right-24 h-[400px] w-[400px] opacity-20 bg-[linear-gradient(135deg,var(--verde-secundario),var(--verde-primario))] [transform:rotate(25deg)] [border-radius:70%_30%_30%_70%/70%_70%_30%_30%]" />

          {/* Badge IDSV (izquierda) */}
          <div className="absolute left-5 top-5 z-[3] h-10 w-10 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex items-center justify-center">
            <img src="/logo.svg" alt="Logo" className="h-7 w-7 object-contain" />
          </div>

          {/* Badge texto (derecha) */}
          <div className="absolute right-5 top-5 z-[3] rounded-full bg-white px-4 py-2 text-sm font-bold text-[var(--verde-oscuro)] shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            Ingenieros de sistema venezuela
          </div>

          {/* Departamento (izquierda debajo) */}
          <div className="absolute left-5 top-[70px] z-[3] text-left text-xs text-white/90">
            <div>departamento de desarrollo</div>
            <div className="inline-flex items-center gap-1">
              <span className="inline-flex items-center justify-center">
                <Wrench className="h-3 w-3" />
              </span>
              <span>departamento de desarrollo</span>
            </div>
          </div>

          <div className="relative z-[2] mx-auto max-w-[900px]">
            {/* Logo circular */}
            <div className="mx-auto mb-8 flex justify-center">
              <div className="h-[120px] w-[120px] rounded-full border-4 border-white/90 bg-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.12)] backdrop-blur-sm flex items-center justify-center ring-2 ring-white/40">
                <img src="/logo.svg" alt={INVENTORY_SYSTEM_NAME} className="h-20 w-20 object-contain" />
              </div>
            </div>

            {/* Título principal (legible sobre verde, sin degradado a negro) */}
            <div className="font-black text-4xl md:text-[3.5rem] leading-tight text-white [text-shadow:0_2px_8px_rgba(2,38,1,0.35)]">
              {INVENTORY_SYSTEM_NAME}
            </div>

            <div className="mt-6 font-black text-3xl md:text-5xl uppercase [text-shadow:0_2px_4px_rgba(0,0,0,0.3)]">
              WEB{' '}
              <span className="inline-block rounded-[30px] bg-white px-4 py-2 italic font-bold text-[var(--verde-oscuro)] shadow-[0_4px_8px_rgba(0,0,0,0.2)] [transform:rotate(-2deg)]">
                INVENTORY
              </span>
            </div>

            <p className="mt-4 text-xl md:text-[1.6rem] opacity-90">
              Multi-store stock control, catalog and operational inventory reports
            </p>
            <p className="mt-3 text-xl md:text-[1.6rem] opacity-90">
              <span className="inline-block rounded-[15px] bg-white px-3 py-1 font-semibold text-[var(--verde-oscuro)]">
                SOLUCIÓN INTEGRAL
              </span>{' '}
              PARA{' '}
              <span className="inline-block rounded-[15px] bg-white px-3 py-1 font-semibold text-[var(--verde-oscuro)]">
                NEGOCIOS TECNOLÓGICOS
              </span>
            </p>

            {/* Badges */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-6 py-3 text-base font-semibold backdrop-blur">
                <Server className="h-4 w-4" /> Control de inventario en tiempo real
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-6 py-3 text-base font-semibold backdrop-blur">
                <BarChart3 className="h-4 w-4" /> Inventory analytics
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/20 px-6 py-3 text-base font-semibold backdrop-blur">
                <ShieldCheck className="h-4 w-4" /> Escaneo QR para actualización
              </span>
            </div>

            {/* Botón */}
            <div className="mt-6">
              <a
                href="#planes"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--verde-oscuro)] px-12 py-4 text-lg font-extrabold text-white shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:bg-[var(--verde-primario)]"
              >
                <ExternalLink className="h-5 w-5" /> VER INFORME Y PLANES
              </a>
              <p className="mt-5 opacity-80">¿Te interesa esta solución? ¡Contáctanos!</p>
            </div>

            {/* Mini bloque técnico del informe */}
            <div className="mt-8 mx-auto max-w-xl rounded-[30px] border border-white/40 bg-white/20 px-5 py-4 shadow-[0_4px_16px_rgba(0,0,0,0.08)] backdrop-blur-md">
              <div className="font-mono text-sm text-white/95">Proyecto: {PROJECT_REF}</div>
              <div className="mt-2 text-sm text-white/90">
                {incidentDate} · <strong>{systemName}</strong> · Infraestructura &amp; Autenticación
              </div>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="px-6 py-10 bg-[#F8FAFE]">
        {/* Copiar datos del proyecto */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-3">
            <img src="/logo.svg" alt={INVENTORY_SYSTEM_NAME} className="h-10 w-10" />
            <div>
              <div className="text-lg font-bold text-[var(--verde-oscuro)]">Project: {INVENTORY_SYSTEM_NAME}</div>
              <div className="text-sm text-[#0D0D0D]/65">
                Página interna: <span className="font-mono text-[var(--verde-oscuro)]">/server</span>
              </div>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[var(--verde-oscuro)] shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
            Informe técnico · Ruta: <span className="font-mono">/server</span>
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <CopyButton value={PROJECT_REF} label="Copiar Project Ref" />
          <CopyButton value={SUPABASE_PROJECT_URL} label="Copiar Project URL" />
        </div>

        {/* Summary cards (estilo informe) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-[12px] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#dc3545]">
            <div className="text-[#0D0D0D] font-extrabold text-lg">Incidente</div>
            <div className="mt-2 text-[#b91c1c] font-black text-2xl">Unhealthy / Paused</div>
            <p className="mt-2 text-sm text-[#0D0D0D]/80">
              <strong>Síntomas:</strong> Failed to fetch, login sin respuesta, timeouts, servicios DB/Auth/API críticos.
            </p>
          </div>

          <div className="rounded-[12px] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[#198754]">
            <div className="text-[#0D0D0D] font-extrabold text-lg">Remediación</div>
            <div className="mt-2 text-[#198754] font-black text-2xl">Completada</div>
            <ul className="mt-3 space-y-2 text-sm text-[#0D0D0D]/80">
              <li className="flex gap-2"><span className="text-[var(--verde-primario)] font-black">✓</span> Reinicio/recuperación del proyecto</li>
              <li className="flex gap-2"><span className="text-[var(--verde-primario)] font-black">✓</span> Esquema/migraciones pendientes (ej. amount_usd)</li>
              <li className="flex gap-2"><span className="text-[var(--verde-primario)] font-black">✓</span> Ajustes frontend y estabilidad</li>
            </ul>
          </div>

          <div className="rounded-[12px] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.1)] border-l-[5px] border-l-[var(--verde-primario)]">
            <div className="text-[#0D0D0D] font-extrabold text-lg">Recomendación</div>
            <div className="mt-2 text-[var(--verde-oscuro)] font-black text-2xl">Plan superior (Pro / Avanzado / Enterprise)</div>
            <p className="mt-2 text-sm text-[#0D0D0D]/80">
              Objetivo: evitar pausas, estabilizar DB/Auth/API, habilitar recuperación (backups/PITR) y auditoría (logs).
            </p>
          </div>
        </div>

        {/* 1. Descripción del fallo */}
        <div className="mt-8 rounded-[12px] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
          <div className="flex items-center gap-3 border-b border-[rgba(0,255,136,0.2)] pb-4">
            <div className="h-12 w-12 rounded-xl bg-[linear-gradient(135deg,var(--verde-secundario),var(--verde-primario))] text-[var(--verde-oscuro)] flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <Search className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--verde-oscuro)]">
              1. Descripción del fallo
            </h2>
          </div>
          <p className="mt-4 text-sm md:text-base text-[#0D0D0D]/85 leading-relaxed">
            El sistema de facturación quedó completamente inoperativo. Los usuarios experimentaron: error{' '}
            <span className="font-semibold text-[#b91c1c]">“Failed to fetch”</span> y bloqueos de autenticación (login sin
            respuesta), servicios críticos en estado{' '}
            <span className="font-semibold text-[var(--verde-oscuro)]">“Unhealthy”</span> (Database, Auth, API), timeouts
            generalizados en consultas y la imposibilidad de cargar inventario, realizar ventas o generar reportes.
          </p>
          <div className="mt-4 flex items-start gap-3 rounded-xl bg-[rgba(255,200,0,0.10)] p-4 ring-1 ring-[rgba(255,200,0,0.35)]">
            <Info className="h-5 w-5 text-[#ffc800] mt-0.5" />
            <div className="text-sm text-[#0D0D0D]/85">
              Nota: durante el incidente, el navegador puede mostrar “CORS” porque el servidor no respondió (timeout) y
              la respuesta carece de headers CORS.
            </div>
          </div>
        </div>

        {/* 2. Causa raíz */}
        <div className="mt-8 rounded-[12px] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.1)] ring-1 ring-[rgba(48,217,107,0.2)]">
          <div className="flex items-center gap-3 border-b border-[rgba(48,217,107,0.25)] pb-4">
            <div className="h-12 w-12 rounded-xl bg-[linear-gradient(135deg,var(--verde-secundario),var(--verde-primario))] text-[var(--verde-oscuro)] flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <ClipboardList className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--verde-oscuro)]">2. Causa raíz del problema</h2>
          </div>

          <p className="mt-4 text-sm md:text-base text-[#0D0D0D]/85 leading-relaxed">
            La infraestructura operaba en un plan Estándar con recursos compartidos. Se identificaron síntomas técnicos que
            explican la degradación del servicio.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-[rgba(48,217,107,0.2)] shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[linear-gradient(135deg,var(--verde-primario)_0%,var(--verde-oscuro)_100%)] text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Síntoma</th>
                  <th className="px-4 py-3 text-left font-semibold">Causa técnica</th>
                </tr>
              </thead>
              <tbody className="bg-[#F8FAFE] text-[#0D0D0D]/90">
                <tr className="border-b border-[rgba(48,217,107,0.12)] hover:bg-emerald-50/60">
                  <td className="px-4 py-3">Estado “Unhealthy” persistente</td>
                  <td className="px-4 py-3">
                    Saturación/instabilidad del entorno compartido (CPU/RAM) afectando Database/Auth/API.
                  </td>
                </tr>
                <tr className="border-b border-[rgba(48,217,107,0.12)] hover:bg-emerald-50/60">
                  <td className="px-4 py-3">Proyecto pausado</td>
                  <td className="px-4 py-3">
                    Pausa automática por inactividad en plan Estándar (reactivación manual requerida).
                  </td>
                </tr>
                <tr className="border-b border-[rgba(48,217,107,0.12)] hover:bg-emerald-50/60">
                  <td className="px-4 py-3">
                    Columnas faltantes (ej. <span className="font-mono text-[var(--verde-oscuro)]">amount_usd</span>)
                  </td>
                  <td className="px-4 py-3">
                    Migraciones no aplicadas consistentemente debido a la inestabilidad del servicio.
                  </td>
                </tr>
                <tr className="hover:bg-emerald-50/60">
                  <td className="px-4 py-3">Falsos positivos de CORS</td>
                  <td className="px-4 py-3">
                    El servidor no respondía (timeout/errores), y el navegador lo reportó como CORS.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-[rgba(48,217,107,0.25)] bg-emerald-50/80 p-4">
            <div className="text-sm font-semibold text-[var(--verde-oscuro)]">
              Conclusión técnica: el plan Estándar sirve para pruebas o baja criticidad; no es adecuado para operación
              continua de un POS en producción.
            </div>
          </div>
        </div>

        {/* 3. Soluciones aplicadas */}
        <div className="mt-8 rounded-[12px] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.1)] ring-1 ring-[rgba(48,217,107,0.2)]">
          <div className="flex items-center gap-3 border-b border-[rgba(48,217,107,0.25)] pb-4">
            <div className="h-12 w-12 rounded-xl bg-[linear-gradient(135deg,var(--verde-secundario),var(--verde-primario))] text-[var(--verde-oscuro)] flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <Wrench className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--verde-oscuro)]">3. Soluciones aplicadas (remediación)</h2>
          </div>

          <ul className="mt-4 space-y-3 text-sm md:text-base text-[#0D0D0D]/85">
            <li className="flex gap-3">
              <span className="mt-1 font-bold text-[#30D96B]">✓</span>
              <span>
                Reactivación/recuperación del proyecto desde la infraestructura (servicios de Database/Auth/API).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 font-bold text-[#30D96B]">✓</span>
              <span>
                Ajustes en frontend para reducir dependencias externas (assets) y mejorar estabilidad visual durante
                incidentes.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-1 font-bold text-[#30D96B]">✓</span>
              <span>
                Preparación de migraciones pendientes de esquema para sincronizar DB con el código (ej. Krece /{' '}
                <span className="font-mono text-[var(--verde-oscuro)]">amount_usd</span>).
              </span>
            </li>
          </ul>
        </div>

        {/* 4. Comparativa plan */}
        <div
          id="planes"
          className="mt-8 rounded-[12px] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.1)] ring-1 ring-[rgba(48,217,107,0.2)]"
        >
          <div className="flex items-center gap-3 border-b border-[rgba(48,217,107,0.25)] pb-4">
            <div className="h-12 w-12 rounded-xl bg-[linear-gradient(135deg,var(--verde-secundario),var(--verde-primario))] text-[var(--verde-oscuro)] flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <BarChart3 className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--verde-oscuro)]">
              4. Planes recomendados (mensualidad + traspaso)
            </h2>
          </div>

          {/* Justificación del traspaso */}
          <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/90 p-5 shadow-sm">
            <div className="text-sm font-semibold text-amber-900">
              Traspaso / actualización de servidor (único: ${transferFeeUsd}) – justificación técnica
            </div>
            <p className="mt-2 text-sm text-[#0D0D0D]/80">
              Este cargo aplica al pasar de <span className="font-semibold text-[var(--verde-oscuro)]">Estándar</span> a
              planes superiores. Cubre el trabajo operativo de migración y estabilización para reducir riesgo en caja.
            </p>
            <ul className="mt-3 space-y-2 text-sm text-[#0D0D0D]/80">
              <li className="flex gap-3">
                <span className="font-bold text-amber-700">•</span>
                <span>Planificación de ventana, checklist y plan de reversión (rollback).</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-amber-700">•</span>
                <span>Verificación de conectividad y salud (DB/Auth/API) + pruebas de login/venta/reportes.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-amber-700">•</span>
                <span>
                  Aplicación/validación de migraciones pendientes (ej. columnas como{' '}
                  <span className="font-mono text-[var(--verde-oscuro)]">amount_usd</span>) y verificación de esquema.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-amber-700">•</span>
                <span>Revisión de variables de entorno, dominios/redirecciones y smoke tests post-cambio.</span>
              </li>
            </ul>
          </div>

          {/* Cards de planes (4 niveles) */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFE] p-6 shadow-sm ring-1 ring-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D]/55">Plan actual</div>
                  <div className="mt-1 text-2xl font-extrabold text-[var(--verde-oscuro)]">Estándar</div>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 ring-1 ring-amber-200">
                  Riesgo operativo
                </span>
              </div>
              <div className="mt-3 text-sm text-[#0D0D0D]/70">Puede pausar por inactividad y degradar a “Unhealthy”.</div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="rounded-xl border border-white/80 bg-white p-3 shadow-sm">
                  <div className="font-semibold text-[var(--verde-oscuro)]">Disponibilidad</div>
                  <div className="text-[#0D0D0D]/65">Se puede pausar por inactividad.</div>
                </div>
                <div className="rounded-xl border border-white/80 bg-white p-3 shadow-sm">
                  <div className="font-semibold text-[var(--verde-oscuro)]">Backups / Logs</div>
                  <div className="text-[#0D0D0D]/65">Capacidad limitada para recuperación y auditoría.</div>
                </div>
                <div className="rounded-xl border border-white/80 bg-white p-3 shadow-sm">
                  <div className="font-semibold text-[var(--verde-oscuro)]">Soporte</div>
                  <div className="text-[#0D0D0D]/65">Comunidad.</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(48,217,107,0.35)] bg-emerald-50/60 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D]/55">Recomendado</div>
                  <div className="mt-1 text-2xl font-extrabold text-[var(--verde-oscuro)]">Pro</div>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200">
                  Always On
                </span>
              </div>
              <div className="mt-3 text-sm text-[#0D0D0D]/80">
                Mensualidad: <span className="font-semibold text-[var(--verde-oscuro)]">${proMonthlyUsd}</span> · Traspaso
                único: <span className="font-semibold text-[var(--verde-oscuro)]">${transferFeeUsd}</span>{' '}
                <span className="text-[#0D0D0D]/55">(primer mes: ${proMonthlyUsd + transferFeeUsd})</span>
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 text-sm">
                {[
                  { k: 'Disponibilidad', v: 'Always On: no se pausa' },
                  { k: 'Backups', v: 'Automáticos (retención)' },
                  { k: 'Logs', v: 'Mayor retención para auditoría' },
                  { k: 'Soporte', v: 'Soporte por correo' },
                ].map((i) => (
                  <div key={i.k} className="rounded-xl border border-white/90 bg-white p-3 shadow-sm">
                    <div className="font-semibold text-[var(--verde-oscuro)]">{i.k}</div>
                    <div className="text-[#0D0D0D]/65">{i.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(48,217,107,0.25)] bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D]/55">Mayor rendimiento</div>
                  <div className="mt-1 text-2xl font-extrabold text-[var(--verde-oscuro)]">Avanzado</div>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200">
                  Optimización
                </span>
              </div>
              <div className="mt-3 text-sm text-[#0D0D0D]/80">
                Mensualidad: <span className="font-semibold text-[var(--verde-oscuro)]">${advancedMonthlyUsd}</span> ·
                Traspaso único: <span className="font-semibold text-[var(--verde-oscuro)]">${transferFeeUsd}</span>{' '}
                <span className="text-[#0D0D0D]/55">(primer mes: ${advancedMonthlyUsd + transferFeeUsd})</span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="rounded-xl border border-[#F2F2F2] bg-[#F8FAFE] p-3">
                  <div className="font-semibold text-[var(--verde-oscuro)]">CPU / RAM</div>
                  <div className="text-[#0D0D0D]/65">Optimización de cómputo para baja latencia.</div>
                </div>
                <div className="rounded-xl border border-[#F2F2F2] bg-[#F8FAFE] p-3">
                  <div className="font-semibold text-[var(--verde-oscuro)]">Conexiones</div>
                  <div className="text-[#0D0D0D]/65">Mayor tolerancia a múltiples dispositivos/sucursales.</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[rgba(48,217,107,0.25)] bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[#0D0D0D]/55">Máxima estabilidad</div>
                  <div className="mt-1 text-2xl font-extrabold text-[var(--verde-oscuro)]">Enterprise</div>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200">
                  Dedicado + PITR
                </span>
              </div>
              <div className="mt-3 text-sm text-[#0D0D0D]/80">
                Mensualidad: <span className="font-semibold text-[var(--verde-oscuro)]">${enterpriseMonthlyUsd}</span> ·
                Traspaso único: <span className="font-semibold text-[var(--verde-oscuro)]">${transferFeeUsd}</span>{' '}
                <span className="text-[#0D0D0D]/55">(primer mes: ${enterpriseMonthlyUsd + transferFeeUsd})</span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="rounded-xl border border-[#F2F2F2] bg-[#F8FAFE] p-3">
                  <div className="font-semibold text-[var(--verde-oscuro)]">PITR (recuperación al segundo)</div>
                  <div className="text-[#0D0D0D]/65">Restauración a minuto/segundo exacto para continuidad contable.</div>
                </div>
                <div className="rounded-xl border border-[#F2F2F2] bg-[#F8FAFE] p-3">
                  <div className="font-semibold text-[var(--verde-oscuro)]">Cómputo dedicado</div>
                  <div className="text-[#0D0D0D]/65">Mejor latencia para facturación/reportes y múltiples sucursales.</div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabla: Pro vs Avanzado (Optimización) */}
          <div className="mt-6 overflow-x-auto rounded-xl border border-[rgba(48,217,107,0.2)] shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[linear-gradient(135deg,var(--verde-primario)_0%,var(--verde-oscuro)_100%)] text-white">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Característica</th>
                  <th className="px-4 py-3 text-left font-semibold">Pro</th>
                  <th className="px-4 py-3 text-left font-semibold">Avanzado (Optimización)</th>
                </tr>
              </thead>
              <tbody className="bg-[#F8FAFE] text-[#0D0D0D]/90">
                {[
                  ['CPU (Procesador)', 'Compartido (base)', 'Dedicado (2.0 GHz+)'],
                  ['Memoria RAM', '2 GB (optimizado)', '4 GB RAM dedicada'],
                  ['Conexiones Base de Datos', 'Máx. ~60', 'Máx. 500+ conexiones simultáneas'],
                  ['Respuesta de facturación', 'Rápida', 'Instantánea (prioridad de procesamiento)'],
                ].map((r) => (
                  <tr key={r[0]} className="border-b border-[rgba(48,217,107,0.12)] hover:bg-emerald-50/60">
                    <td className="px-4 py-3 align-top">{r[0]}</td>
                    <td className="px-4 py-3 align-top">{r[1]}</td>
                    <td className="px-4 py-3 align-top">{r[2]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-xl border border-[rgba(48,217,107,0.25)] bg-emerald-50/80 p-5">
            <div className="text-sm font-semibold text-[var(--verde-oscuro)]">Resumen de Avanzado</div>
            <div className="mt-1 text-sm text-[#0D0D0D]/80">
              Total primer mes:{' '}
              <span className="font-semibold text-[var(--verde-oscuro)]">${advancedMonthlyUsd + transferFeeUsd}</span>{' '}
              (mensualidad <span className="font-semibold text-[var(--verde-oscuro)]">${advancedMonthlyUsd}</span> + traspaso{' '}
              <span className="font-semibold text-[var(--verde-oscuro)]">${transferFeeUsd}</span>). Luego:{' '}
              <span className="font-semibold text-[var(--verde-oscuro)]">${advancedMonthlyUsd}/mes</span>.
            </div>
          </div>
        </div>

        {/* 5. Estado actual y evidencia */}
        <div className="mt-8 rounded-[12px] bg-white p-8 shadow-[0_4px_12px_rgba(0,0,0,0.1)] ring-1 ring-[rgba(48,217,107,0.2)]">
          <div className="flex items-center gap-3 border-b border-[rgba(48,217,107,0.25)] pb-4">
            <div className="h-12 w-12 rounded-xl bg-[linear-gradient(135deg,var(--verde-secundario),var(--verde-primario))] text-[var(--verde-oscuro)] flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--verde-oscuro)]">5. Estado actual y verificación</h2>
          </div>

          <p className="mt-4 text-sm md:text-base text-[#0D0D0D]/85 leading-relaxed">
            Para registrar evidencia del incidente (auditoría), marca el estado que ves en Supabase. Esta página no consulta
            automáticamente el backend para evitar dependencia durante incidentes.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Database', value: database, set: setDatabase },
              { label: 'PostgREST (API)', value: postgrest, set: setPostgrest },
              { label: 'Auth', value: auth, set: setAuth },
              { label: 'Storage', value: storage, set: setStorage },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-[rgba(48,217,107,0.2)] bg-[#F8FAFE] p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold text-[var(--verde-oscuro)]">{s.label}</div>
                  <StatusPill state={s.value} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => s.set('healthy')}
                    className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200 hover:bg-emerald-100"
                  >
                    Healthy
                  </button>
                  <button
                    type="button"
                    onClick={() => s.set('unhealthy')}
                    className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-900 ring-1 ring-rose-200 hover:bg-rose-100"
                  >
                    Unhealthy
                  </button>
                  <button
                    type="button"
                    onClick={() => s.set('unknown')}
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-800 ring-1 ring-slate-200 hover:bg-slate-200/70"
                  >
                    Unknown
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-[rgba(48,217,107,0.2)] bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-[#0D0D0D]/75">
              <Search className="h-4 w-4 shrink-0 text-[#30D96B]" />
              <span>
                Verificación recomendada: en SQL Editor ejecutar{' '}
                <span className="font-mono font-semibold text-[var(--verde-oscuro)]">select now();</span>
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 text-center text-sm text-[#0D0D0D]/70">
          Elaborado por: <span className="font-semibold text-[#0D0D0D]">Equipo Técnico</span> · Próximo paso: coordinar migración y
          ejecutar migraciones finales de esquema.
        </div>
        </div>
      </div>
    </div>
  );
}

