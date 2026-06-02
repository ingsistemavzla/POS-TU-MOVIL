// Categorías predefinidas para productos
export const PRODUCT_CATEGORIES = [
  { value: 'phones', label: 'Teléfonos' },
  { value: 'accessories', label: 'Accesorios' },
  { value: 'technical_service', label: 'Servicio Técnico' },
] as const;

export const VALID_PRODUCT_CATEGORY_VALUES = PRODUCT_CATEGORIES.map((c) => c.value);

/** Coincide con uncategorized en Estadísticas y sql/reporte_productos_sin_categoria.sql */
export function isUncategorizedProductCategory(category: string | null | undefined): boolean {
  if (!category || category.trim() === '') return true;
  return !VALID_PRODUCT_CATEGORY_VALUES.includes(
    category as (typeof VALID_PRODUCT_CATEGORY_VALUES)[number]
  );
}

export function normalizeStatsCategory(category: string | null | undefined): string {
  return isUncategorizedProductCategory(category) ? 'uncategorized' : category!;
}

// Función helper para obtener el label de una categoría
export const getCategoryLabel = (categoryValue: string | null): string => {
  if (!categoryValue || categoryValue === 'uncategorized') return 'Sin categoría';
  const category = PRODUCT_CATEGORIES.find((cat) => cat.value === categoryValue);
  return category ? category.label : categoryValue;
};
