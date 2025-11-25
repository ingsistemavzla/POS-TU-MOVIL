import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  X, 
  Bell,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  Users
} from 'lucide-react';

interface Alert {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
  category: 'sales' | 'inventory' | 'system' | 'user';
}

interface LiveAlertsProps {
  alerts?: Alert[];
}

export function LiveAlerts({ alerts = [] }: LiveAlertsProps) {
  const [liveAlerts, setLiveAlerts] = useState<Alert[]>(alerts);
  const [showAll, setShowAll] = useState(false);

  // Simular alertas en tiempo real
  useEffect(() => {
    const mockAlerts: Alert[] = [
      {
        id: '1',
        type: 'success',
        title: 'Venta Completada',
        message: 'Nueva venta registrada: $1,250.00 - Tienda Centro',
        timestamp: new Date(),
        priority: 'low',
        category: 'sales'
      },
      {
        id: '2',
        type: 'warning',
        title: 'Stock Bajo',
        message: 'Producto "Laptop HP" tiene solo 3 unidades en inventario',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        priority: 'medium',
        category: 'inventory'
      },
      {
        id: '3',
        type: 'info',
        title: 'Usuario Nuevo',
        message: 'Nuevo cajero registrado: María González',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        priority: 'low',
        category: 'user'
      },
      {
        id: '4',
        type: 'error',
        title: 'Error de Sistema',
        message: 'Problema de conexión con la impresora de tickets',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        priority: 'high',
        category: 'system'
      },
      {
        id: '5',
        type: 'success',
        title: 'Meta Alcanzada',
        message: 'Ventas del día superaron la meta establecida',
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
        priority: 'medium',
        category: 'sales'
      }
    ];

    setLiveAlerts(mockAlerts);

    // Simular nuevas alertas cada 30 segundos
    const interval = setInterval(() => {
      const newAlert: Alert = {
        id: Date.now().toString(),
        type: ['success', 'warning', 'info'][Math.floor(Math.random() * 3)] as any,
        title: 'Nueva Actividad',
        message: 'Actividad detectada en el sistema',
        timestamp: new Date(),
        priority: ['low', 'medium'][Math.floor(Math.random() * 2)] as any,
        category: ['sales', 'inventory', 'user'][Math.floor(Math.random() * 3)] as any
      };

      setLiveAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const getIcon = (type: Alert['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getCategoryIcon = (category: Alert['category']) => {
    switch (category) {
      case 'sales': return <DollarSign className="w-3 h-3" />;
      case 'inventory': return <Package className="w-3 h-3" />;
      case 'user': return <Users className="w-3 h-3" />;
      case 'system': return <Bell className="w-3 h-3" />;
    }
  };

  const getPriorityColor = (priority: Alert['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
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

  const dismissAlert = (id: string) => {
    setLiveAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const displayedAlerts = showAll ? liveAlerts : liveAlerts.slice(0, 5);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Alertas en Tiempo Real</h3>
          <Badge variant="secondary" className="animate-pulse">
            {liveAlerts.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? 'Mostrar Menos' : 'Ver Todas'}
        </Button>
      </div>

      <ScrollArea className="h-80">
        <div className="space-y-3">
          {displayedAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border transition-all duration-200 hover:shadow-md ${getPriorityColor(alert.priority)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  {getIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {getCategoryIcon(alert.category)}
                        <span className="ml-1 capitalize">{alert.category}</span>
                      </Badge>
                    </div>
                    <p className="text-sm opacity-90">{alert.message}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {formatTime(alert.timestamp)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
                  onClick={() => dismissAlert(alert.id)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {liveAlerts.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No hay alertas activas</p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Alertas Críticas:</span>
            <Badge variant="destructive">
              {liveAlerts.filter(a => a.priority === 'high').length}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Ventas Hoy:</span>
            <Badge variant="default">
              {liveAlerts.filter(a => a.category === 'sales').length}
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
}
