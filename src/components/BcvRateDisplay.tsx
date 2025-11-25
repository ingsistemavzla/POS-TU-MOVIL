import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, DollarSign, Database, Wifi } from 'lucide-react';
import { getBcvRate, fetchBcvRateFromApi, fetchBcvRateFromDatabase } from '@/utils/bcvRate';

interface BcvRateInfo {
  rate: number;
  source: 'api' | 'database';
  timestamp: string;
}

export default function BcvRateDisplay() {
  const [bcvInfo, setBcvInfo] = useState<BcvRateInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRate = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Intentar obtener desde la API primero
      const apiRate = await fetchBcvRateFromApi();
      
      if (apiRate !== null) {
        setBcvInfo({
          rate: apiRate,
          source: 'api',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      // Fallback a base de datos
      const dbRate = await fetchBcvRateFromDatabase();
      
      if (dbRate !== null) {
        setBcvInfo({
          rate: dbRate,
          source: 'database',
          timestamp: new Date().toISOString()
        });
        return;
      }
      
      setError('No se pudo obtener la tasa BCV');
    } catch (err) {
      setError('Error al obtener la tasa BCV');
      console.error('Error fetching BCV rate:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-VE');
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center">
          <DollarSign className="w-4 h-4 mr-2" />
          Tasa BCV
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={fetchRate}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>
      
      {loading && (
        <div className="text-center py-4">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Obteniendo tasa BCV...</p>
        </div>
      )}
      
      {error && (
        <div className="text-center py-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
      {bcvInfo && !loading && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-green-600">
              {formatCurrency(bcvInfo.rate)}
            </span>
            <Badge variant={bcvInfo.source === 'api' ? 'default' : 'secondary'}>
              {bcvInfo.source === 'api' ? (
                <Wifi className="w-3 h-3 mr-1" />
              ) : (
                <Database className="w-3 h-3 mr-1" />
              )}
              {bcvInfo.source === 'api' ? 'API' : 'Base de Datos'}
            </Badge>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Actualizado: {formatDate(bcvInfo.timestamp)}
          </div>
          
          <div className="text-xs text-muted-foreground">
            Fuente: {bcvInfo.source === 'api' ? 'DolarAPI (Oficial)' : 'Base de datos local'}
          </div>
        </div>
      )}
    </Card>
  );
}
