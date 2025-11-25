import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  CreditCard, 
  DollarSign, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Eye
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency } from "@/utils/currency";

interface KreceAccount {
  id: string;
  amount_usd: number;
  amount_bs: number;
  status: 'pending' | 'paid' | 'overdue';
  payment_date: string | null;
  created_at: string;
  customer: {
    name: string;
    id_number: string | null;
  };
  krece_financing: {
    total_amount_usd: number;
    initial_amount_usd: number;
    financed_amount_usd: number;
    initial_percentage: number;
    due_date: string | null;
  };
}

export function KreceAccountsTable() {
  const { userProfile } = useAuth();
  const [accounts, setAccounts] = useState<KreceAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = async () => {
    if (!userProfile?.company_id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('krece_accounts_receivable')
        .select(`
          id,
          amount_usd,
          amount_bs,
          status,
          payment_date,
          created_at,
          customer:customers(name, id_number),
          krece_financing:krece_financing(
            total_amount_usd,
            initial_amount_usd,
            financed_amount_usd,
            initial_percentage,
            due_date
          )
        `)
        .eq('company_id', userProfile.company_id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setAccounts(data || []);
    } catch (err) {
      console.error('Error fetching Krece accounts:', err);
      setError('Error al cargar las cuentas por cobrar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [userProfile?.company_id]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600 border-orange-200">Pendiente</Badge>;
      case 'paid':
        return <Badge variant="outline" className="text-green-600 border-green-200">Pagada</Badge>;
      case 'overdue':
        return <Badge variant="outline" className="text-red-600 border-red-200">Vencida</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Cuentas por Cobrar Krece
          </CardTitle>
          <CardDescription>
            Últimas 20 cuentas por cobrar a Krece
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Cargando cuentas...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Error al cargar cuentas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">{error}</p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAccounts}
            className="mt-2"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Cuentas por Cobrar Krece
            </CardTitle>
            <CardDescription>
              Últimas 20 cuentas por cobrar a Krece
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchAccounts}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {accounts.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto USD</TableHead>
                  <TableHead>Monto BS</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Creación</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Inicial %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{account.customer.name}</div>
                        {account.customer.id_number && (
                          <div className="text-sm text-muted-foreground">
                            CI: {account.customer.id_number}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(account.amount_usd, 'USD')}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(account.amount_bs, 'BS')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(account.status)}
                        {getStatusBadge(account.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDate(account.created_at)}
                    </TableCell>
                    <TableCell>
                      {formatDate(account.krece_financing.due_date)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {account.krece_financing.initial_percentage.toFixed(1)}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatCurrency(account.krece_financing.initial_amount_usd, 'USD')}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay cuentas por cobrar de Krece</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}



