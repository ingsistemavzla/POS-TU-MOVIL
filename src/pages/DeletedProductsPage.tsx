import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Trash2, 
  RotateCcw, 
  Package,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCategoryLabel } from '@/constants/categories';

interface DeletedProduct {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string | null;
  cost_usd: number;
  sale_price_usd: number;
  tax_rate: number;
  active: boolean;
  created_at: string;
  deleted_at?: string;
}

export const DeletedProductsPage: React.FC = () => {
  const { userProfile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<DeletedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringProduct, setRestoringProduct] = useState<string | null>(null);

  // 🔒 SEGURIDAD: Redirigir si no es master_admin
  useEffect(() => {
    if (!authLoading && userProfile) {
      if (userProfile.role !== 'master_admin') {
        // Redirigir a dashboard si no es master_admin
        navigate('/dashboard', { replace: true });
        toast({
          title: "Acceso denegado",
          description: "Esta página es exclusiva para usuarios de Laboratorio/Técnico.",
          variant: "destructive",
        });
      }
    }
  }, [userProfile, authLoading, navigate, toast]);

  // Cargar productos eliminados
  const fetchDeletedProducts = async () => {
    try {
      setLoading(true);

      // 🔒 SEGURIDAD: Solo master_admin puede llegar aquí (ya validado en useEffect)
      if (userProfile?.role !== 'master_admin') {
        return;
      }

      // Consultar productos eliminados (active = false)
      // Master admin puede ver productos de todas las compañías
      const { data: productsData, error: productsError } = await (supabase.from('products') as any)
        .select('id, sku, barcode, name, category, cost_usd, sale_price_usd, tax_rate, active, created_at, updated_at')
        .eq('active', false)  // Solo productos eliminados
        .order('updated_at', { ascending: false });  // Más recientes primero

      if (productsError) {
        console.error('Error fetching deleted products:', productsError);
        toast({
          title: "Error",
          description: `No se pudieron cargar los productos eliminados: ${productsError.message || 'Error desconocido'}`,
          variant: "destructive",
        });
        setProducts([]);
        return;
      }

      setProducts(productsData || []);
    } catch (error: any) {
      console.error('Error in fetchDeletedProducts:', error);
      toast({
        title: "Error",
        description: "Error inesperado al cargar los productos eliminados.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role === 'master_admin') {
      fetchDeletedProducts();
    }
  }, [userProfile?.role]);

  // Función para restaurar producto
  const handleRestoreProduct = async (productId: string) => {
    // Validación adicional en frontend (la seguridad real está en el backend)
    if (userProfile?.role !== 'master_admin') {
      toast({
        title: "Acceso denegado",
        description: "Solo usuarios de Laboratorio/Técnico pueden restaurar productos.",
        variant: "destructive",
      });
      return;
    }

    setRestoringProduct(productId);
    
    try {
      const { data, error } = await supabase.rpc('restore_product', {
        p_product_id: productId
      });

      if (error) {
        console.error('Error restoring product:', error);
        toast({
          title: "Error",
          description: error.message || "No se pudo restaurar el producto.",
          variant: "destructive",
        });
        return;
      }

      if (data && data.success) {
        toast({
          title: "Producto restaurado",
          description: data.message || "El producto ha sido restaurado exitosamente.",
        });
        
        // Recargar lista
        await fetchDeletedProducts();
      } else {
        toast({
          title: "Error",
          description: data?.message || "No se pudo restaurar el producto.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error restoring product:', error);
      toast({
        title: "Error",
        description: error.message || "Error inesperado al restaurar el producto.",
        variant: "destructive",
      });
    } finally {
      setRestoringProduct(null);
    }
  };

  // Mostrar loading o acceso denegado
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-md h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando papelera...</p>
        </div>
      </div>
    );
  }

  // Si no es master_admin, no mostrar nada (ya fue redirigido)
  if (userProfile?.role !== 'master_admin') {
    return null;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trash2 className="w-8 h-8 text-muted-foreground" />
            Papelera de Reciclaje
          </h1>
          <p className="text-muted-foreground">
            Productos eliminados - Solo visible para usuarios de Laboratorio/Técnico
          </p>
        </div>
      </div>

      {/* Alerta informativa */}
      <Card className="border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
                Modo Laboratorio/Técnico
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Esta página muestra todos los productos eliminados (soft delete) del sistema. 
                Solo usuarios con rol <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900 rounded text-xs">master_admin</code> pueden ver y restaurar estos productos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de productos eliminados */}
      {products.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-lg font-semibold text-muted-foreground mb-2">
              Papelera vacía
            </p>
            <p className="text-sm text-muted-foreground">
              No hay productos eliminados en el sistema.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Productos Eliminados ({products.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">SKU</th>
                    <th className="text-left p-3 font-semibold">Nombre</th>
                    <th className="text-left p-3 font-semibold">Categoría</th>
                    <th className="text-right p-3 font-semibold">Precio (USD)</th>
                    <th className="text-right p-3 font-semibold">Costo (USD)</th>
                    <th className="text-center p-3 font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr 
                      key={product.id} 
                      className="border-b hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-3">
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                          {product.sku}
                        </code>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{product.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            Eliminado
                          </Badge>
                        </div>
                        {product.barcode && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Código: {product.barcode}
                          </p>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">
                          {getCategoryLabel(product.category)}
                        </Badge>
                      </td>
                      <td className="p-3 text-right font-semibold">
                        ${product.sale_price_usd.toFixed(2)}
                      </td>
                      <td className="p-3 text-right text-muted-foreground">
                        ${product.cost_usd.toFixed(2)}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleRestoreProduct(product.id)}
                          disabled={restoringProduct === product.id}
                        >
                          {restoringProduct === product.id ? (
                            <>
                              <div className="w-4 h-4 mr-2 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                              Restaurando...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Restaurar
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};





