import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useKreceStats } from "@/hooks/useKreceStats";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export function KreceTestComponent() {
  const { stats, fetchKreceStats } = useKreceStats();
  const { userProfile } = useAuth();
  const [testLoading, setTestLoading] = useState(false);

  const testKreceData = async () => {
    if (!userProfile?.company_id) return;
    
    setTestLoading(true);
    try {
      console.log('Testing Krece data...');
      
      // 1. Verificar si hay ventas con Krece
      const { data: salesWithKrece, error: salesError } = await (supabase as any)
        .from('sales')
        .select('*')
        .eq('company_id', userProfile.company_id)
        .eq('krece_enabled', true);
      
      console.log('Sales with Krece:', salesWithKrece?.length || 0);
      if (salesError) console.error('Sales error:', salesError);

      // 2. Verificar si existe la tabla krece_financing
      const { data: financingData, error: financingError } = await (supabase as any)
        .from('krece_financing')
        .select('*')
        .limit(1);
      
      console.log('Krece financing table exists:', !financingError);
      if (financingError) console.error('Financing error:', financingError);

      // 3. Verificar si existe la tabla krece_accounts_receivable
      const { data: accountsData, error: accountsError } = await (supabase as any)
        .from('krece_accounts_receivable')
        .select('*')
        .limit(1);
      
      console.log('Krece accounts table exists:', !accountsError);
      if (accountsError) console.error('Accounts error:', accountsError);

      // 4. Probar la función get_krece_accounts_summary
      try {
        const { data: summaryData, error: summaryError } = await (supabase as any)
          .rpc('get_krece_accounts_summary', {
            p_company_id: userProfile.company_id
          });
        
        console.log('Summary function works:', !summaryError);
        console.log('Summary data:', summaryData);
        if (summaryError) console.error('Summary error:', summaryError);
      } catch (summaryError) {
        console.error('Summary function error:', summaryError);
      }

      // 5. Refrescar estadísticas
      await fetchKreceStats();
      
    } catch (error) {
      console.error('Test error:', error);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prueba de Krece</CardTitle>
        <CardDescription>
          Componente de prueba para verificar que las estadísticas de Krece funcionen
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={testKreceData} 
            disabled={testLoading}
            variant="outline"
          >
            {testLoading ? 'Probando...' : 'Probar Datos de Krece'}
          </Button>
          
          <Button 
            onClick={fetchKreceStats} 
            disabled={stats.loading}
            variant="outline"
          >
            {stats.loading ? 'Cargando...' : 'Refrescar Estadísticas'}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium">Estado:</h4>
            <Badge variant={stats.error ? "destructive" : "default"}>
              {stats.error ? 'Error' : 'OK'}
            </Badge>
          </div>
          
          <div>
            <h4 className="font-medium">Ventas con Krece:</h4>
            <span className="text-2xl font-bold">{stats.totalKreceSales}</span>
          </div>
        </div>

        {stats.error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <h4 className="font-medium text-red-800">Error:</h4>
            <p className="text-red-600 text-sm">{stats.error}</p>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <p>Company ID: {userProfile?.company_id}</p>
          <p>Loading: {stats.loading ? 'Sí' : 'No'}</p>
        </div>
      </CardContent>
    </Card>
  );
}



