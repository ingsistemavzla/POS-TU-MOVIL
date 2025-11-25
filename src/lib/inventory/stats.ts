import {
  AggregatedProduct,
  CategoryStat,
  FilteredInventoryStats,
  InventoryItem,
} from '@/types/inventory';

interface CategoryOption {
  label: string;
  value: string;
}

export const groupInventoryByProduct = (items: InventoryItem[]): AggregatedProduct[] => {
  const productMap = new Map<string, AggregatedProduct>();

  items.forEach((item) => {
    if (!item.product || !item.product_id) return;

    const productId = item.product_id;
    const qty = Math.max(0, item.qty || 0);
    const minQty = Math.max(0, item.min_qty || 0);
    const price = Math.max(0, item.product.sale_price_usd || 0);

    if (!productMap.has(productId)) {
      productMap.set(productId, {
        product_id: productId,
        product: item.product,
        totalQty: 0,
        minQty,
        hasLowStock: false,
        hasCriticalStock: false,
        totalValue: 0,
        storeIds: [],
      });
    }

    const product = productMap.get(productId)!;
    product.totalQty += qty;
    product.totalValue += qty * price;
    product.storeIds = Array.from(new Set([...product.storeIds, item.store_id]));

    if (qty > 0 && qty <= minQty) {
      product.hasLowStock = true;
    }

    if (qty > 0 && qty <= Math.max(1, Math.floor(minQty * 0.5))) {
      product.hasCriticalStock = true;
    }

    product.minQty = Math.max(product.minQty, minQty);
  });

  return Array.from(productMap.values());
};

export const calculateFilteredStats = (
  inventory: InventoryItem[],
  totalStores: number,
  selectedStore: string,
  storeFilter?: string,
): FilteredInventoryStats => {
  const filteredInventory =
    storeFilter && storeFilter !== 'all'
      ? inventory.filter((item) => item.store_id === storeFilter)
      : inventory;
  const products = groupInventoryByProduct(filteredInventory);

  const filteredTotalValue = filteredInventory.reduce((sum, item) => {
    const qty = Math.max(0, item.qty || 0);
    const price = Math.max(0, item.product?.sale_price_usd || 0);
    return sum + qty * price;
  }, 0);

  const filteredTotalProducts = products.length;
  const filteredOutOfStock = products.filter((product) => product.totalQty === 0).length;
  const filteredLowStock = products.filter(
    (product) => product.totalQty > 0 && product.hasLowStock,
  ).length;
  const filteredCriticalStock = products.filter(
    (product) => product.totalQty > 0 && product.hasCriticalStock,
  ).length;

  const filteredTotalStock = filteredInventory.reduce(
    (sum, item) => sum + Math.max(0, item.qty || 0),
    0,
  );

  const storeCount =
    storeFilter && storeFilter !== 'all' ? 1 : selectedStore === 'all' ? totalStores : 1;

  return {
    totalValue: Math.round(filteredTotalValue * 100) / 100,
    totalProducts: filteredTotalProducts,
    outOfStock: filteredOutOfStock,
    lowStock: filteredLowStock,
    criticalStock: filteredCriticalStock,
    totalStock: filteredTotalStock,
    totalStores: storeCount,
    products,
  };
};

export const getCategoryStats = (
  filteredStats: FilteredInventoryStats,
  inventory: InventoryItem[],
  categories: CategoryOption[],
  storeFilter?: string,
): CategoryStat[] => {
  const filteredInventory =
    storeFilter && storeFilter !== 'all'
      ? inventory.filter((item) => item.store_id === storeFilter)
      : inventory;

  return categories
    .map((category) => {
      const productsInCategory = filteredStats.products.filter(
        (product) => product.product?.category === category.value,
      );

      const categoryItems = filteredInventory.filter(
        (item) => item.product?.category === category.value,
      );

      const categoryTotalValue = categoryItems.reduce((sum, item) => {
        const qty = Math.max(0, item.qty || 0);
        const price = Math.max(0, item.product?.sale_price_usd || 0);
        return sum + qty * price;
      }, 0);

      const categoryTotalStock = categoryItems.reduce(
        (sum, item) => sum + Math.max(0, item.qty || 0),
        0,
      );

      const categoryProductCount = productsInCategory.length;

      return {
        label: category.label,
        value: category.value,
        totalValue: Math.round(categoryTotalValue * 100) / 100,
        totalStock: categoryTotalStock,
        productCount: categoryProductCount,
      };
    })
    .filter((category) => category.productCount > 0);
};

