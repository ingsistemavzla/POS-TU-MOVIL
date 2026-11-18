/**
 * Primitivas compartidas para ordenamiento de Lista de Inventario PDF.
 * Solo presentación: normalización / comparación / fuzzy acotado.
 */

export function normalizeProductNameForSort(name: string): string {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function compareNaturalEs(a: string, b: string): number {
  return a.localeCompare(b, 'es', { sensitivity: 'base', numeric: true });
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array<number>(b.length + 1);
  const curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

const MIN_FUZZY_TOKEN_LEN = 5;

/**
 * Fuzzy Levenshtein ≤1 contra formas canónicas.
 * Solo tokens ≥5; exige coincidencia de familia/clave única.
 */
export function matchFuzzyUniqueKey<T extends string>(
  token: string,
  targets: ReadonlyArray<{ form: string; key: T }>
): T | null {
  if (token.length < MIN_FUZZY_TOKEN_LEN) return null;

  const hits = new Set<T>();
  for (const { form, key } of targets) {
    if (Math.abs(token.length - form.length) > 1) continue;
    if (levenshtein(token, form) <= 1) hits.add(key);
  }
  if (hits.size === 1) return hits.values().next().value ?? null;
  return null;
}

/** Ordena copia decorada por claves sucesivas; no muta `items`. */
export function sortByDecoratedKeys<T>(
  items: readonly T[],
  getKeys: (item: T, index: number) => ReadonlyArray<string | number>
): T[] {
  const decorated = items.map((item, index) => ({
    item,
    index,
    keys: getKeys(item, index),
  }));

  decorated.sort((a, b) => {
    const len = Math.max(a.keys.length, b.keys.length);
    for (let i = 0; i < len; i++) {
      const ka = a.keys[i];
      const kb = b.keys[i];
      if (ka === kb) continue;
      if (typeof ka === 'number' && typeof kb === 'number') {
        if (ka !== kb) return ka - kb;
        continue;
      }
      const cmp = compareNaturalEs(String(ka ?? ''), String(kb ?? ''));
      if (cmp !== 0) return cmp;
    }
    return a.index - b.index;
  });

  return decorated.map((d) => d.item);
}
