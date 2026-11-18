/**
 * Ordenamiento PDF Lista de Inventario — categoría Teléfonos.
 * Agrupa por marca (alias canónicos); dentro, orden natural de modelo.
 */

import {
  matchFuzzyUniqueKey,
  normalizeProductNameForSort,
  sortByDecoratedKeys,
} from './inventoryListSortShared';

/** Alias / forma normalizada → marca canónica de agrupación. */
const BRAND_ALIAS: Record<string, string> = {
  samsung: 'samsung',
  galaxy: 'samsung',
  xiaomi: 'xiaomi',
  poco: 'xiaomi',
  redmi: 'xiaomi',
  apple: 'apple',
  iphone: 'apple',
  infinix: 'infinix',
  /** Typo operativo documentado (distancia >1; alias explícito, no fuzzy amplio). */
  inifnix: 'infinix',
  honor: 'honor',
  motorola: 'motorola',
  moto: 'motorola',
  huawei: 'huawei',
  oppo: 'oppo',
  realme: 'realme',
  tecno: 'tecno',
  vivo: 'vivo',
};

const FUZZY_BRAND_TARGETS: ReadonlyArray<{ form: string; key: string }> = [
  { form: 'samsung', key: 'samsung' },
  { form: 'xiaomi', key: 'xiaomi' },
  { form: 'infinix', key: 'infinix' },
  { form: 'motorola', key: 'motorola' },
  { form: 'huawei', key: 'huawei' },
  { form: 'realme', key: 'realme' },
  { form: 'iphone', key: 'apple' },
  // galaxy(6), apple(5), honor(5), oppo(4), vivo(4), moto(4), poco(4), tecno(5), redmi(5)
  { form: 'galaxy', key: 'samsung' },
  { form: 'apple', key: 'apple' },
  { form: 'honor', key: 'honor' },
  { form: 'tecno', key: 'tecno' },
  { form: 'redmi', key: 'xiaomi' },
];

export interface PhoneBrandClassification {
  brandKey: string;
  denominationKey: string;
  fullNormalized: string;
}

/**
 * Marca canónica si hay alias/fuzzy; si no, primer token (agrupación conservadora).
 * No modifica el nombre original del producto.
 */
export function classifyPhoneBrand(name: string): PhoneBrandClassification {
  const fullNormalized = normalizeProductNameForSort(name);
  if (!fullNormalized) {
    return { brandKey: '', denominationKey: '', fullNormalized: '' };
  }

  const tokens = fullNormalized.split(' ');
  const first = tokens[0];

  let brandKey = BRAND_ALIAS[first] ?? null;
  if (!brandKey) brandKey = matchFuzzyUniqueKey(first, FUZZY_BRAND_TARGETS);

  if (brandKey) {
    return {
      brandKey,
      denominationKey: tokens.slice(1).join(' '),
      fullNormalized,
    };
  }

  // Conservador: agrupar por primer token tal cual
  return {
    brandKey: first,
    denominationKey: tokens.slice(1).join(' '),
    fullNormalized,
  };
}

export function sortPhoneInventoryItems<T extends { name: string }>(items: readonly T[]): T[] {
  return sortByDecoratedKeys(items, (item) => {
    const c = classifyPhoneBrand(item.name);
    return [c.brandKey, c.denominationKey, c.fullNormalized];
  });
}
