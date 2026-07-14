import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { InformeSection } from '@/types/publicInforme';
import { InformeCodeBlock, InformeRichText } from '@/components/publicInforme/informeRichText';

function SectionBlock({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section>
      {title && (
        <h2 className="text-lg md:text-xl font-bold text-[var(--verde-oscuro)] mb-4 pb-2 border-b-2 border-[var(--verde-primario)] inline-block">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

export function PublicInformeSections({ sections }: { sections: InformeSection[] }) {
  return (
    <>
      {sections.map((section, idx) => {
        const key = `${section.type}-${idx}`;

        if (section.type === 'hero' && section.badge) {
          return (
            <p key={key} className="text-center text-sm font-medium text-[#0D0D0D]/55 -mt-2 mb-2">
              {section.badge}
            </p>
          );
        }

        if (section.type === 'verdict') {
          const paragraphs = section.detalle
            .split(/\n\n+/)
            .map((p) => p.trim())
            .filter(Boolean);

          return (
            <div
              key={key}
              className={`rounded-xl p-5 md:p-6 flex gap-4 items-start ${
                section.ok
                  ? 'bg-emerald-50 ring-1 ring-emerald-200'
                  : 'bg-amber-50 ring-1 ring-amber-300'
              }`}
            >
              {section.ok ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="h-8 w-8 text-amber-600 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-lg text-[var(--verde-oscuro)]">{section.titulo}</p>
                <div className="mt-2 space-y-2.5 text-sm leading-relaxed text-[#0D0D0D]/80">
                  {paragraphs.map((p) => (
                    <p key={p.slice(0, 48)}>
                      <InformeRichText text={p} />
                    </p>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        if (section.type === 'text') {
          return (
            <SectionBlock key={key} title={section.title}>
              <div className="space-y-3 text-sm leading-relaxed text-[#0D0D0D]/80">
                {section.paragraphs.map((p) => (
                  <p key={p.slice(0, 40)}>
                    <InformeRichText text={p} />
                  </p>
                ))}
              </div>
            </SectionBlock>
          );
        }

        if (section.type === 'table') {
          return (
            <SectionBlock key={key} title={section.title}>
              {section.description && (
                <p className="text-sm text-[#0D0D0D]/65 mb-3">
                  <InformeRichText text={section.description} />
                </p>
              )}
              <div className="overflow-x-auto rounded-lg ring-1 ring-[#0D0D0D]/10">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="bg-[var(--verde-oscuro)] text-white">
                      {section.headers.map((h) => (
                        <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row, ri) => (
                      <tr
                        key={ri}
                        className={ri % 2 === 0 ? 'bg-white' : 'bg-[#f8f8f8]'}
                      >
                        {row.cells.map((cell, ci) => (
                          <td key={ci} className="px-3 py-2.5 border-t border-[#0D0D0D]/5">
                            <InformeRichText text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionBlock>
          );
        }

        if (section.type === 'timeline') {
          return (
            <SectionBlock key={key} title={section.title}>
              <ol className="space-y-3">
                {section.items.map((item) => (
                  <li
                    key={`${item.fecha}-${item.fase}`}
                    className="flex flex-col sm:flex-row sm:gap-4 rounded-lg bg-[#f5f5f5] px-4 py-3 text-sm"
                  >
                    <span className="font-mono text-xs text-[var(--verde-oscuro)] shrink-0 w-28">
                      {item.fecha}
                    </span>
                    <span className="font-semibold text-[var(--verde-oscuro)] shrink-0 sm:w-36">{item.fase}</span>
                    <span className="text-[#0D0D0D]/75">{item.resultado}</span>
                  </li>
                ))}
              </ol>
            </SectionBlock>
          );
        }

        if (section.type === 'steps') {
          return (
            <SectionBlock key={key} title={section.title}>
              <ol className="space-y-2">
                {section.items.map((s) => (
                  <li
                    key={s.paso}
                    className="grid grid-cols-[auto_1fr] md:grid-cols-[3rem_1fr_1fr] gap-2 md:gap-4 text-sm rounded-lg border border-[#0D0D0D]/8 p-3"
                  >
                    <span className="font-bold text-[var(--verde-primario)]">#{s.paso}</span>
                    <span className="font-medium">
                      <InformeRichText text={s.accion} />
                    </span>
                    <span className="text-[#0D0D0D]/70 md:col-span-1 col-span-2 md:col-start-3">
                      → <InformeRichText text={s.resultado} />
                    </span>
                  </li>
                ))}
              </ol>
            </SectionBlock>
          );
        }

        if (section.type === 'comparison') {
          return (
            <SectionBlock key={key} title={section.title}>
              <div className="overflow-x-auto rounded-lg ring-1 ring-[#0D0D0D]/10">
                <table className="w-full text-xs md:text-sm">
                  <thead>
                    <tr className="bg-[var(--verde-primario)] text-[var(--verde-oscuro)]">
                      <th className="px-3 py-2 text-left">Etapa</th>
                      <th className="px-3 py-2 text-left">Tiendas</th>
                      <th className="px-3 py-2 text-left">Productos</th>
                      <th className="px-3 py-2 text-left">Unidades</th>
                      <th className="px-3 py-2 text-left">USD</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((r) => (
                      <tr key={r.etapa} className="border-t border-[#0D0D0D]/8">
                        <td className="px-3 py-2 font-medium">{r.etapa}</td>
                        <td className="px-3 py-2">{r.tiendas}</td>
                        <td className="px-3 py-2">{r.productos}</td>
                        <td className="px-3 py-2">{r.unidades}</td>
                        <td className="px-3 py-2 font-mono">{r.usd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionBlock>
          );
        }

        if (section.type === 'code') {
          return (
            <SectionBlock key={key} title={section.title}>
              <InformeCodeBlock code={section.code} />
            </SectionBlock>
          );
        }

        if (section.type === 'links') {
          return (
            <SectionBlock key={key} title={section.title}>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {section.items.map((link) => {
                  const isPrimary =
                    link.label.includes('Continuar') ||
                    link.label.includes('Parte 2') ||
                    link.label.includes('Parte 3') ||
                    link.label.startsWith('→');
                  const isInternal = link.href.startsWith('/');

                  const className = isPrimary
                    ? 'inline-flex w-full sm:w-auto items-center justify-center rounded-xl bg-[var(--verde-primario)] px-5 py-3 text-sm font-bold text-[var(--verde-oscuro)] shadow-md hover:brightness-95'
                    : 'inline-flex w-full sm:w-auto items-center justify-center rounded-xl border-2 border-[var(--verde-oscuro)]/20 bg-white px-5 py-3 text-sm font-semibold text-[var(--verde-oscuro)] hover:bg-[var(--verde-primario)]/10';

                  if (isInternal && !link.external) {
                    return (
                      <Link key={link.href} to={link.href} className={className}>
                        {link.label}
                      </Link>
                    );
                  }

                  return (
                    <a
                      key={link.href}
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                      className={className}
                    >
                      {link.label}
                    </a>
                  );
                })}
              </div>
            </SectionBlock>
          );
        }

        return null;
      })}
    </>
  );
}
