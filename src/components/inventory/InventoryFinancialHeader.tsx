import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Package, 
  CheckCircle2,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { useInventoryFinancialSummary } from '@/hooks/useInventoryFinancialSummary';
import { formatCurrency } from '@/utils/currency';

export const InventoryFinancialHeader: React.FC = () => {
  const { data, loading, error } = useInventoryFinancialSummary();

  // Skeleton de carga
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse" />
                <div className="h-8 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Manejo de error
  if (error || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white shadow-sm border border-red-200 col-span-full">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              <div>
                <p className="font-semibold">Error al cargar datos</p>
                <p className="text-sm text-gray-600">{error || 'No se pudieron cargar los datos financieros'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mapear categorías a las 3 tarjetas principales
  const getCategoryData = (categoryName: string) => {
    return data.category_breakdown.find(
      cat => cat.category_name.toLowerCase() === categoryName.toLowerCase()
    );
  };

  const phonesCategory = getCategoryData('phones') || getCategoryData('teléfonos');
  const accessoriesCategory = getCategoryData('accessories') || getCategoryData('accesorios');
  const servicesCategory = getCategoryData('technical_service') || 
                          getCategoryData('servicio técnico') || 
                          data.category_breakdown.find(cat => 
                            !['phones', 'teléfonos', 'accessories', 'accesorios'].includes(cat.category_name.toLowerCase())
                          );

  const categoryCards = [
    {
      title: 'Teléfonos',
      data: phonesCategory,
      borderColor: 'border-purple-500',
      icon: '📱'
    },
    {
      title: 'Accesorios',
      data: accessoriesCategory,
      borderColor: 'border-emerald-500',
      icon: '🎧'
    },
    {
      title: servicesCategory?.category_name || 'Otros',
      data: servicesCategory,
      borderColor: 'border-orange-500',
      icon: '🔧'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {categoryCards.map((card, index) => (
        <Card 
          key={index} 
          className={`bg-white rounded-lg shadow-sm border-l-4 ${card.borderColor} border-t border-r border-b border-gray-200`}
        >
          <CardContent className="p-5">
            <div className="space-y-3">
              {/* Título de Categoría */}
              <p className="text-sm font-medium text-gray-700">
                {card.title}
              </p>
              
              {/* Valor Monetizado */}
              {card.data ? (
                <>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(card.data.total_retail_value)}
                  </div>
                  
                  {/* Cantidad de Unidades (Pill) */}
                  <Badge 
                    variant="outline" 
                    className="bg-gray-100 text-gray-700 border-gray-300 font-normal"
                  >
                    {card.data.total_quantity.toLocaleString()} unidades
                  </Badge>
                </>
              ) : (
                <div className="text-sm text-gray-400">
                  Sin datos disponibles
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

