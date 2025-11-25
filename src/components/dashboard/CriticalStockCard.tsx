import { Card } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface CriticalStockItem {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  storeName: string;
  sku: string;
}

interface CriticalStockCardProps {
  products: CriticalStockItem[];
  maxProducts?: number;
}

export function CriticalStockCard({ products, maxProducts = 15 }: CriticalStockCardProps) {
  const displayProducts = products.slice(0, maxProducts);

  return (
    <Card className="p-6 bg-[#1a1a1a] border-2 border-red-500 border-opacity-50 hover:border-opacity-100 transition-all duration-300 shadow-lg shadow-red-500/20">
      <div className="flex items-center space-x-3 mb-6">
        <AlertTriangle className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-semibold text-red-500">
          Stock Crítico - {products.length} productos
        </h3>
      </div>
      
      {displayProducts.length > 0 ? (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {displayProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-4 bg-[#252525] rounded-lg border border-red-500/30 hover:border-red-500/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white text-sm sm:text-base truncate">
                  {product.name}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  SKU: {product.sku} • {product.storeName}
                </p>
                <p className="text-xs text-red-400 mt-1">
                  Stock: {product.currentStock} / Mín: {product.minStock}
                </p>
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/50">
                  Crítico
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No hay productos con stock crítico</p>
        </div>
      )}
    </Card>
  );
}

