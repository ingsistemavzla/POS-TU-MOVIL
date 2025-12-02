import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Package } from "lucide-react";
import { formatCurrency } from "@/utils/currency";

interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenueUSD: number;
  storeName: string;
}

interface TopProductsTableProps {
  products: TopProduct[];
  maxProducts?: number;
}

export function TopProductsTable({ products, maxProducts = 10 }: TopProductsTableProps) {
  const displayProducts = products.slice(0, maxProducts);
  // Asegurar que maxQuantity sea al menos 1 para evitar divisiones por cero
  const maxQuantity = Math.max(...displayProducts.map(p => p.quantity), 1);

  // Si no hay productos, mostrar estructura vacía pero visible
  if (displayProducts.length === 0) {
    return (
      <Card className="p-6 bg-[#1a1a1a] border border-[#333]">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">Top 10 Productos Más Vendidos</h3>
          <Button variant="outline" size="sm" className="border-[#333] hover:bg-[#2a2a2a] text-white">
            <BarChart3 className="w-4 h-4 mr-2" />
            Ver Todo
          </Button>
        </div>
        
        {/* Mostrar estructura vacía pero visible */}
        <div className="space-y-3">
          {[1, 2, 3].map((index) => (
            <div
              key={index}
              className="flex items-center space-x-4 p-4 rounded-lg bg-white border border-gray-200 shadow-sm opacity-50"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-main-text flex-shrink-0">
                {index}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-main-text text-sm sm:text-base truncate">
                  Sin datos
                </p>
                <p className="text-xs text-gray-600 sm:text-sm">
                  0 unidades • N/A
                </p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="h-2 rounded-full bg-accent-primary transition-all duration-300" style={{ width: '0%' }} />
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-accent-primary text-sm sm:text-base">
                  {formatCurrency(0)}
                </p>
                <p className="text-xs text-muted-foreground">USD</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-main-text">Top 10 Productos Más Vendidos</h3>
        <Button variant="outline" size="sm">
          <BarChart3 className="w-4 h-4 mr-2" />
          Ver Todo
        </Button>
      </div>
      
      <div className="space-y-3">
        {displayProducts.map((product, index) => {
          const barWidth = maxQuantity > 0 ? (product.quantity / maxQuantity) * 100 : 0;
          
          return (
            <div
              key={product.id}
              className="flex items-center space-x-4 p-4 rounded-lg bg-white border border-gray-200 hover:border-accent-primary/30 hover:shadow-md transition-all shadow-sm"
            >
              {/* Ranking */}
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-main-text flex-shrink-0">
                {index + 1}
              </div>
              
              {/* Product Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-main-text text-sm sm:text-base truncate">
                  {product.name}
                </p>
                <p className="text-xs text-gray-600 sm:text-sm">
                  {product.quantity} unidades • {product.storeName || 'N/A'}
                </p>
                
                {/* Horizontal Bar */}
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 rounded-full bg-accent-primary transition-all duration-300"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
              
              {/* Revenue */}
              <div className="text-right flex-shrink-0">
                <p className="font-semibold text-accent-primary text-sm sm:text-base">
                  {formatCurrency(product.revenueUSD)}
                </p>
                <p className="text-xs text-muted-foreground">USD</p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

