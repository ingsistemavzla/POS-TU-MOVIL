/**
 * Utilidades de validación de inventario
 * Previene stock negativo sin necesidad de constraints SQL
 */

export interface InventoryValidationResult {
  isValid: boolean;
  error?: string;
  warning?: string;
  suggestedQty?: number;
}

/**
 * Valida que una cantidad de stock no sea negativa
 */
export function validateStockQuantity(qty: number, fieldName: string = 'Cantidad'): InventoryValidationResult {
  if (isNaN(qty) || qty < 0) {
    return {
      isValid: false,
      error: `${fieldName} no puede ser negativa. Valor recibido: ${qty}`,
      suggestedQty: Math.max(0, qty || 0)
    };
  }
  return { isValid: true };
}

/**
 * Valida que haya suficiente stock para una operación
 */
export function validateSufficientStock(
  currentStock: number,
  requestedQty: number,
  operation: 'transfer' | 'sale' | 'adjustment' = 'transfer'
): InventoryValidationResult {
  // Validar que el stock actual no sea negativo
  if (currentStock < 0) {
    return {
      isValid: false,
      error: `⚠️ ALERTA CRÍTICA: El stock actual es NEGATIVO (${currentStock}). Esto indica una inconsistencia en los datos. Por favor, contacta al administrador.`,
      warning: `Stock negativo detectado: ${currentStock}. Se recomienda ajustar el inventario antes de continuar.`
    };
  }

  // Validar que haya suficiente stock
  if (currentStock < requestedQty) {
    const operationText = operation === 'transfer' ? 'transferir' : operation === 'sale' ? 'vender' : 'ajustar';
    return {
      isValid: false,
      error: `Stock insuficiente para ${operationText}. Disponible: ${currentStock}, Solicitado: ${requestedQty}`,
      suggestedQty: Math.max(0, currentStock)
    };
  }

  // Validar que el resultado no sea negativo
  const resultQty = currentStock - requestedQty;
  if (resultQty < 0) {
    return {
      isValid: false,
      error: `⚠️ ALERTA: Esta operación resultaría en stock NEGATIVO (${resultQty}). No se puede realizar.`,
      warning: `El resultado sería ${resultQty}. Máximo permitido: ${currentStock}`,
      suggestedQty: 0
    };
  }

  return { isValid: true };
}

/**
 * Corrige valores negativos a 0 y retorna alerta
 */
export function fixNegativeStock(qty: number): { correctedQty: number; wasNegative: boolean; warning?: string } {
  if (qty < 0) {
    return {
      correctedQty: 0,
      wasNegative: true,
      warning: `⚠️ Valor negativo detectado (${qty}). Se ha corregido a 0.`
    };
  }
  return {
    correctedQty: qty,
    wasNegative: false
  };
}

/**
 * Valida una actualización de inventario antes de ejecutarla
 */
export async function validateInventoryUpdate(
  inventoryId: string,
  newQty: number,
  operation: 'update' | 'decrease' | 'increase' = 'update'
): Promise<InventoryValidationResult> {
  // Validar que newQty no sea negativo
  const qtyValidation = validateStockQuantity(newQty, 'Stock');
  if (!qtyValidation.isValid) {
    return qtyValidation;
  }

  // Validar que newQty sea >= 0
  if (newQty < 0) {
    return {
      isValid: false,
      error: `⚠️ BLOQUEADO: No se puede actualizar el inventario a un valor negativo (${newQty}). El valor mínimo es 0.`,
      suggestedQty: 0
    };
  }

  return { isValid: true };
}

/**
 * Wrapper seguro para actualizar inventario que previene valores negativos
 */
export function safeInventoryUpdate(
  currentQty: number,
  changeQty: number,
  operation: 'add' | 'subtract' = 'subtract'
): InventoryValidationResult {
  const newQty = operation === 'add' 
    ? currentQty + changeQty 
    : currentQty - changeQty;

  // Validar que el resultado no sea negativo
  if (newQty < 0) {
    const maxAllowed = operation === 'subtract' ? currentQty : Infinity;
    return {
      isValid: false,
      error: `⚠️ BLOQUEADO: Esta operación resultaría en stock NEGATIVO (${newQty}).`,
      warning: `Stock actual: ${currentQty}, Operación: ${operation === 'subtract' ? 'restar' : 'sumar'} ${changeQty}, Resultado: ${newQty}`,
      suggestedQty: 0
    };
  }

  // Validar que changeQty no sea negativo
  if (changeQty < 0) {
    return {
      isValid: false,
      error: `⚠️ ERROR: La cantidad a ${operation === 'subtract' ? 'restar' : 'sumar'} no puede ser negativa (${changeQty}).`,
      suggestedQty: Math.abs(changeQty)
    };
  }

  return {
    isValid: true,
    suggestedQty: newQty
  };
}

/**
 * Valida y corrige datos de inventario antes de mostrarlos
 */
export function sanitizeInventoryData(items: any[]): any[] {
  return items.map(item => {
    if (item.qty < 0) {
      console.warn(`⚠️ Stock negativo detectado en inventario ID ${item.id}: ${item.qty}. Se ha corregido a 0.`);
      return {
        ...item,
        qty: 0,
        _wasNegative: true,
        _originalQty: item.qty
      };
    }
    return item;
  });
}

/**
 * Obtiene mensaje de alerta visual para stock negativo
 */
export function getNegativeStockAlert(originalQty: number, productName?: string): string {
  return `⚠️ ALERTA: Stock negativo detectado${productName ? ` en ${productName}` : ''}: ${originalQty} unidades. Se ha mostrado como 0, pero requiere corrección en la base de datos.`;
}

