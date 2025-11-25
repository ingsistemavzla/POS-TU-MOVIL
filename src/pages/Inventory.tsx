import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  AlertTriangle, 
  TrendingUp,
  Search, 
  Filter,
  Download,
  Edit,
  MoreHorizontal, 
  Smartphone, 
  Headphones, 
  Wrench
} from "lucide-react";
import { PRODUCT_CATEGORIES, getCategoryLabel } from "@/constants/categories";
import { CategoryInventoryCards } from "@/components/inventory/CategoryInventoryCards";
import { useState } from "react";

const mockInventory = [
  { 
    id: "1", 
    sku: "IP001", 
    name: "iPhone 14", 
    category: "phones",
    stock: 15, 
    minStock: 10, 
    price: 899.00,
    cost: 750.00,
    supplier: "Apple",
    status: "normal" as const
  },
  { 
    id: "2", 
    sku: "AC001", 
    name: "Cargador USB-C", 
    category: "accessories",
    stock: 25, 
    minStock: 15, 
    price: 29.99,
    cost: 20.00,
    supplier: "Samsung",
    status: "normal" as const
  },
  { 
    id: "3", 
    sku: "ST001", 
    name: "Servicio Técnico", 
    category: "technical_service",
    stock: 0, 
    minStock: 0, 
    price: 50.00,
    cost: 0.00,
    supplier: "Interno",
    status: "normal" as const
  },
  { 
    id: "4", 
    sku: "CC600", 
    name: "Coca Cola 600ml", 
    category: "phones",
    stock: 45, 
    minStock: 20, 
    price: 1.50,
    cost: 1.00,
    supplier: "Coca Cola",
    status: "normal" as const
  },
  { 
    id: "5", 
    sku: "PT001", 
    name: "Pan Tostado", 
    category: "accessories",
    stock: 8, 
    minStock: 15, 
    price: 2.00,
    cost: 1.50,
    supplier: "Panadería Local",
    status: "low" as const
  },
  { 
    id: "6", 
    sku: "LE1000", 
    name: "Leche Entera 1L", 
    category: "phones",
    stock: 25, 
    minStock: 10, 
    price: 3.50,
    cost: 2.80,
    supplier: "Lácteos del Valle",
    status: "normal" as const
  },
  { 
    id: "7", 
    sku: "CI200", 
    name: "Café Instantáneo", 
    category: "accessories",
    stock: 3, 
    minStock: 8, 
    price: 4.50,
    cost: 3.60,
    supplier: "Café Premium",
    status: "low" as const
  },
  { 
    id: "8", 
    sku: "AV1000", 
    name: "Aceite Vegetal 1L", 
    category: "technical_service",
    stock: 18, 
    minStock: 12, 
    price: 5.00,
    cost: 4.00,
    supplier: "Aceites Naturales",
    status: "normal" as const
  },
  { 
    id: "9", 
    sku: "PH001", 
    name: "iPhone 15 Pro", 
    category: "phones",
    stock: 12, 
    minStock: 5, 
    price: 999.00,
    cost: 850.00,
    supplier: "Apple",
    status: "normal" as const
  },
  { 
    id: "10", 
    sku: "AC002", 
    name: "Cargador USB-C", 
    category: "accessories",
    stock: 30, 
    minStock: 15, 
    price: 25.00,
    cost: 18.00,
    supplier: "Samsung",
    status: "normal" as const
  },
  { 
    id: "11", 
    sku: "ST002", 
    name: "Servicio Técnico", 
    category: "technical_service",
    stock: 0, 
    minStock: 0, 
    price: 50.00,
    cost: 0.00,
    supplier: "Interno",
    status: "normal" as const
  }
];

export default function Inventory() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const totalProducts = mockInventory.length;
  const lowStockItems = mockInventory.filter(item => item.status === "low" || item.status === "critical").length;
  const totalValue = mockInventory.reduce((sum, item) => sum + (item.stock * item.cost), 0);
  
  // Calcular estadísticas por categoría para el componente
  const getCategoryInventoryData = () => {
    console.log('Calculating category inventory data...');
    const data = PRODUCT_CATEGORIES.map(category => {
      const productsInCategory = mockInventory.filter(item => item.category === category.value);
      const totalStock = productsInCategory.reduce((sum, item) => sum + item.stock, 0);
      const totalValue = productsInCategory.reduce((sum, item) => sum + (item.stock * item.cost), 0);
      const lowStockCount = productsInCategory.filter(item => item.status === "low").length;
      const outOfStockCount = productsInCategory.filter(item => item.stock === 0).length;
      const averagePrice = productsInCategory.length > 0 
        ? productsInCategory.reduce((sum, item) => sum + item.price, 0) / productsInCategory.length 
        : 0;
      
      const result = {
        category: category.value,
        productCount: productsInCategory.length,
        totalStock,
        totalValue,
        lowStockCount,
        outOfStockCount,
        averagePrice
      };
      
      console.log(`Category ${category.value}:`, result);
      return result;
    }).filter(cat => cat.productCount > 0); // Solo mostrar categorías con productos
    
    console.log('Final category data:', data);
    return data;
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "low":
        return <Badge variant="secondary" className="bg-warning/20 text-warning hover:bg-warning/30">Stock Bajo</Badge>;
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
      case "out":
        return <Badge variant="destructive">Sin Stock</Badge>;
      default:
        return <Badge variant="outline" className="bg-success/20 text-success hover:bg-success/30">Normal</Badge>;
    }
  };

  // Filtrar inventario según categoría seleccionada y búsqueda
  const filteredInventory = mockInventory.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCategoryLabel(item.category).toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const categoryInventoryData = getCategoryInventoryData();

  // Handlers para el componente de categorías
  const handleCategoryClick = (category: string) => {
    console.log('Category clicked:', category);
    setSelectedCategory(category);
  };

  const handleAddProduct = (category: string) => {
    console.log(`Agregar producto a categoría: ${category}`);
    // Aquí se implementaría la lógica para agregar productos
  };

  const handleViewProducts = (category: string) => {
    console.log(`Ver productos de categoría: ${category}`);
    setSelectedCategory(category);
    // Aquí se implementaría la lógica para ver productos de la categoría
  };

  console.log('Inventory component rendered with:', {
    selectedCategory,
    searchTerm,
    categoryInventoryData,
    totalProducts,
    lowStockItems,
    totalValue
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 glass-card hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Productos</p>
              <p className="text-2xl font-bold animate-counter">{totalProducts}</p>
            </div>
            <Package className="w-8 h-8 text-primary" />
          </div>
        </Card>

        <Card className="p-6 glass-card hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Stock Bajo</p>
              <p className="text-2xl font-bold text-warning animate-counter">{lowStockItems}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-warning" />
          </div>
        </Card>

        <Card className="p-6 glass-card hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Valor Inventario</p>
              <p className="text-2xl font-bold text-success animate-counter">${totalValue.toFixed(2)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-success" />
          </div>
        </Card>

        <Card className="p-6 glass-card hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Categorías</p>
              <p className="text-2xl font-bold animate-counter">{PRODUCT_CATEGORIES.length}</p>
            </div>
            <Package className="w-8 h-8 text-accent" />
          </div>
        </Card>
      </div>

      {/* Montos Totales por Categorías */}
      <Card className="p-6 glass-card hover-glow">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">Montos Totales por Categorías</h3>
            <Badge variant="outline" className="text-xs">
              Valor Total: ${totalValue.toFixed(2)}
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {PRODUCT_CATEGORIES.map((category) => {
              const productsInCategory = mockInventory.filter(item => item.category === category.value);
              const categoryTotalValue = productsInCategory.reduce((sum, item) => sum + (item.stock * item.price), 0);
              const categoryTotalStock = productsInCategory.reduce((sum, item) => sum + item.stock, 0);
              const categoryProductCount = productsInCategory.length;
              
              return (
                <div key={category.value} className="p-4 bg-muted/30 rounded-lg border border-border/30">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-sm text-primary">{category.label}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {categoryProductCount} productos
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Valor Total:</span>
                      <span className="font-semibold text-success">${categoryTotalValue.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Stock Total:</span>
                      <span className="font-medium text-blue-600">{categoryTotalStock} unidades</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Precio Promedio:</span>
                      <span className="font-medium text-orange-600">
                        ${categoryProductCount > 0 ? (categoryTotalValue / categoryTotalStock).toFixed(2) : '0.00'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-2 border-t border-border/20">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">% del Total:</span>
                      <span className="font-medium text-primary">
                        {totalValue > 0 ? ((categoryTotalValue / totalValue) * 100).toFixed(1) : '0'}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Category Cards - Usando el nuevo componente */}
      <div className="border-4 border-red-500 p-6 rounded-lg bg-yellow-100">
        <h3 className="text-2xl font-bold mb-4 text-red-600">🔍 DEBUG: Componente de Categorías</h3>
        <p className="mb-4 text-sm">Datos disponibles: {JSON.stringify(categoryInventoryData)}</p>
        <p className="mb-4 text-sm">Categorías totales: {PRODUCT_CATEGORIES.length}</p>
        <p className="mb-4 text-sm">Productos en inventario: {mockInventory.length}</p>
        
        {/* Componente de prueba simple */}
        <div className="mb-6 p-4 bg-blue-100 border-2 border-blue-500 rounded-lg">
          <h4 className="text-lg font-bold text-blue-800 mb-2">🧪 COMPONENTE DE PRUEBA</h4>
          <p className="text-blue-700">Si ves esto, el componente se está renderizando</p>
          <p className="text-blue-700">Categorías: {PRODUCT_CATEGORIES.map(c => c.label).join(', ')}</p>
          <p className="text-blue-700">Datos: {categoryInventoryData.length} categorías con datos</p>
        </div>
        
        {/* Componente de categorías */}
        <CategoryInventoryCards
          inventoryData={categoryInventoryData}
          onCategoryClick={handleCategoryClick}
          onAddProduct={handleAddProduct}
          onViewProducts={handleViewProducts}
        />
      </div>

      {/* Actions Bar */}
      <Card className="p-4 glass-card">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-3 w-full sm:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 glass-card border-primary/20 focus:border-primary focus:glow-primary"
              />
            </div>
            <Button variant="outline" className="hover-glow">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" className="hover-glow">
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
            <Button className="bg-gradient-primary glow-primary hover:glow-primary/80">
              <Package className="w-4 h-4 mr-2" />
              Agregar Producto
            </Button>
          </div>
        </div>
      </Card>

      {/* Category Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={selectedCategory === 'all' ? "default" : "outline"}
          size="sm"
          className={selectedCategory === 'all' ? "bg-gradient-primary glow-primary" : "hover-glow"}
          onClick={() => setSelectedCategory('all')}
        >
          Todos
        </Button>
        {PRODUCT_CATEGORIES.map((category) => (
          <Button
            key={category.value}
            variant={selectedCategory === category.value ? "default" : "outline"}
            size="sm"
            className={selectedCategory === category.value ? "bg-gradient-primary glow-primary" : "hover-glow"}
            onClick={() => setSelectedCategory(category.value)}
          >
            {category.label}
          </Button>
        ))}
      </div>

      {/* Inventory Table */}
      <Card className="glass-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left p-4 font-medium text-muted-foreground">Producto</th>
                <th className="text-left p-4 font-medium text-muted-foreground">SKU</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Categoría</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Stock</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Precio</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Costo</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Estado</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.map((item, index) => (
                <tr 
                  key={item.id} 
                  className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-glow flex items-center justify-center">
                        <Package className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">{item.supplier}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <code className="px-2 py-1 bg-muted rounded text-sm">{item.sku}</code>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline">{getCategoryLabel(item.category)}</Badge>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="font-semibold">{item.stock}</p>
                      <p className="text-sm text-muted-foreground">Min: {item.minStock}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-success">${item.price}</p>
                  </td>
                  <td className="p-4">
                    <p className="font-medium">${item.cost}</p>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      <Button size="sm" variant="ghost" className="hover-glow">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="hover-glow">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 glass-card hover-glow cursor-pointer transition-all duration-200 hover:scale-105">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center glow-primary">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Entrada de Inventario</h3>
              <p className="text-sm text-muted-foreground">Registrar nueva mercancía</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 glass-card hover-glow cursor-pointer transition-all duration-200 hover:scale-105">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-warning/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold">Ajuste de Inventario</h3>
              <p className="text-sm text-muted-foreground">Corregir diferencias</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 glass-card hover-glow cursor-pointer transition-all duration-200 hover:scale-105">
          <div className="flex items-center justify-center space-x-4">
            <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h3 className="font-semibold">Traspaso entre Tiendas</h3>
              <p className="text-sm text-muted-foreground">Mover stock</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
