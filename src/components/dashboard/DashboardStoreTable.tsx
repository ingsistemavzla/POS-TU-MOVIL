import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  AlertTriangle,
  RefreshCw,
  Store,
  Calendar,
  Loader2
} from 'lucide-react';
import { useDashboardStorePerformance } from '@/hooks/useDashboardStorePerformance';
import { formatCurrency } from '@/utils/currency';
import { subDays, startOfMonth, endOfMonth, startOfToday, endOfToday, startOfYesterday, endOfYesterday } from 'date-fns';

type DateRangePreset = '7days' | '30days' | 'thismonth' | 'custom';
type PeriodType = 'today' | 'yesterday' | 'thisMonth';

interface DashboardStoreTableProps {
  selectedPeriod?: PeriodType;
}

export const DashboardStoreTable: React.FC<DashboardStoreTableProps> = ({ selectedPeriod }) => {
  const [datePreset, setDatePreset] = useState<DateRangePreset>('30days');
  
  // Calculate dates based on selectedPeriod prop or fallback to internal state
  const { startDate, endDate } = useMemo(() => {
    if (selectedPeriod) {
      const today = startOfToday();
      switch (selectedPeriod) {
        case 'today':
          return {
            startDate: today,
            endDate: endOfToday()
          };
        case 'yesterday':
          return {
            startDate: startOfYesterday(),
            endDate: endOfYesterday()
          };
        case 'thisMonth':
          return {
            startDate: startOfMonth(today),
            endDate: endOfToday()
          };
        default:
          return {
            startDate: subDays(today, 30),
            endDate: today
          };
      }
    }
    // Fallback to internal state if no selectedPeriod prop
    return {
      startDate: subDays(startOfToday(), 30),
      endDate: startOfToday()
    };
  }, [selectedPeriod]);
  
  const [internalStartDate, setInternalStartDate] = useState<Date | undefined>(startDate);
  const [internalEndDate, setInternalEndDate] = useState<Date | undefined>(endDate);
  
  // Use selectedPeriod dates if provided, otherwise use internal state
  const effectiveStartDate = selectedPeriod ? startDate : internalStartDate;
  const effectiveEndDate = selectedPeriod ? endDate : internalEndDate;

  const { data, loading, error } = useDashboardStorePerformance({
    startDate: effectiveStartDate,
    endDate: effectiveEndDate,
  });

  // Manejar cambios en el preset de fechas (solo si no hay selectedPeriod prop)
  const handleDatePreset = (preset: DateRangePreset) => {
    if (selectedPeriod) {
      // Si hay selectedPeriod prop, ignorar cambios internos
      return;
    }
    setDatePreset(preset);
    const today = startOfToday();

    switch (preset) {
      case '7days':
        setInternalStartDate(subDays(today, 7));
        setInternalEndDate(today);
        break;
      case '30days':
        setInternalStartDate(subDays(today, 30));
        setInternalEndDate(today);
        break;
      case 'thismonth':
        setInternalStartDate(startOfMonth(today));
        setInternalEndDate(endOfMonth(today));
        break;
      case 'custom':
        // Para custom, no cambiamos las fechas automáticamente
        // El usuario debería usar un date picker (no implementado en este componente)
        break;
    }
  };

  // Calcular totales y promedios
  const totals = useMemo(() => {
    if (!data?.summary || data.summary.length === 0) {
      return {
        totalInvoiced: 0,
        totalNetIncome: 0,
        totalProfit: 0,
        weightedMargin: 0,
        totalOrders: 0,
      };
    }

    const summary = data.summary;
    const totalInvoiced = summary.reduce((sum, store) => sum + (store.total_invoiced || 0), 0);
    const totalNetIncome = summary.reduce((sum, store) => sum + (store.net_income_real || 0), 0);
    const totalProfit = summary.reduce((sum, store) => sum + (store.estimated_profit || 0), 0);
    const totalOrders = summary.reduce((sum, store) => sum + (store.orders_count || 0), 0);

    // Calcular margen promedio ponderado (basado en facturación)
    let weightedMarginSum = 0;
    let totalWeight = 0;
    summary.forEach(store => {
      if (store.total_invoiced > 0) {
        weightedMarginSum += store.profit_margin_percent * store.total_invoiced;
        totalWeight += store.total_invoiced;
      }
    });
    const weightedMargin = totalWeight > 0 ? weightedMarginSum / totalWeight : 0;

    return {
      totalInvoiced,
      totalNetIncome,
      totalProfit,
      weightedMargin,
      totalOrders,
    };
  }, [data]);

  // Función para obtener el color del badge según el margen
  const getMarginBadgeVariant = (margin: number) => {
    if (margin >= 50) {
      return { className: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
    } else if (margin >= 30) {
      return { className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    } else {
      return { className: 'bg-red-100 text-red-800 border-red-300' };
    }
  };

  // Skeleton de carga
  if (loading) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Store className="h-5 w-5" />
            Rendimiento por Sucursal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Skeleton de botones */}
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-9 w-24 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
            {/* Skeleton de tabla */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <TableHead key={i}>
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3].map((i) => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5, 6].map((j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Manejo de error
  if (error) {
    return (
      <Card className="bg-white shadow-sm border border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Store className="h-5 w-5" />
            Rendimiento por Sucursal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error al cargar datos</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                size="sm"
                className="ml-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Estado vacío
  if (!data?.summary || data.summary.length === 0) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Store className="h-5 w-5" />
            Rendimiento por Sucursal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-gray-500">
            <Store className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No hay ventas en este periodo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <Store className="h-5 w-5" />
            Rendimiento por Sucursal
          </CardTitle>
          {/* Selector de Fechas */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <div className="flex gap-1">
              <Button
                variant={datePreset === '7days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDatePreset('7days')}
                className={datePreset === '7days' ? 'bg-accent-primary text-white' : ''}
                disabled={!!selectedPeriod}  // ✅ Disable when synced with Dashboard
              >
                7 Días
              </Button>
              <Button
                variant={datePreset === '30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDatePreset('30days')}
                className={datePreset === '30days' ? 'bg-accent-primary text-white' : ''}
                disabled={!!selectedPeriod}  // ✅ Disable when synced with Dashboard
              >
                30 Días
              </Button>
              <Button
                variant={datePreset === 'thismonth' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDatePreset('thismonth')}
                className={datePreset === 'thismonth' ? 'bg-accent-primary text-white' : ''}
                disabled={!!selectedPeriod}  // ✅ Disable when synced with Dashboard
              >
                Este Mes
              </Button>
              <Button
                variant={datePreset === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleDatePreset('custom')}
                className={datePreset === 'custom' ? 'bg-accent-primary text-white' : ''}
                disabled
              >
                Personalizado
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold text-gray-700">Tienda</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">Órdenes</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">Facturado</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">Ingreso Real</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">Ganancia</TableHead>
                <TableHead className="font-semibold text-gray-700 text-right">Margen %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.summary.map((store) => (
                <TableRow key={store.store_id} className="hover:bg-gray-50">
                  <TableCell className="font-medium text-gray-900">
                    {store.store_name}
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    {store.orders_count.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    {formatCurrency(store.total_invoiced)}
                  </TableCell>
                  <TableCell className="text-right">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-emerald-700 font-bold cursor-help">
                            {formatCurrency(store.net_income_real)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Dinero realmente cobrado</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-right text-gray-700">
                    {formatCurrency(store.estimated_profit)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={getMarginBadgeVariant(store.profit_margin_percent).className}
                    >
                      {store.profit_margin_percent.toFixed(1)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-gray-50 font-semibold">
                <TableCell className="font-bold text-gray-900">TOTAL GENERAL</TableCell>
                <TableCell className="text-right font-bold text-gray-900">
                  {totals.totalOrders.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-bold text-gray-900">
                  {formatCurrency(totals.totalInvoiced)}
                </TableCell>
                <TableCell className="text-right font-bold text-emerald-700">
                  {formatCurrency(totals.totalNetIncome)}
                </TableCell>
                <TableCell className="text-right font-bold text-gray-900">
                  {formatCurrency(totals.totalProfit)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className={getMarginBadgeVariant(totals.weightedMargin).className}
                  >
                    {totals.weightedMargin.toFixed(1)}%
                  </Badge>
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};


