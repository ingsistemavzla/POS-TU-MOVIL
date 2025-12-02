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
    <Card className="p-6 bg-white border-t-4 border-status-danger transition-all duration-300 shadow-lg shadow-status-danger/50 hover:shadow-status-danger/60">
      <div className="flex items-center space-x-3 mb-6">
        <AlertTriangle className="w-5 h-5 text-status-danger" />
        <h3 className="text-lg font-semibold text-status-danger">
          Stock Crítico - {products.length} productos
        </h3>
      </div>
      
      {displayProducts.length > 0 ? (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {displayProducts.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between p-4 bg-white rounded-lg border border-status-danger/20 shadow-sm hover:shadow-md transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-main-text text-sm sm:text-base truncate">
                  {product.name}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  SKU: {product.sku} • {product.storeName}
                </p>
                <p className="text-xs text-status-danger font-bold mt-1">
                  Stock: {product.currentStock} / Mín: {product.minStock}
                </p>
              </div>
              <div className="text-right ml-4 flex-shrink-0">
                <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-status-danger/20 text-status-danger border border-status-danger/50">
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

