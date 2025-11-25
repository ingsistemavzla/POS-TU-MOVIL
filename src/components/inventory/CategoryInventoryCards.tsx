import React from 'react';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CategoryInventoryData {
  category: string;
  productCount: number;
  totalStock: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  averagePrice: number;
}

interface CategoryInventoryCardsProps {
  inventoryData: CategoryInventoryData[];
  onCategoryClick?: (category: string) => void;
  onAddProduct?: (category: string) => void;
  onViewProducts?: (category: string) => void;
}

export const CategoryInventoryCards: React.FC<CategoryInventoryCardsProps> = ({
  inventoryData,
  onCategoryClick,
  onAddProduct,
  onViewProducts
}) => {
  console.log('🔍 CategoryInventoryCards rendered with data:', inventoryData);

  // Si no hay datos, mostrar mensaje de debug
  if (!inventoryData || inventoryData.length === 0) {
    console.log('❌ No inventory data available');
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-red-600">❌ ERROR: No hay datos de categorías</h2>
        <Card className="p-6 border-2 border-red-300 bg-red-50">
          <div className="text-center text-red-600">
            <p className="font-bold">No hay datos de inventario disponibles</p>
            <p className="text-sm mt-2">Datos recibidos: {JSON.stringify(inventoryData)}</p>
          </div>
        </Card>
      </div>
    );
  }

  console.log('✅ Rendering categories:', inventoryData.length);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-green-600">✅ Inventario por Categorías ({inventoryData.length})</h2>
        <Badge variant="outline" className="text-xs bg-green-100 text-green-700">
          Total: {inventoryData.length} categorías
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {inventoryData.map((category, index) => {
          console.log(`🎯 Rendering category: ${category.category} with data:`, category);
          
          return (
            <Card 
              key={category.category} 
              className="p-6 border-2 border-green-300 bg-white"
              onClick={() => onCategoryClick?.(category.category)}
            >
              <div className="space-y-4">
                {/* Header de la categoría */}
                <div className="text-center">
                  <h3 className="font-semibold text-lg text-blue-600">
                    {category.category.toUpperCase()}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {category.productCount} producto{category.productCount !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Estadísticas principales */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{category.totalStock}</p>
                    <p className="text-xs text-gray-600">Unidades</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">${category.totalValue.toFixed(2)}</p>
                    <p className="text-xs text-gray-600">Valor Total</p>
                  </div>
                </div>

                {/* Estado del stock */}
                <div className="text-center">
                  <Badge 
                    variant={category.lowStockCount > 0 ? "destructive" : "default"}
                    className="text-xs"
                  >
                    {category.lowStockCount > 0 ? 'Stock Bajo' : 'Stock Normal'}
                  </Badge>
                </div>

                {/* Botón de acción */}
                <div className="text-center">
                  <button 
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewProducts?.(category.category);
                    }}
                  >
                    Ver Productos
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

                <div className="flex items-center justify-center pt-2 border-t border-border/30">
                  <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    <span>Última actualización: {new Date().toLocaleDateString('es-VE')}</span>
                  </div>
              </div>
            </div>
        </Card>

          );
        })}
      </div>
    </div>
  );
};

