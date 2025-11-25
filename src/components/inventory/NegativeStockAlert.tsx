/**
 * Componente que detecta y alerta sobre stock negativo en la aplicación
 * Se muestra globalmente cuando se detecta stock negativo
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fixNegativeStock, getNegativeStockAlert } from '@/utils/inventoryValidation';

interface NegativeStockItem {
  product_id: string;
  product_name?: string;
  store_id: string;
  store_name?: string;
  qty: number;
}

export const NegativeStockAlert: React.FC = () => {
  const { userProfile } = useAuth();
  const [negativeItems, setNegativeItems] = useState<NegativeStockItem[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Solo verificar si es admin
    if (userProfile?.role !== 'admin' || dismissed) return;

    checkNegativeStock();
    
    // Verificar cada 30 segundos
    const interval = setInterval(() => {
      checkNegativeStock();
    }, 30000);

    return () => clearInterval(interval);
  }, [userProfile?.role, userProfile?.company_id, dismissed]);

  const checkNegativeStock = async () => {
    if (!userProfile?.company_id || checking) return;

    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('inventories')
        .select(`
          product_id,
          store_id,
          qty,
          products!inner(name),
          stores!inner(name)
        `)
        .eq('company_id', userProfile.company_id)
        .lt('qty', 0)
        .limit(10); // Limitar a 10 para no sobrecargar

      if (error) {
        console.error('Error checking negative stock:', error);
        return;
      }

      if (data && data.length > 0) {
        const items: NegativeStockItem[] = data.map((item: any) => ({
          product_id: item.product_id,
          product_name: item.products?.name,
          store_id: item.store_id,
          store_name: item.stores?.name,
          qty: item.qty
        }));
        
        setNegativeItems(items);
      } else {
        setNegativeItems([]);
      }
    } catch (error) {
      console.error('Error in checkNegativeStock:', error);
    } finally {
      setChecking(false);
    }
  };

  if (dismissed || negativeItems.length === 0 || userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4 border-red-500 bg-red-50 dark:bg-red-950">
      <AlertTriangle className="h-5 w-5 text-red-600" />
      <AlertTitle className="flex items-center justify-between">
        <span className="font-bold">⚠️ ALERTA CRÍTICA: Stock Negativo Detectado</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDismissed(true)}
          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-2">
        <p className="font-medium">
          Se encontraron {negativeItems.length} registro(s) con stock negativo en la base de datos.
          Estos valores pueden causar inconsistencias en los cálculos.
        </p>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium hover:text-red-700">
            Ver detalles ({negativeItems.length} registro(s))
          </summary>
          <ul className="mt-2 ml-4 list-disc space-y-1">
            {negativeItems.slice(0, 5).map((item, idx) => (
              <li key={idx}>
                <strong>{item.product_name || 'Producto desconocido'}</strong> en{' '}
                <strong>{item.store_name || 'Tienda desconocida'}</strong>:{' '}
                <span className="font-mono font-bold">{item.qty} unidades</span>
              </li>
            ))}
            {negativeItems.length > 5 && (
              <li className="text-muted-foreground">
                ... y {negativeItems.length - 5} registro(s) más
              </li>
            )}
          </ul>
        </details>
        <p className="text-xs text-muted-foreground mt-2">
          ⚠️ <strong>Acción requerida:</strong> Aplica la migración SQL{' '}
          <code className="bg-red-100 px-1 rounded">20250103000003_prevent_negative_stock.sql</code>{' '}
          en Supabase para prevenir y corregir estos valores.
        </p>
      </AlertDescription>
    </Alert>
  );
};

