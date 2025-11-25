import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Award,
  Clock,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  BarChart3,
  PieChart,
  LineChart,
  Eye,
  Download,
  AlertTriangle
} from 'lucide-react';

interface KPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  category: 'sales' | 'efficiency' | 'customer' | 'inventory';
  priority: 'high' | 'medium' | 'low';
}

interface AdvancedMetricsProps {
  data?: {
    currentMonthSales: number;
    todayTransactions: number;
    averageTicket: number;
    averageMargin: number;
  };
}

export function AdvancedMetrics({ data }: AdvancedMetricsProps) {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const mockKPIs: KPI[] = [
      {
        id: '1',
        name: 'Conversión de Ventas',
        value: 68,
        target: 75,
        unit: '%',
        change: 5.2,
        trend: 'up',
        category: 'sales',
        priority: 'high'
      },
      {
        id: '2',
        name: 'Ticket Promedio',
        value: data?.averageTicket || 1250,
        target: 1500,
        unit: '$',
        change: -2.1,
        trend: 'down',
        category: 'sales',
        priority: 'medium'
      },
      {
        id: '3',
        name: 'Satisfacción del Cliente',
        value: 92,
        target: 90,
        unit: '%',
        change: 3.5,
        trend: 'up',
        category: 'customer',
        priority: 'high'
      },
      {
        id: '4',
        name: 'Tiempo de Atención',
        value: 2.3,
        target: 2.0,
        unit: 'min',
        change: -8.7,
        trend: 'up',
        category: 'efficiency',
        priority: 'medium'
      },
      {
        id: '5',
        name: 'Rotación de Inventario',
        value: 12.5,
        target: 15,
        unit: 'veces',
        change: 12.3,
        trend: 'up',
        category: 'inventory',
        priority: 'low'
      },
      {
        id: '6',
        name: 'Margen Bruto',
        value: data?.averageMargin || 28.5,
        target: 30,
        unit: '%',
        change: 1.8,
        trend: 'up',
        category: 'sales',
        priority: 'high'
      },
      {
        id: '7',
        name: 'Retención de Clientes',
        value: 78,
        target: 80,
        unit: '%',
        change: 2.1,
        trend: 'up',
        category: 'customer',
        priority: 'medium'
      },
      {
        id: '8',
        name: 'Productividad por Empleado',
        value: 145,
        target: 150,
        unit: 'ventas/mes',
        change: 4.2,
        trend: 'up',
        category: 'efficiency',
        priority: 'medium'
      }
    ];

    setKpis(mockKPIs);
  }, [data]);

  const getCategoryIcon = (category: KPI['category']) => {
    switch (category) {
      case 'sales': return <DollarSign className="w-4 h-4" />;
      case 'efficiency': return <Clock className="w-4 h-4" />;
      case 'customer': return <Users className="w-4 h-4" />;
      case 'inventory': return <Package className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: KPI['category']) => {
    switch (category) {
                      case 'sales': return 'text-green-600 bg-green-100';
      case 'efficiency': return 'text-green-600 bg-green-100';
      case 'customer': return 'text-purple-600 bg-purple-100';
      case 'inventory': return 'text-orange-600 bg-orange-100';
    }
  };

  const getPriorityColor = (priority: KPI['priority']) => {
    switch (priority) {
      case 'high': return 'border-red-200 bg-red-50';
      case 'medium': return 'border-yellow-200 bg-yellow-50';
      case 'low': return 'border-green-200 bg-green-50';
    }
  };

  const getProgressColor = (value: number, target: number) => {
    const percentage = (value / target) * 100;
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === '$') return `$${value.toLocaleString('es-VE')}`;
    if (unit === '%') return `${value}%`;
    if (unit === 'min') return `${value} min`;
    if (unit === 'veces') return `${value}x`;
    return value.toString();
  };

  const filteredKPIs = selectedCategory === 'all' 
    ? kpis 
    : kpis.filter(kpi => kpi.category === selectedCategory);

  const categories = [
    { id: 'all', name: 'Todos', icon: BarChart3 },
    { id: 'sales', name: 'Ventas', icon: DollarSign },
    { id: 'efficiency', name: 'Eficiencia', icon: Clock },
    { id: 'customer', name: 'Clientes', icon: Users },
    { id: 'inventory', name: 'Inventario', icon: Package }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Métricas Avanzadas</h2>
          <p className="text-muted-foreground">KPIs y métricas de rendimiento clave</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={() => setShowDetails(!showDetails)}>
            <Eye className="w-4 h-4 mr-2" />
            {showDetails ? 'Vista Simple' : 'Vista Detallada'}
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category.id)}
              className="flex items-center space-x-2 whitespace-nowrap"
            >
              <Icon className="w-4 h-4" />
              <span>{category.name}</span>
            </Button>
          );
        })}
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredKPIs.map((kpi) => (
          <Card 
            key={kpi.id} 
            className={`p-6 hover-glow transition-all duration-200 ${getPriorityColor(kpi.priority)}`}
          >
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getCategoryColor(kpi.category)}`}>
                    {getCategoryIcon(kpi.category)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{kpi.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {kpi.priority === 'high' ? 'Alta' : kpi.priority === 'medium' ? 'Media' : 'Baja'} Prioridad
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {kpi.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : kpi.trend === 'down' ? (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  ) : (
                    <div className="w-4 h-4 text-gray-400">—</div>
                  )}
                </div>
              </div>

              {/* Value and Target */}
              <div className="space-y-2">
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-bold">
                    {formatValue(kpi.value, kpi.unit)}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {formatValue(kpi.target, kpi.unit)}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <Progress 
                    value={(kpi.value / kpi.target) * 100} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round((kpi.value / kpi.target) * 100)}%</span>
                    <span>Meta: {formatValue(kpi.target, kpi.unit)}</span>
                  </div>
                </div>
              </div>

              {/* Change Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  {kpi.change > 0 ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${
                    kpi.change > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {kpi.change > 0 ? '+' : ''}{kpi.change}%
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {kpi.trend === 'up' ? 'Mejorando' : kpi.trend === 'down' ? 'Bajando' : 'Estable'}
                </Badge>
              </div>

              {/* Additional Details */}
              {showDetails && (
                <div className="pt-4 border-t border-border/50 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Rendimiento:</span>
                    <span className="font-medium">
                      {kpi.value >= kpi.target ? '✅ Meta alcanzada' : '⚠️ Pendiente'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Tendencia:</span>
                    <span className="font-medium">
                      {kpi.trend === 'up' ? '📈 Positiva' : kpi.trend === 'down' ? '📉 Negativa' : '➡️ Estable'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">KPIs Alcanzados</p>
              <p className="text-2xl font-bold text-green-600">
                {kpis.filter(k => k.value >= k.target).length}/{kpis.length}
              </p>
            </div>
            <Award className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Promedio de Rendimiento</p>
                              <p className="text-2xl font-bold text-green-600">
                {Math.round(kpis.reduce((acc, k) => acc + (k.value / k.target) * 100, 0) / kpis.length)}%
              </p>
            </div>
                            <Target className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tendencias Positivas</p>
              <p className="text-2xl font-bold text-purple-600">
                {kpis.filter(k => k.trend === 'up').length}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Necesitan Atención</p>
              <p className="text-2xl font-bold text-orange-600">
                {kpis.filter(k => k.value < k.target && k.priority === 'high').length}
              </p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-500" />
          </div>
        </Card>
      </div>
    </div>
  );
}
