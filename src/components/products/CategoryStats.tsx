import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Package, DollarSign } from 'lucide-react';

import { PRODUCT_CATEGORIES, getCategoryLabel } from '@/constants/categories';

interface CategoryStatsProps {
  products: Array<{
    id: string;
    category: string | null;
    sale_price_usd: number;
    cost_usd: number;
    active: boolean;
  }>;
}

interface CategoryData {
  category: string;
  label: string;
  count: number;
  totalValue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
}

export const CategoryStats: React.FC<CategoryStatsProps> = ({ products }) => {

  const calculateCategoryStats = (): CategoryData[] => {
    const categoryMap = new Map<string, CategoryData>();

    // Inicializar todas las categorías
    PRODUCT_CATEGORIES.forEach(cat => {
      categoryMap.set(cat.value, {
        category: cat.value,
        label: cat.label,
        count: 0,
        totalValue: 0,
        totalCost: 0,
        totalProfit: 0,
        profitMargin: 0,
      });
    });

    // Agregar categoría "Sin categoría"
    categoryMap.set('uncategorized', {
      category: 'uncategorized',
      label: 'Sin categoría',
      count: 0,
      totalValue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: 0,
    });

    // Calcular estadísticas
    products.forEach(product => {
      const category = product.category || 'uncategorized';
      const existing = categoryMap.get(category);
      
      if (existing) {
        existing.count++;
        existing.totalValue += product.sale_price_usd;
        existing.totalCost += product.cost_usd;
        existing.totalProfit += (product.sale_price_usd - product.cost_usd);
      }
    });

    // Calcular márgenes de ganancia
    categoryMap.forEach(cat => {
      if (cat.totalCost > 0) {
        cat.profitMargin = (cat.totalProfit / cat.totalCost) * 100;
      }
    });

    // Filtrar categorías con productos y ordenar por valor total
    return Array.from(categoryMap.values())
      .filter(cat => cat.count > 0)
      .sort((a, b) => b.totalValue - a.totalValue);
  };

  const categoryStats = calculateCategoryStats();

  const totalProducts = products.length;
  const totalValue = products.reduce((sum, p) => sum + p.sale_price_usd, 0);
  const totalCost = products.reduce((sum, p) => sum + p.cost_usd, 0);
  const totalProfit = totalValue - totalCost;
  const overallMargin = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Resumen General */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {categoryStats.length} categorías
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Precio de venta total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">${totalProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {overallMargin.toFixed(1)}% de margen
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Promedio</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallMargin.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Ganancia sobre costo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas por Categoría */}
      <Card>
        <CardHeader>
          <CardTitle>Estadísticas por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryStats.map((cat) => (
              <div key={cat.category} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">{cat.label}</Badge>
                  <div className="text-sm text-muted-foreground">
                    {cat.count} productos
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="text-lg font-semibold">${cat.totalValue.toFixed(2)}</div>
                  <div className="text-sm text-green-600">
                    +${cat.totalProfit.toFixed(2)} ({cat.profitMargin.toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
