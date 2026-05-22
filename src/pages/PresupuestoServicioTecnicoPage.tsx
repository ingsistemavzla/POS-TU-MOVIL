import {
  AlertTriangle,
  ArrowDown,
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Code2,
  Database,
  FileText,
  GitBranch,
  Layers,
  Link2,
  Rocket,
  Shield,
  Target,
  Wrench,
  XCircle,
  DollarSign,
  Clock,
} from 'lucide-react';
import {
  ARQUITECTURA_CONTEXTO,
  ARQUITECTURA_TECNICA_PILARES,
  BD_POS,
  BD_TECNICA,
  BENEFICIOS_ARQUITECTURA,
  CAPACIDADES_INFRAESTRUCTURA,
  CIERRE_TECNICO_INTRO,
  CIERRE_TECNICO_REQUISITOS,
  CONSIDERACIONES_FINALES,
  DEFINICION_INTRO,
  DEFINICION_PLATAFORMA,
  ENFOQUE_CORRECTO,
  ESCRITURA_HACIA_POS,
  FASES_COMERCIALES,
  INVERSION,
  LECTURA_DESDE_POS,
  MIRROR_SYNC_DESCRIPCION,
  MODULOS_SISTEMA,
  OBJETIVO_GENERAL,
  OBJETIVO_GENERAL_CIERRE,
  OBJETIVOS_FUNCIONALES,
  OBJETIVOS_SISTEMA_GARANTIAS,
  PRINCIPIO_INTEGRACION,
  PRINCIPIO_NO_ALTERACION,
  PROPUESTA_META,
  RESULTADO_ESPERADO,
  RIESGOS_INTEGRAR_EN_POS,
  SECCIONES_NAV,
} from '@/data/presupuestoServicioTecnico';

const verdeVars = {
  ['--verde-primario' as string]: '#30D96B',
  ['--verde-oscuro' as string]: '#022601',
  ['--verde-secundario' as string]: '#64F23D',
} as React.CSSProperties;

function SectionTitle({
  icon,
  children,
  light,
  sub,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  light?: boolean;
  sub?: string;
}) {
  return (
    <div className="text-center mb-10">
      <h2
        className={`text-2xl md:text-[2.2rem] font-bold pb-4 relative inline-flex items-center justify-center gap-3 flex-wrap ${
          light ? 'text-white' : 'text-[var(--verde-oscuro)]'
        }`}
      >
        {icon}
        {children}
        <span
          className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-[100px] h-1 rounded-sm ${
            light ? 'bg-white' : 'bg-[var(--verde-primario)]'
          }`}
        />
      </h2>
      {sub && (
        <p className={`mt-4 max-w-2xl mx-auto text-sm md:text-base ${light ? 'text-white/85' : 'text-[#0D0D0D]/75'}`}>
          {sub}
        </p>
      )}
    </div>
  );
}

const inversionTextDepth =
  'text-white [text-shadow:0_1px_2px_rgba(2,38,1,0.95),0_2px_6px_rgba(2,38,1,0.75),0_4px_12px_rgba(1,20,0,0.55)]';

function InversionTotalBox() {
  return (
    <div className="max-w-3xl mx-auto rounded-[12px] bg-[linear-gradient(135deg,var(--verde-primario),var(--verde-secundario))] p-6 text-center shadow-md">
      <p className={`text-sm font-bold uppercase ${inversionTextDepth}`}>Inversión total</p>
      <p className={`mt-2 text-3xl md:text-4xl font-black ${inversionTextDepth}`}>
        ${INVERSION.totalUsd} USD
        <span className="text-xl font-semibold mx-2">/</span>
        {INVERSION.totalBcv} BCV
      </p>
      <p className={`mt-2 text-sm ${inversionTextDepth}`}>{INVERSION.nota}</p>
    </div>
  );
}

function NavPill({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-full border border-white/35 bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition-colors backdrop-blur"
    >
      {label}
    </a>
  );
}

function MirrorSyncDiagram() {
  return (
    <div className="max-w-4xl mx-auto rounded-[12px] border-2 border-[var(--verde-primario)]/30 bg-white p-6 md:p-8 shadow-md overflow-x-auto">
      <p className="text-center text-xs font-bold uppercase tracking-wider text-[var(--verde-oscuro)] mb-6">
        Mirror Sync Architecture — flujo controlado
      </p>
      <div className="flex flex-col md:flex-row items-stretch justify-center gap-4 md:gap-2 min-w-[280px]">
        <div className="flex-1 rounded-lg bg-[#F2F2F2] p-4 border-t-4 border-[var(--verde-oscuro)] text-center">
          <Database className="h-8 w-8 mx-auto text-[var(--verde-oscuro)] mb-2" />
          <h4 className="font-bold text-sm text-[var(--verde-oscuro)]">Tu Móvil POS</h4>
          <p className="text-xs text-[#0D0D0D]/70 mt-1">Núcleo comercial · producción intacta</p>
        </div>
        <div className="flex md:flex-col items-center justify-center gap-1 text-[var(--verde-primario)] py-2">
          <div className="flex items-center gap-1 text-xs font-bold">
            <ArrowLeftRight className="h-4 w-4" />
            <span className="hidden md:inline">Sync espejo</span>
          </div>
          <div className="flex flex-col items-center text-[10px] font-semibold text-[var(--verde-oscuro)]">
            <span className="flex items-center gap-1">
              <ArrowRight className="h-3 w-3 rotate-90 md:rotate-0" /> Leer
            </span>
            <span className="flex items-center gap-1">
              <ArrowRight className="h-3 w-3 rotate-90 md:rotate-180" /> Escribir
            </span>
          </div>
        </div>
        <div className="flex-1 rounded-lg bg-[rgba(48,217,107,0.12)] p-4 border-t-4 border-[var(--verde-primario)] text-center">
          <Wrench className="h-8 w-8 mx-auto text-[var(--verde-oscuro)] mb-2" />
          <h4 className="font-bold text-sm text-[var(--verde-oscuro)]">Sistema técnico</h4>
          <p className="text-xs text-[#0D0D0D]/70 mt-1">BD propia · órdenes · evidencias</p>
        </div>
      </div>
      <p className="text-center text-xs text-[#0D0D0D]/65 mt-6 italic">
        Solo categoría «Servicio Técnico» — sincronización limitada y auditable
      </p>
    </div>
  );
}

function EstadosPipeline({ estados }: { estados: string[] }) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {estados.map((e, i) => (
        <span
          key={e}
          className="inline-flex items-center gap-1 rounded-full bg-[rgba(48,217,107,0.15)] px-3 py-1 text-xs font-medium text-[var(--verde-oscuro)]"
        >
          {i > 0 && <span className="text-[var(--verde-primario)] opacity-60">→</span>}
          {e}
        </span>
      ))}
    </div>
  );
}

export default function PresupuestoServicioTecnicoPage() {
  return (
    <div className="min-h-screen w-full bg-[#F2F2F2] text-[#0D0D0D] pb-10 font-sans" style={verdeVars}>
      <div className="mx-auto w-[90%] max-w-[1200px] mt-10 overflow-hidden rounded-[12px] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.15)]">
        {/* Header */}
        <header className="relative overflow-hidden bg-[linear-gradient(135deg,var(--verde-primario)_0%,var(--verde-oscuro)_100%)] px-6 py-16 md:py-20 text-center text-white">
          <div className="absolute -top-12 -left-12 h-[400px] w-[300px] opacity-20 bg-[linear-gradient(135deg,var(--verde-secundario),var(--verde-primario))] rotate-[-15deg] rounded-[30%_70%_70%_30%/30%_30%_70%_70%]" />
          <div className="absolute -bottom-24 -right-24 h-[400px] w-[400px] opacity-20 bg-[linear-gradient(135deg,var(--verde-secundario),var(--verde-primario))] rotate-[25deg] rounded-[70%_30%_30%_70%/70%_70%_30%_30%]" />
          <div className="absolute left-5 top-5 z-[3] h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center">
            <img src="/logo.svg" alt="Logo" className="h-7 w-7 object-contain" />
          </div>
          <div className="absolute right-5 top-5 z-[3] rounded-full bg-white px-4 py-2 text-xs md:text-sm font-bold text-[var(--verde-oscuro)] shadow-md">
            Ingenieros de sistema Venezuela
          </div>
          <div className="absolute left-5 top-[70px] z-[3] text-left text-xs text-white/90">
            <div>departamento de desarrollo</div>
            <div className="inline-flex items-center gap-1 mt-1">
              <Code2 className="h-3 w-3" />
              <span>propuesta técnica</span>
            </div>
          </div>
          <div className="relative z-[2] mx-auto max-w-[920px]">
            <div className="mx-auto mb-6 flex justify-center">
              <div className="h-[120px] w-[120px] rounded-full border-4 border-white/90 bg-white/15 shadow-lg flex items-center justify-center ring-2 ring-white/40">
                <img src="/logo.svg" alt="Tu Movil" className="h-20 w-20 object-contain" />
              </div>
            </div>
            <h1 className="font-black text-3xl md:text-[3rem] leading-tight">
              {PROPUESTA_META.tituloPrincipal}
            </h1>
            <p className="mt-3 text-lg md:text-xl text-[var(--verde-secundario)] font-semibold italic">
              {PROPUESTA_META.cliente}
            </p>
            <p className="mt-5 font-bold text-lg md:text-2xl leading-tight text-white/95">
              {PROPUESTA_META.subtitulo}
            </p>
            <p className="mt-4 text-base md:text-lg opacity-90 max-w-2xl mx-auto">
              Arquitectura híbrida paralela · sistema independiente del POS · sincronización controlada
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2 max-h-[120px] overflow-y-auto">
              {SECCIONES_NAV.map((s) => (
                <NavPill key={s.id} href={`#${s.id}`} label={s.label} />
              ))}
            </div>
            <a
              href="#objetivo"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[var(--verde-oscuro)] px-10 py-4 text-lg font-bold text-white shadow-md hover:bg-[var(--verde-primario)] transition-colors"
            >
              <Rocket className="h-5 w-5" />
              Comenzar lectura
            </a>
          </div>
        </header>

        {/* 1 Objetivo general */}
        <section id="objetivo" className="px-6 md:px-12 py-14 scroll-mt-6">
          <SectionTitle
            icon={<Target className="h-8 w-8 text-[var(--verde-primario)]" />}
            sub="Sistema paralelo, formal y validado por el cliente — sin alterar producción del POS"
          >
            1. Objetivo general
          </SectionTitle>
          <div className="max-w-3xl mx-auto space-y-5">
            <p className="text-[#0D0D0D]/90 leading-relaxed text-center md:text-left border-l-4 border-[var(--verde-primario)] pl-5">
              {OBJETIVO_GENERAL}
            </p>
            <p className="text-[#0D0D0D]/85 leading-relaxed text-center md:text-left bg-[#F2F2F2] rounded-lg p-5">
              {OBJETIVO_GENERAL_CIERRE}
            </p>
          </div>
        </section>

        {/* 2 Definición */}
        <section id="definicion" className="px-6 md:px-12 py-14 bg-[#F2F2F2] mx-4 md:mx-6 rounded-[12px] scroll-mt-6">
          <SectionTitle icon={<Layers className="h-8 w-8 text-[var(--verde-primario)]" />}>
            2. Definición general del proyecto
          </SectionTitle>
          <div className="max-w-3xl mx-auto space-y-5">
            <p className="text-[#0D0D0D]/88 leading-relaxed">{DEFINICION_INTRO}</p>
            <p className="text-[#0D0D0D]/88 leading-relaxed font-medium">{DEFINICION_PLATAFORMA}</p>
            <div className="rounded-lg bg-white p-5 shadow-sm">
              <p className="text-sm font-bold text-[var(--verde-oscuro)] mb-3">
                La infraestructura tecnológica especializada deberá:
              </p>
              <ul className="space-y-2">
                {CAPACIDADES_INFRAESTRUCTURA.map((c) => (
                  <li key={c} className="flex gap-2 text-sm text-[#0D0D0D]/85">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--verde-primario)] mt-0.5" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 3 Arquitectura híbrida */}
        <section id="arquitectura" className="px-6 md:px-12 py-14 scroll-mt-6">
          <SectionTitle
            icon={<GitBranch className="h-8 w-8 text-[var(--verde-primario)]" />}
            sub="Por qué NO integrar el taller dentro del POS comercial"
          >
            3. Arquitectura híbrida paralela
          </SectionTitle>
          <p className="max-w-3xl mx-auto text-center text-[#0D0D0D]/85 mb-8">{ARQUITECTURA_CONTEXTO}</p>
          <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            <div className="rounded-[12px] border border-rose-200 bg-rose-50/80 p-6">
              <h3 className="font-bold text-rose-950 mb-4 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Riesgos de incorporar el técnico dentro del POS
              </h3>
              <ul className="space-y-2">
                {RIESGOS_INTEGRAR_EN_POS.map((r) => (
                  <li key={r} className="flex gap-2 text-sm text-rose-900/90">
                    <span className="text-rose-500 shrink-0">✕</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[12px] border border-[var(--verde-primario)]/40 bg-[rgba(48,217,107,0.1)] p-6 flex flex-col justify-center">
              <h3 className="font-bold text-[var(--verde-oscuro)] mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[var(--verde-primario)]" />
                Enfoque correcto
              </h3>
              <p className="text-sm text-[#0D0D0D]/88 leading-relaxed">{ENFOQUE_CORRECTO}</p>
            </div>
          </div>
          <div className="mt-10 max-w-3xl mx-auto">
            <h3 className="text-center font-bold text-[var(--verde-oscuro)] mb-4">
              4. Objetivo general del sistema
            </h3>
            <p className="text-center text-sm text-[#0D0D0D]/75 mb-4">
              Centralizar y controlar integralmente todos los procesos del área técnica, garantizando:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {OBJETIVOS_SISTEMA_GARANTIAS.map((g) => (
                <div
                  key={g}
                  className="flex gap-2 rounded-lg bg-[#F2F2F2] px-4 py-3 text-sm font-medium text-[var(--verde-oscuro)]"
                >
                  <Shield className="h-4 w-4 shrink-0 text-[var(--verde-primario)]" />
                  {g}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 Objetivos funcionales */}
        <section id="funcional" className="px-6 md:px-12 py-14 bg-[linear-gradient(180deg,#fafafa_0%,white_100%)] scroll-mt-6">
          <SectionTitle icon={<FileText className="h-8 w-8 text-[var(--verde-primario)]" />}>
            5. Objetivos funcionales específicos
          </SectionTitle>
          <div className="space-y-6 max-w-4xl mx-auto">
            {OBJETIVOS_FUNCIONALES.map((bloque, idx) => (
              <article
                key={bloque.id}
                className="rounded-[12px] bg-white border border-[#e8e8e8] p-6 shadow-sm"
              >
                <h3 className="font-bold text-lg text-[var(--verde-oscuro)] mb-3">
                  5.{idx + 1} {bloque.titulo}
                </h3>
                <ul className="space-y-1.5 text-sm text-[#0D0D0D]/85">
                  {bloque.items.map((item) => (
                    <li key={item} className="pl-3 border-l-2 border-[var(--verde-secundario)]">
                      {item}
                    </li>
                  ))}
                </ul>
                {bloque.extras && (
                  <div className="mt-4 pt-4 border-t border-dashed border-[var(--verde-primario)]/25">
                    {bloque.id === 'ordenes' ? (
                      <>
                        <p className="text-xs font-bold uppercase text-[var(--verde-oscuro)] mb-2">
                          Estados operativos
                        </p>
                        <EstadosPipeline estados={bloque.extras} />
                      </>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {bloque.extras.map((e) => (
                          <li key={e} className="flex gap-2 text-[#0D0D0D]/85">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--verde-primario)]" />
                            {e}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* 6 Arquitectura tecnológica */}
        <section id="tecnologia" className="px-6 md:px-12 py-14 scroll-mt-6">
          <SectionTitle icon={<Database className="h-8 w-8 text-[var(--verde-primario)]" />}>
            6. Arquitectura tecnológica propuesta
          </SectionTitle>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div>
              <h3 className="font-bold text-[var(--verde-oscuro)] mb-3">6.1 Arquitectura híbrida paralela</h3>
              <p className="text-sm text-[#0D0D0D]/80 mb-4">
                Implementación bajo modelo desacoplado y paralelo:
              </p>
              <ul className="space-y-2">
                {ARQUITECTURA_TECNICA_PILARES.map((p) => (
                  <li key={p} className="flex gap-2 text-sm">
                    <span className="text-[var(--verde-primario)]">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-5">
              <h3 className="font-bold text-amber-950 mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                6.2 Principio de no alteración del POS
              </h3>
              <p className="text-xs text-amber-900/80 mb-3">Bajo ningún concepto el nuevo sistema deberá:</p>
              <ul className="space-y-1.5 mb-4">
                {PRINCIPIO_NO_ALTERACION.map((p) => (
                  <li key={p} className="text-sm text-amber-950 flex gap-2">
                    <span>•</span>
                    {p}
                  </li>
                ))}
              </ul>
              <p className="text-sm font-medium text-amber-950 border-t border-amber-200 pt-3">
                {PRINCIPIO_INTEGRACION}
              </p>
            </div>
          </div>
        </section>

        {/* 7 Integración */}
        <section id="integracion" className="px-6 md:px-12 py-14 bg-[#F2F2F2] mx-4 md:mx-6 rounded-[12px] scroll-mt-6">
          <SectionTitle
            icon={<Link2 className="h-8 w-8 text-[var(--verde-primario)]" />}
            sub={MIRROR_SYNC_DESCRIPCION}
          >
            7. Modelo de integración — Mirror Sync
          </SectionTitle>
          <div className="mb-10">
            <MirrorSyncDiagram />
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="rounded-[12px] bg-white p-6 shadow-sm border-t-4 border-[var(--verde-oscuro)]">
              <h4 className="font-bold text-[var(--verde-oscuro)] mb-1 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                7.1 Leer desde Tu Móvil POS
              </h4>
              <p className="text-xs text-[#0D0D0D]/65 mb-3">Información estratégica</p>
              <ul className="space-y-1.5 text-sm">
                {LECTURA_DESDE_POS.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[var(--verde-primario)]">→</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[12px] bg-white p-6 shadow-sm border-t-4 border-[var(--verde-primario)]">
              <h4 className="font-bold text-[var(--verde-oscuro)] mb-1 flex items-center gap-2">
                <ArrowDown className="h-4 w-4 rotate-[-90deg]" />
                7.2 Escribir hacia Tu Móvil POS
              </h4>
              <p className="text-xs text-[#0D0D0D]/65 mb-3">Información operativa controlada</p>
              <ul className="space-y-1.5 text-sm">
                {ESCRITURA_HACIA_POS.map((i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-[var(--verde-primario)]">←</span>
                    {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 8 Bases de datos */}
        <section id="datos" className="px-6 md:px-12 py-14 scroll-mt-6">
          <SectionTitle icon={<Database className="h-8 w-8 text-[var(--verde-primario)]" />}>
            8. Bases de datos del ecosistema
          </SectionTitle>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[BD_POS, BD_TECNICA].map((bd) => (
              <div
                key={bd.titulo}
                className="rounded-[12px] p-6 bg-white shadow-md border border-[#eee]"
              >
                <h3 className="font-bold text-[var(--verde-oscuro)] mb-4 text-sm md:text-base">{bd.titulo}</h3>
                <ul className="space-y-2">
                  {bd.items.map((item) => (
                    <li key={item} className="text-sm text-[#0D0D0D]/85 flex gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--verde-primario)] mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* 9 Módulos */}
        <section id="modulos" className="px-6 md:px-12 py-14 bg-[rgba(48,217,107,0.06)] scroll-mt-6">
          <SectionTitle icon={<Wrench className="h-8 w-8 text-[var(--verde-primario)]" />}>
            9. Módulos principales del sistema
          </SectionTitle>
          <div className="grid sm:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {MODULOS_SISTEMA.map((mod) => (
              <div
                key={mod.numero}
                className="rounded-[12px] bg-white p-5 shadow-sm border-l-4 border-[var(--verde-primario)]"
              >
                <span className="text-xs font-bold text-[var(--verde-primario)]">Módulo {mod.numero}</span>
                <h3 className="font-bold text-[var(--verde-oscuro)] mt-1">{mod.titulo}</h3>
                <p className="text-sm text-[#0D0D0D]/80 mt-2">{mod.descripcion}</p>
                {mod.metricas && (
                  <ul className="mt-3 pt-3 border-t border-dashed border-[#ddd] space-y-1">
                    {mod.metricas.map((m) => (
                      <li key={m} className="text-xs text-[#0D0D0D]/75">
                        · {m}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Beneficios */}
        <section id="beneficios" className="px-6 md:px-12 py-14 scroll-mt-6">
          <SectionTitle icon={<BarChart3 className="h-8 w-8 text-[var(--verde-primario)]" />}>
            10. Beneficios de la arquitectura propuesta
          </SectionTitle>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl mx-auto">
            {BENEFICIOS_ARQUITECTURA.map((b) => (
              <div
                key={b}
                className="flex gap-2 rounded-lg bg-[#F2F2F2] px-4 py-3 text-sm font-medium text-[var(--verde-oscuro)]"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--verde-primario)]" />
                {b}
              </div>
            ))}
          </div>
        </section>

        {/* 11 Fases */}
        <section id="fases" className="px-6 md:px-12 py-14 md:py-16 scroll-mt-6">
          <SectionTitle icon={<Clock className="h-8 w-8 text-[var(--verde-primario)]" />}>
            11. Alcance del proyecto por fases
          </SectionTitle>
          <div className="space-y-6 max-w-4xl mx-auto">
            {FASES_COMERCIALES.map((fase) => (
              <article
                key={fase.numero}
                className={`rounded-[12px] bg-white overflow-hidden shadow-md border ${
                  fase.critica ? 'border-amber-400' : 'border-[var(--verde-primario)]/25'
                }`}
              >
                <div
                  className={`px-6 py-4 flex flex-wrap justify-between gap-3 ${
                    fase.critica ? 'bg-amber-50' : 'bg-[rgba(48,217,107,0.08)]'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold uppercase text-[var(--verde-primario)]">
                      Fase {fase.numero}
                    </span>
                    <h3 className="text-lg md:text-xl font-bold text-[var(--verde-oscuro)] mt-1">
                      {fase.enfoque}
                    </h3>
                    <p className="text-sm text-gray-400 mt-0.5">{fase.titulo}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-bold shadow-sm">
                    <DollarSign className="h-4 w-4 text-[var(--verde-primario)]" />
                    ${fase.valorUsd} / {fase.valorBcv} BCV
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  {fase.critica && (
                    <p className="text-sm text-amber-900 bg-amber-50 rounded-lg px-4 py-2 border border-amber-200">
                      <strong>Hito crítico:</strong> conectar ecosistemas sin afectar producción del POS.
                    </p>
                  )}
                  <div>
                    <p className="text-xs font-bold uppercase text-[var(--verde-oscuro)] mb-1">Objetivo</p>
                    <p className="text-sm text-[#0D0D0D]/85">{fase.objetivo}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-[var(--verde-oscuro)] mb-2">Incluye</p>
                    <ul className="space-y-1 text-sm text-[#0D0D0D]/85">
                      {fase.incluye.map((i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[var(--verde-primario)]">•</span>
                          {i}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-sm font-semibold text-[var(--verde-oscuro)] flex items-center gap-2 pt-2 border-t border-[#eee]">
                    <CheckCircle2 className="h-4 w-4 text-[var(--verde-primario)]" />
                    Resultado: {fase.resultado}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-10 mb-2">
            <InversionTotalBox />
          </div>
        </section>

        {/* 12 Resultado + consideraciones */}
        <section id="cierre" className="px-6 md:px-12 py-14 scroll-mt-6">
          <div id="resultado" className="scroll-mt-6">
          <SectionTitle icon={<CheckCircle2 className="h-8 w-8 text-[var(--verde-primario)]" />}>
            12. Resultado esperado
          </SectionTitle>
          <p className="text-center max-w-2xl mx-auto text-sm text-[#0D0D0D]/75 mb-6">
            Ecosistema técnico profesional completamente independiente del sistema comercial principal, capaz de:
          </p>
          <div className="grid sm:grid-cols-2 gap-3 max-w-3xl mx-auto mb-14">
            {RESULTADO_ESPERADO.map((r) => (
              <div key={r} className="flex gap-2 text-sm font-medium text-[var(--verde-oscuro)] bg-[#F2F2F2] rounded-lg px-4 py-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--verde-primario)]" />
                {r}
              </div>
            ))}
          </div>
          </div>

          <SectionTitle icon={<Shield className="h-8 w-8 text-[var(--verde-primario)]" />}>
            13. Consideraciones finales
          </SectionTitle>
          <ul className="max-w-2xl mx-auto space-y-3 mb-10">
            {CONSIDERACIONES_FINALES.map((c) => (
              <li key={c} className="flex gap-3 text-sm text-[#0D0D0D]/88 border-l-4 border-[var(--verde-secundario)] pl-4">
                {c}
              </li>
            ))}
          </ul>

          <div className="max-w-3xl mx-auto rounded-[12px] bg-[linear-gradient(135deg,var(--verde-oscuro),#0a1a08)] text-white p-8">
            <p className="text-center text-lg font-medium mb-6">{CIERRE_TECNICO_INTRO}</p>
            <p className="text-center text-sm text-white/80 mb-4">
              La implementación requiere estructura técnica rigurosa y cuidadosamente desacoplada para:
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {CIERRE_TECNICO_REQUISITOS.map((r) => (
                <div key={r} className="flex gap-2 text-sm bg-white/10 rounded-lg px-3 py-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--verde-secundario)]" />
                  {r}
                </div>
              ))}
            </div>
          </div>
          <p className="mt-8 text-center text-xs text-[var(--verde-oscuro)]/60 font-mono">
            {PROPUESTA_META.ruta}
          </p>
        </section>

        <footer className="bg-[linear-gradient(135deg,var(--verde-primario),var(--verde-secundario))] px-6 py-12 text-center text-[var(--verde-oscuro)]">
          <p className="font-bold">© {new Date().getFullYear()} Ingenieros de Sistema Venezuela</p>
          <p className="mt-2 text-sm">
            {PROPUESTA_META.subtitulo} · {PROPUESTA_META.cliente}
          </p>
        </footer>
      </div>
    </div>
  );
}
