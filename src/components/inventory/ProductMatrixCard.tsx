import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Edit,
  ArrowRightLeft,
  Package
} from 'lucide-react';
import { getCategoryLabel } from '@/constants/categories';
import { formatCurrency } from '@/utils/currency';

interface StoreInventory {
  store_id: string;
  store_name: string;
  qty: number;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  cost_usd: number;
  sale_price_usd: number;
  total_stock?: number;
}

interface ProductMatrixCardProps {
  product: Product;
  inventories: StoreInventory[];
  onEdit?: (productId: string) => void;
  onTransfer?: (productId: string) => void;
}

export const ProductMatrixCard: React.FC<ProductMatrixCardProps> = ({
  product,
  inventories,
  onEdit,
  onTransfer
}) => {
  // Calcular valor total
  const totalValue = (product.total_stock || 0) * product.sale_price_usd;

  // Determinar si el stock total es bajo (< 5)
  const isLowStock = (product.total_stock || 0) < 5;

  return (
    <Card className="w-full bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-3 hover:shadow-md transition-shadow">
      <div className="flex flex-wrap md:flex-nowrap gap-4 items-center">
        {/* COLUMNA 1: IDENTIDAD (20%) */}
        <div className="flex-1 min-w-[200px] md:w-[20%]">
          <div className="space-y-2">
            <h3 className="font-bold text-gray-900 text-base leading-tight">
              {product.name}
            </h3>
            <p className="text-xs text-gray-500 font-mono">
              {product.sku}
            </p>
            <Badge 
              variant="outline" 
              className="bg-purple-50 text-purple-700 border-purple-300 text-xs"
            >
              {getCategoryLabel(product.category)}
            </Badge>
          </div>
        </div>

        {/* COLUMNA 2: MATRIZ DE SUCURSALES (50%) */}
        <div className="flex-1 min-w-[300px] md:w-[50%]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {inventories.map((inv) => (
              <div key={inv.store_id} className="space-y-1">
                <p className="text-xs text-gray-600 font-medium">
                  {inv.store_name}
                </p>
                {inv.qty > 0 ? (
                  <p className="text-lg font-bold text-gray-900">
                    {inv.qty.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-[10px] font-bold text-red-600">
                    SIN STOCK
                  </p>
                )}
              </div>
            ))}
            {inventories.length === 0 && (
              <div className="col-span-2 md:col-span-4 text-sm text-gray-400">
                Sin datos de tiendas
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA 3: TOTALES GLOBALES (20%) */}
        <div className="flex-1 min-w-[150px] md:w-[20%] space-y-2">
          {/* Stock Total */}
          <div>
            <Badge 
              variant="outline"
              className={`text-sm font-semibold ${
                isLowStock 
                  ? 'bg-red-100 text-red-800 border-red-300' 
                  : 'bg-blue-100 text-blue-800 border-blue-300'
              }`}
            >
              <Package className="w-3 h-3 mr-1" />
              {product.total_stock || 0}
            </Badge>
          </div>
          
          {/* Precio */}
          <div>
            <p className="text-sm text-gray-600">Precio</p>
            <p className="text-base font-semibold text-gray-900">
              {formatCurrency(product.sale_price_usd)}
            </p>
          </div>
          
          {/* Valor Total */}
          <div>
            <p className="text-xs text-gray-500">
              Valor: {formatCurrency(totalValue)}
            </p>
          </div>
        </div>

        {/* COLUMNA 4: ACCIONES (10%) */}
        <div className="flex flex-col gap-2 min-w-[100px] md:w-[10%]">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit?.(product.id)}
            className="w-full"
          >
            <Edit className="w-4 h-4 mr-1" />
            Editar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onTransfer?.(product.id)}
            className="w-full"
          >
            <ArrowRightLeft className="w-4 h-4 mr-1" />
            Transferir
          </Button>
        </div>
      </div>
    </Card>
  );
};


