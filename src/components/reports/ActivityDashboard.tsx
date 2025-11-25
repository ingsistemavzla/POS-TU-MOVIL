import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Users, 
  ShoppingCart, 
  Package, 
  TrendingUp,
  Clock,
  MapPin,
  DollarSign,
  BarChart3,
  Eye
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'sale' | 'user' | 'inventory' | 'system';
  title: string;
  description: string;
  amount?: number;
  location?: string;
  user?: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
}

interface ActivityDashboardProps {
  data?: {
    currentMonthSales: number;
    todayTransactions: number;
    averageTicket: number;
    averageMargin: number;
  };
}

export function ActivityDashboard({ data }: ActivityDashboardProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [activeUsers, setActiveUsers] = useState(24);
  const [systemLoad, setSystemLoad] = useState(65);
  const [showDetails, setShowDetails] = useState(false);

  // Simular actividades en tiempo real
  useEffect(() => {
    const mockActivities: ActivityItem[] = [
      {
        id: '1',
        type: 'sale',
        title: 'Venta Completada',
        description: 'Laptop HP Pavilion - $1,250.00',
        amount: 1250,
        location: 'Tienda Centro',
        user: 'María González',
        timestamp: new Date(),
        status: 'completed'
      },
      {
        id: '2',
        type: 'user',
        title: 'Usuario Conectado',
        description: 'Nuevo cajero inició sesión',
        user: 'Carlos Rodríguez',
        location: 'Tienda Norte',
        timestamp: new Date(Date.now() - 2 * 60 * 1000),
        status: 'completed'
      },
      {
        id: '3',
        type: 'inventory',
        title: 'Stock Actualizado',
        description: 'Producto "Mouse Gaming" - 15 unidades',
        location: 'Almacén Principal',
        user: 'Sistema Automático',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        status: 'completed'
      },
      {
        id: '4',
        type: 'system',
        title: 'Backup Completado',
        description: 'Respaldo de base de datos exitoso',
        location: 'Servidor Principal',
        user: 'Sistema',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        status: 'completed'
      },
      {
        id: '5',
        type: 'sale',
        title: 'Venta Pendiente',
        description: 'Monitor Samsung - $450.00',
        amount: 450,
        location: 'Tienda Sur',
        user: 'Ana López',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        status: 'pending'
      }
    ];

    setActivities(mockActivities);

    // Simular nuevas actividades
    const interval = setInterval(() => {
      const newActivity: ActivityItem = {
        id: Date.now().toString(),
        type: ['sale', 'user', 'inventory'][Math.floor(Math.random() * 3)] as any,
        title: 'Nueva Actividad',
        description: 'Actividad detectada en el sistema',
        location: 'Sistema',
        user: 'Usuario',
        timestamp: new Date(),
        status: 'completed'
      };

      setActivities(prev => [newActivity, ...prev.slice(0, 9)]);
    }, 45000);

    // Simular cambios en usuarios activos
    const userInterval = setInterval(() => {
      setActiveUsers(prev => Math.max(15, Math.min(35, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 30000);

    // Simular cambios en carga del sistema
    const loadInterval = setInterval(() => {
      setSystemLoad(prev => Math.max(20, Math.min(90, prev + (Math.random() > 0.5 ? 5 : -5))));
    }, 20000);

    return () => {
      clearInterval(interval);
      clearInterval(userInterval);
      clearInterval(loadInterval);
    };
  }, []);

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'sale': return <ShoppingCart className="w-4 h-4 text-green-500" />;
                      case 'user': return <Users className="w-4 h-4 text-green-500" />;
      case 'inventory': return <Package className="w-4 h-4 text-orange-500" />;
      case 'system': return <Activity className="w-4 h-4 text-purple-500" />;
    }
  };

  const getStatusColor = (status: ActivityItem['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours}h`;
    return date.toLocaleDateString('es-VE');
  };

  const displayedActivities = showDetails ? activities : activities.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Usuarios Activos</p>
                              <p className="text-2xl font-bold text-green-600">{activeUsers}</p>
            </div>
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2">
            <Progress value={activeUsers} max={50} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((activeUsers / 50) * 100)}% de capacidad
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Carga del Sistema</p>
              <p className="text-2xl font-bold text-orange-600">{systemLoad}%</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Activity className="w-6 h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-2">
            <Progress value={systemLoad} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {systemLoad > 80 ? 'Alta carga' : systemLoad > 60 ? 'Carga moderada' : 'Carga normal'}
            </p>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Actividad Reciente</p>
              <p className="text-2xl font-bold text-green-600">{activities.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center space-x-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600">+12% vs ayer</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Live Activity Feed */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Actividad en Tiempo Real</h3>
            <Badge variant="secondary" className="animate-pulse">
              En vivo
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            <Eye className="w-4 h-4 mr-2" />
            {showDetails ? 'Ver Menos' : 'Ver Más'}
          </Button>
        </div>

        <div className="space-y-3">
          {displayedActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{activity.title}</h4>
                  <Badge variant="outline" className={`text-xs ${getStatusColor(activity.status)}`}>
                    {activity.status === 'completed' ? 'Completado' : 
                     activity.status === 'pending' ? 'Pendiente' : 'Fallido'}
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
                
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  {activity.amount && (
                    <div className="flex items-center space-x-1">
                      <DollarSign className="w-3 h-3" />
                      <span>{activity.amount.toLocaleString('es-VE')}</span>
                    </div>
                  )}
                  
                  {activity.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{activity.location}</span>
                    </div>
                  )}
                  
                  {activity.user && (
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{activity.user}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{formatTime(activity.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {activities.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay actividad reciente</p>
          </div>
        )}
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Métricas de Rendimiento</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Tiempo de Respuesta</span>
              <Badge variant="default">0.2s</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Disponibilidad</span>
              <Badge variant="default">99.9%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Errores (24h)</span>
              <Badge variant="destructive">2</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-semibold mb-3">Actividad por Tipo</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Ventas</span>
              <Badge variant="default">
                {activities.filter(a => a.type === 'sale').length}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Usuarios</span>
              <Badge variant="default">
                {activities.filter(a => a.type === 'user').length}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Inventario</span>
              <Badge variant="default">
                {activities.filter(a => a.type === 'inventory').length}
              </Badge>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
