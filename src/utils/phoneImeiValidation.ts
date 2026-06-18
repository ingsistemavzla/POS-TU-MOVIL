/** Validación IMEI para teléfonos en POS (alineado con Fase 1 / process_sale) */

const IMEI_MIN_LEN = 15;
const IMEI_MAX_LEN = 17;
const IMEI_REGEX = /^[0-9]{15,17}$/;

export function isValidImeiValue(imei: string | null | undefined): boolean {
  if (!imei) return false;
  const t = imei.trim();
  return t.length >= IMEI_MIN_LEN && t.length <= IMEI_MAX_LEN && IMEI_REGEX.test(t);
}

export interface CartPhoneImeiItem {
  id: string;
  name: string;
  sku?: string;
  quantity: number;
  category?: string;
  imei?: string;
  imeis?: string[];
}

export interface CartPhoneImeiValidation {
  ok: boolean;
  message?: string;
  productName?: string;
}

/** Cada teléfono en carrito debe tener tantos IMEI válidos como unidades */
export function getCartPhoneImeiValidation(cart: CartPhoneImeiItem[]): CartPhoneImeiValidation {
  for (const item of cart) {
    if (item.category !== 'phones' || !item.quantity || item.quantity <= 0) continue;

    const validFromArray =
      item.imeis?.filter((i) => isValidImeiValue(i)).length ?? 0;

    if (item.imeis && item.imeis.length > 0) {
      if (validFromArray < item.quantity) {
        const missing = item.quantity - validFromArray;
        return {
          ok: false,
          productName: item.name,
          message: `«${item.name}»: faltan ${missing} IMEI(s) válidos (${validFromArray}/${item.quantity}).`,
        };
      }
      continue;
    }

    if (item.quantity === 1 && isValidImeiValue(item.imei)) continue;

    return {
      ok: false,
      productName: item.name,
      message: `«${item.name}»: debe registrar ${item.quantity} IMEI(s) de 15-17 dígitos antes de vender.`,
    };
  }

  return { ok: true };
}
