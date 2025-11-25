import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, MapPin, Users, TrendingUp, Plus, Settings, MoreHorizontal } from "lucide-react";

const mockStores = [
  {
    id: "1",
    name: "Tienda Principal",
    address: "Av. Principal, Centro, Caracas",
    manager: "María González",
    status: "active" as const,
    dailySales: 2847.50,
    employees: 8,
    products: 450
  },
  {
    id: "2", 
    name: "Sucursal Este",
    address: "C.C. Sambil, Chacao, Caracas",
    manager: "Carlos Ruiz",
    status: "active" as const,
    dailySales: 1920.75,
    employees: 5,
    products: 380
  },
  {
    id: "3",
    name: "Tienda Norte",
    address: "Los Teques, Miranda",
    manager: "Ana Pérez", 
    status: "maintenance" as const,
    dailySales: 0,
    employees: 3,
    products: 200
  }
];

export default function Stores() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Tiendas</h1>
          <p className="text-muted-foreground">Administra todas tus tiendas desde un solo lugar</p>
        </div>
        <Button className="btn-premium bg-gradient-primary glow-primary">
          <Plus className="w-4 h-4 mr-2" />
          Nueva Tienda
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 glass-card hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Tiendas</p>
              <p className="text-2xl font-bold animate-counter">{mockStores.length}</p>
            </div>
            <Store className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6 glass-card hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tiendas Activas</p>
              <p className="text-2xl font-bold text-success animate-counter">
                {mockStores.filter(s => s.status === 'active').length}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-success" />
          </div>
        </Card>

        <Card className="p-6 glass-card hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Empleados</p>
              <p className="text-2xl font-bold animate-counter">
                {mockStores.reduce((sum, store) => sum + store.employees, 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-accent" />
          </div>
        </Card>

        <Card className="p-6 glass-card hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ventas Hoy</p>
              <p className="text-2xl font-bold text-success animate-counter">
                ${mockStores.reduce((sum, store) => sum + store.dailySales, 0).toFixed(2)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-success" />
          </div>
        </Card>
      </div>

      {/* Stores Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {mockStores.map((store, index) => (
          <Card 
            key={store.id} 
            className="p-6 glass-card hover-glow cursor-pointer transition-all duration-200 hover:scale-105"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="space-y-4">
              {/* Store Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-primary glow-primary flex items-center justify-center">
                    <Store className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{store.name}</h3>
                    <Badge 
                      className={
                        store.status === 'active' 
                          ? "bg-success/20 text-success border-success/30" 
                          : "bg-warning/20 text-warning border-warning/30"
                      }
                    >
                      {store.status === 'active' ? 'Activa' : 'Mantenimiento'}
                    </Badge>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="hover-glow">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>

              {/* Store Info */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{store.address}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>Gerente: <span className="font-medium">{store.manager}</span></span>
                </div>
              </div>

              {/* Store Stats */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border/50">
                <div className="text-center">
                  <p className="text-lg font-bold text-success">${store.dailySales.toFixed(0)}</p>
                  <p className="text-xs text-muted-foreground">Ventas Hoy</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{store.employees}</p>
                  <p className="text-xs text-muted-foreground">Empleados</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{store.products}</p>
                  <p className="text-xs text-muted-foreground">Productos</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1 hover-glow">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Ver Reportes
                </Button>
                <Button size="sm" variant="outline" className="hover-glow">
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card className="p-6 glass-card">
        <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button variant="outline" className="h-16 flex-col space-y-2 hover-glow">
            <Store className="w-5 h-5" />
            <span className="text-sm">Configurar Nueva Tienda</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col space-y-2 hover-glow">
            <Users className="w-5 h-5" />
            <span className="text-sm">Asignar Personal</span>
          </Button>
          <Button variant="outline" className="h-16 flex-col space-y-2 hover-glow">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm">Comparar Rendimiento</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}