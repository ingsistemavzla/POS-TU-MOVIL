/**
 * Ordenamiento PDF Lista de Inventario — categoría Accesorios.
 * Agrupa por tipo; tipos no reconocidos → otros (al final).
 */

import {
  matchFuzzyUniqueKey,
  normalizeProductNameForSort,
  sortByDecoratedKeys,
} from './inventoryListSortShared';

export type AccessoryType =
  | 'audifonos'
  | 'baterias_externas'
  | 'cables'
  | 'cargadores'
  | 'fundas'
  | 'micas'
  | 'otros';

/** Sinónimos exactos de un solo token → tipo. */
const EXACT_TYPE_TOKEN: Record<string, AccessoryType> = {
  audifono: 'audifonos',
  audifonos: 'audifonos',
  auricular: 'audifonos',
  auriculares: 'audifonos',
  earphone: 'audifonos',
  earphones: 'audifonos',
  airpods: 'audifonos',
  cable: 'cables',
  cables: 'cables',
  cargador: 'cargadores',
  cargadores: 'cargadores',
  charger: 'cargadores',
  funda: 'fundas',
  fundas: 'fundas',
  case: 'fundas',
  cases: 'fundas',
  mica: 'micas',
  micas: 'micas',
  powerbank: 'baterias_externas',
  ups: 'baterias_externas',
};

const FUZZY_TYPE_TARGETS: ReadonlyArray<{ form: string; key: AccessoryType }> = [
  { form: 'audifono', key: 'audifonos' },
  { form: 'audifonos', key: 'audifonos' },
  { form: 'auricular', key: 'audifonos' },
  { form: 'auriculares', key: 'audifonos' },
  { form: 'earphone', key: 'audifonos' },
  { form: 'earphones', key: 'audifonos' },
  { form: 'airpods', key: 'audifonos' },
  { form: 'cargador', key: 'cargadores' },
  { form: 'cargadores', key: 'cargadores' },
  { form: 'charger', key: 'cargadores' },
  { form: 'powerbank', key: 'baterias_externas' },
  // cable(5), cables(6), funda(5), fundas(6), mica(4), case(4), ups(3)
  { form: 'cables', key: 'cables' },
  { form: 'cable', key: 'cables' },
  { form: 'fundas', key: 'fundas' },
  { form: 'funda', key: 'fundas' },
];

/**
 * Marcas frecuentes al inicio de accesorios (para detectar tipo en token siguiente).
 * No se usan como tipo; solo desplazan la búsqueda de tipo.
 */
const KNOWN_ACCESSORY_BRAND_PREFIX: ReadonlySet<string> = new Set([
  'ugreen',
  'aroax',
  'samsung',
  'xiaomi',
  'apple',
  'iphone',
  'baseus',
  'anker',
  'huawei',
  'honor',
]);

function matchMultiWordType(
  tokens: string[],
  start: number
): { type: AccessoryType; consumed: number } | null {
  const a = tokens[start];
  const b = tokens[start + 1];
  const c = tokens[start + 2];

  if (a === 'power' && b === 'bank') {
    return { type: 'baterias_externas', consumed: 2 };
  }
  if (a === 'mini' && b === 'ups') {
    return { type: 'baterias_externas', consumed: 2 };
  }
  if ((a === 'bateria' || a === 'baterias') && b === 'externa') {
    return { type: 'baterias_externas', consumed: 2 };
  }
  if ((a === 'bateria' || a === 'baterias') && b === 'externas') {
    return { type: 'baterias_externas', consumed: 2 };
  }
  if ((a === 'bateria' || a === 'baterias') && b === 'externa' && c) {
    return { type: 'baterias_externas', consumed: 2 };
  }
  return null;
}

function matchTokenType(token: string | undefined): AccessoryType | null {
  if (!token) return null;
  return EXACT_TYPE_TOKEN[token] ?? matchFuzzyUniqueKey(token, FUZZY_TYPE_TARGETS);
}

export interface AccessoryTypeClassification {
  type: AccessoryType;
  denominationKey: string;
  fullNormalized: string;
}

/**
 * Tipo principal: multi-palabra o token de tipo en posición 0,
 * o tras un prefijo de marca conocida (p. ej. «ugreen cable…»).
 */
export function classifyAccessoryType(name: string): AccessoryTypeClassification {
  const fullNormalized = normalizeProductNameForSort(name);
  if (!fullNormalized) {
    return { type: 'otros', denominationKey: '', fullNormalized: '' };
  }

  const tokens = fullNormalized.split(' ');

  const multi0 = matchMultiWordType(tokens, 0);
  if (multi0) {
    return {
      type: multi0.type,
      denominationKey: tokens.slice(multi0.consumed).join(' '),
      fullNormalized,
    };
  }

  const type0 = matchTokenType(tokens[0]);
  if (type0) {
    return {
      type: type0,
      denominationKey: tokens.slice(1).join(' '),
      fullNormalized,
    };
  }

  // Marca conocida + tipo (p. ej. ugreen cable …)
  if (KNOWN_ACCESSORY_BRAND_PREFIX.has(tokens[0])) {
    const multi1 = matchMultiWordType(tokens, 1);
    if (multi1) {
      const before = tokens.slice(0, 1);
      const after = tokens.slice(1 + multi1.consumed);
      return {
        type: multi1.type,
        denominationKey: [...before, ...after].join(' '),
        fullNormalized,
      };
    }
    const type1 = matchTokenType(tokens[1]);
    if (type1) {
      const before = tokens.slice(0, 1);
      const after = tokens.slice(2);
      return {
        type: type1,
        denominationKey: [...before, ...after].join(' '),
        fullNormalized,
      };
    }
  }

  return { type: 'otros', denominationKey: fullNormalized, fullNormalized };
}

export function sortAccessoryInventoryItems<T extends { name: string }>(items: readonly T[]): T[] {
  return sortByDecoratedKeys(items, (item) => {
    const c = classifyAccessoryType(item.name);
    const typeRank = c.type === 'otros' ? 1 : 0;
    // Tipos conocidos: orden alfabético por clave de tipo; otros al final
    return [typeRank, c.type, c.denominationKey, c.fullNormalized];
  });
}
