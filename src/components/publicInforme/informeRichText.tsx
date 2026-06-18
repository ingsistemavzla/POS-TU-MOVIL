import React from 'react';

/**
 * En informes públicos: **texto** = etiqueta visible en pantalla (negrita);
 * *texto* = variable o campo de código (cursiva, mono).
 */
export function formatInformeRichText(text: string): React.ReactNode {
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[1] !== undefined) {
      parts.push(
        <strong key={key++} className="font-semibold text-[var(--verde-oscuro)]">
          {match[1]}
        </strong>
      );
    } else {
      parts.push(
        <em key={key++} className="italic font-mono text-[0.92em] text-[#0D0D0D]/85">
          {match[2]}
        </em>
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return text;
  if (parts.length === 1) return parts[0];
  return parts;
}

export function InformeRichText({ text }: { text: string }) {
  return <>{formatInformeRichText(text)}</>;
}

/** Bloque de código con variables en *cursiva* resaltadas */
export function InformeCodeBlock({ code }: { code: string }) {
  const lines = code.split('\n');
  return (
    <pre className="overflow-x-auto rounded-lg bg-[#0D0D0D] text-[#e8e8e8] p-4 text-xs md:text-sm font-mono leading-relaxed">
      {lines.map((line, lineIdx) => (
        <React.Fragment key={lineIdx}>
          {lineIdx > 0 && '\n'}
          {formatInformeRichText(line)}
        </React.Fragment>
      ))}
    </pre>
  );
}
