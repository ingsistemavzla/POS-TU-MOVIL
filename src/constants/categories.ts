// Categorías predefinidas para productos
export const PRODUCT_CATEGORIES = [
  { value: 'phones', label: 'Teléfonos' },
  { value: 'accessories', label: 'Accesorios' },
  { value: 'technical_service', label: 'Servicio Técnico' },
];

// Función helper para obtener el label de una categoría
export const getCategoryLabel = (categoryValue: string | null): string => {
  if (!categoryValue) return 'Sin categoría';
  const category = PRODUCT_CATEGORIES.find(cat => cat.value === categoryValue);
  return category ? category.label : categoryValue;
};
