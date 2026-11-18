/**
 * Ordenamiento determinista para Lista de Inventario PDF (Servicio Técnico).
 * Solo presentación: no muta datos persistidos ni el array de entrada.
 */

import {
  compareNaturalEs,
  matchFuzzyUniqueKey,
  normalizeProductNameForSort,
  sortByDecoratedKeys,
} from './inventoryListSortShared';

export { normalizeProductNameForSort };

export type TechnicalServiceFamily =
  | 'pantalla'
  | 'bateria'
  | 'flex'
  | 'pin_carga'
  | 'mica'
  | 'otros';

export const TECHNICAL_SERVICE_FAMILY_ORDER: readonly TechnicalServiceFamily[] = [
  'pantalla',
  'bateria',
  'flex',
  'pin_carga',
  'mica',
  'otros',
] as const;

const FAMILY_RANK: Record<TechnicalServiceFamily, number> = {
  pantalla: 0,
  bateria: 1,
  flex: 2,
  pin_carga: 3,
  mica: 4,
  otros: 5,
};

/** Sinónimos exactos (ya normalizados) → familia. */
const EXACT_TYPE_TOKEN: Record<string, TechnicalServiceFamily> = {
  pantalla: 'pantalla',
  pantallas: 'pantalla',
  display: 'pantalla',
  lcd: 'pantalla',
  bateria: 'bateria',
  baterias: 'bateria',
  battery: 'bateria',
  flex: 'flex',
  mica: 'mica',
  micas: 'mica',
};

/**
 * Formas canónicas para fuzzy (Levenshtein ≤1).
 * Solo términos suficientemente largos (≥5) para reducir falsos positivos.
 */
const FUZZY_TYPE_TARGETS: ReadonlyArray<{ form: string; key: TechnicalServiceFamily }> = [
  { form: 'pantalla', key: 'pantalla' },
  { form: 'pantallas', key: 'pantalla' },
  { form: 'display', key: 'pantalla' },
  { form: 'bateria', key: 'bateria' },
  { form: 'baterias', key: 'bateria' },
  { form: 'battery', key: 'bateria' },
  // flex (4), mica (4), lcd (3): sin fuzzy — demasiado cortos
];

/**
 * Detecta «pin/pines/conector … carga» al inicio del nombre normalizado.
 * «pin» o «conector» aislados sin «carga» → no clasifica.
 */
function matchPinCargaPrefix(tokens: string[]): { matched: boolean; consumed: number } {
  if (tokens.length === 0) return { matched: false, consumed: 0 };
  const head = tokens[0];

  if (head === 'pin' || head === 'pines') {
    if (tokens[1] === 'carga') return { matched: true, consumed: 2 };
    if (tokens[1] === 'de' && tokens[2] === 'carga') return { matched: true, consumed: 3 };
    return { matched: false, consumed: 0 };
  }

  if (head === 'conector') {
    if (tokens[1] === 'carga') return { matched: true, consumed: 2 };
    if (tokens[1] === 'de' && tokens[2] === 'carga') return { matched: true, consumed: 3 };
    return { matched: false, consumed: 0 };
  }

  return { matched: false, consumed: 0 };
}

export interface TechnicalServiceClassification {
  family: TechnicalServiceFamily;
  /** Resto normalizado tras quitar el prefijo de tipo (marca/modelo). */
  denominationKey: string;
  /** Nombre completo normalizado (desempate / orden natural). */
  fullNormalized: string;
}

/**
 * Clasifica por el tipo principal al inicio del nombre.
 * Ej.: «Flex de pantalla» → flex (primer tipo).
 */
export function classifyTechnicalServiceName(name: string): TechnicalServiceClassification {
  const fullNormalized = normalizeProductNameForSort(name);
  if (!fullNormalized) {
    return { family: 'otros', denominationKey: '', fullNormalized: '' };
  }

  const tokens = fullNormalized.split(' ');

  const pin = matchPinCargaPrefix(tokens);
  if (pin.matched) {
    return {
      family: 'pin_carga',
      denominationKey: tokens.slice(pin.consumed).join(' '),
      fullNormalized,
    };
  }

  const first = tokens[0];
  let family: TechnicalServiceFamily | null = EXACT_TYPE_TOKEN[first] ?? null;
  if (!family) family = matchFuzzyUniqueKey(first, FUZZY_TYPE_TARGETS);

  if (!family) {
    return { family: 'otros', denominationKey: fullNormalized, fullNormalized };
  }

  return {
    family,
    denominationKey: tokens.slice(1).join(' '),
    fullNormalized,
  };
}

/**
 * Devuelve una copia ordenada. No muta `items`.
 * Conserva referencias de elementos y todos sus campos.
 */
export function sortTechnicalServiceInventoryItems<T extends { name: string }>(items: readonly T[]): T[] {
  return sortByDecoratedKeys(items, (item) => {
    const c = classifyTechnicalServiceName(item.name);
    return [FAMILY_RANK[c.family], c.denominationKey, c.fullNormalized];
  });
}

/** Reexport por si algún consumidor necesita comparación natural ST. */
export { compareNaturalEs };
