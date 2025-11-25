import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Clock,
  Activity
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/currency';

interface RealTimeStatsProps {
  data: {
    currentMonthSales: number;
    todayTransactions: number;
    averageTicket: number;
    averageMargin: number;
  };
}

export function RealTimeStats({ data }: RealTimeStatsProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const checkOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);

    return () => {
      window.removeEventListener('online', checkOnlineStatus);
      window.removeEventListener('offline', checkOnlineStatus);
    };
  }, []);

  const stats = [
    {
      label: "Ventas del Mes",
      value: formatCurrency(data.currentMonthSales),
      change: "+12.5%",
      positive: true,
      icon: DollarSign,
      color: "primary"
    },
    {
      label: "Transacciones Hoy",
      value: data.todayTransactions.toString(),
      change: "+8.2%",
      positive: true,
      icon: ShoppingCart,
      color: "success"
    },
    {
      label: "Ticket Promedio",
      value: formatCurrency(data.averageTicket),
      change: "-2.1%",
      positive: false,
      icon: Users,
      color: "accent"
    },
    {
      label: "Margen Promedio",
      value: `${data.averageMargin.toFixed(1)}%`,
      change: "+1.8%",
      positive: true,
      icon: TrendingUp,
      color: "warning"
    }
  ];

  return (
    <div className="space-y-4">
      {/* Status Bar */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">
            {isOnline ? 'En línea' : 'Sin conexión'}
          </span>
          <Activity className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{currentTime.toLocaleTimeString('es-VE')}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={stat.label} 
              className="p-4 hover-glow transition-all duration-200 hover:scale-105"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    stat.color === 'primary' ? 'bg-green-100' :
                    stat.color === 'success' ? 'bg-green-100' :
                    stat.color === 'accent' ? 'bg-purple-100' :
                    stat.color === 'warning' ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      stat.color === 'primary' ? 'text-green-600' :
                      stat.color === 'success' ? 'text-green-600' :
                      stat.color === 'accent' ? 'text-purple-600' :
                      stat.color === 'warning' ? 'text-yellow-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <Badge variant={stat.positive ? "default" : "destructive"} className="text-xs">
                    {stat.positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                    {stat.change}
                  </Badge>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold animate-counter">{stat.value}</p>
                </div>

                {/* Live indicator */}
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-muted-foreground">En tiempo real</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Performance del Sistema</p>
              <p className="text-lg font-bold text-green-600">98.5%</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tiempo de Respuesta</p>
                              <p className="text-lg font-bold text-green-600">0.2s</p>
            </div>
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Usuarios Activos</p>
              <p className="text-lg font-bold text-purple-600">24</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
