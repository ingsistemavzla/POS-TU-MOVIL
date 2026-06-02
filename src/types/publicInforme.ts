/** Informes operativos públicos (sin login) — presentación uniforme por slug */

export type InformeEstado = 'aprobado' | 'referencia' | 'historico' | 'respaldo';

export type InformeSectionType =
  | 'hero'
  | 'metadata'
  | 'verdict'
  | 'text'
  | 'table'
  | 'timeline'
  | 'steps'
  | 'comparison'
  | 'code'
  | 'links';

export interface InformeTableRow {
  cells: string[];
}

export interface InformeTableSection {
  type: 'table';
  id?: string;
  title: string;
  description?: string;
  headers: string[];
  rows: InformeTableRow[];
}

export interface InformeTimelineItem {
  fecha: string;
  fase: string;
  resultado: string;
}

export interface InformeStep {
  paso: string;
  accion: string;
  resultado: string;
}

export interface InformeComparisonRow {
  etapa: string;
  tiendas: string;
  productos: string;
  unidades: string;
  usd: string;
}

export interface InformeLink {
  label: string;
  href: string;
  external?: boolean;
}

export type InformeSection =
  | { type: 'hero'; badge?: string }
  | { type: 'metadata' }
  | { type: 'verdict'; titulo: string; detalle: string; ok: boolean }
  | { type: 'text'; title?: string; paragraphs: string[] }
  | InformeTableSection
  | { type: 'timeline'; title?: string; items: InformeTimelineItem[] }
  | { type: 'steps'; title?: string; items: InformeStep[] }
  | { type: 'comparison'; title?: string; rows: InformeComparisonRow[] }
  | { type: 'code'; title?: string; language?: string; code: string }
  | { type: 'links'; title?: string; items: InformeLink[] };

export interface PublicInforme {
  slug: string;
  titulo: string;
  subtitulo: string;
  fecha: string;
  estado: InformeEstado;
  categoria: 'respaldo' | 'inventario' | 'ejecucion' | 'validacion' | 'consolidado' | 'indice';
  tags: string[];
  /** Slugs relacionados para navegación cruzada */
  relacionados: string[];
  meta: { label: string; value: string }[];
  sections: InformeSection[];
}

export const INFORME_RUTA_BASE = '/informe';

export function informePath(slug: string): string {
  return `${INFORME_RUTA_BASE}/${slug}`;
}

export const INFORMES_CATALOGO_SLUG = 'catalogo-operaciones-sucursales-2026';
