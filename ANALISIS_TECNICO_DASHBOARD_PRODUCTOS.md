# 📊 ANÁLISIS TÉCNICO COMPLETO - Dashboard y Módulo de Productos

**Fecha:** 5 de Noviembre, 2025  
**Objetivo:** Documentar características técnicas y visuales para facilitar modificaciones

---

## 🎯 TABLA DE CONTENIDOS

1. [Dashboard Principal](#1-dashboard-principal)
2. [Módulo de Productos](#2-módulo-de-productos)
3. [Guía de Modificaciones](#3-guía-de-modificaciones)

---

## 1. 📊 DASHBOARD PRINCIPAL

### 1.1. CARACTERÍSTICAS TÉCNICAS - FRONTEND

#### **Archivo Principal**
- **Ubicación:** `src/pages/Dashboard.tsx`
- **Líneas:** ~610 líneas
- **Tipo:** Componente React funcional

#### **Hooks Utilizados**

| Hook | Ubicación | Propósito | Datos Retornados |
|------|-----------|-----------|------------------|
| `useDashboardData()` | `src/hooks/useDashboardData.ts` | Datos principales del dashboard | Ventas, órdenes, productos, stock crítico |
| `useKreceStats(period)` | `src/hooks/useKreceStats.ts` | Estadísticas Krece | Financiamiento, iniciales, cuentas por cobrar |
| `usePaymentMethodsData(period)` | `src/hooks/usePaymentMethodsData.ts` | Métodos de pago | Total USD/BS, transacciones, porcentajes |
| `useAuth()` | `src/contexts/AuthContext.tsx` | Autenticación | Usuario, perfil, empresa |

#### **Estado del Componente**

```typescript
const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('today');
const [refreshing, setRefreshing] = useState(false);

// Estados de los hooks:
// - dashboardData: DashboardData | null
// - loading: boolean
// - error: string | null
// - kreceStats: KreceStats
// - paymentMethodsData: PaymentMethodsData
```

#### **Períodos Soportados**
- `'today'` - Hoy
- `'yesterday'` - Ayer
- `'thisMonth'` - Este Mes

#### **Filtrado por Rol**

```typescript
// Admin: Ve todos los datos de todas las tiendas
// Manager: Ve solo datos de su tienda asignada
// Cashier: Ve datos limitados de su tienda asignada
```

---

### 1.2. CARACTERÍSTICAS VISUALES - FRONTEND

#### **Estructura de Layout**

```
Dashboard
├── Header (Título + Selector de Período + Botón Actualizar)
├── 4 Cards Principales (Métricas)
│   ├── Total Facturado
│   ├── Ingreso Neto
│   ├── Financiamiento Krece
│   └── Ingreso por Krece
├── Resumen por Tienda (Card con Grid)
│   └── StoreSummaryCard (x N tiendas)
├── Grid de 2 Columnas
│   ├── Top 10 Productos Más Vendidos (Card izquierda)
│   └── Últimas 10 Ventas (Card derecha)
├── Grid de 2 Columnas
│   ├── PaymentMethodStats (Estadísticas de métodos)
│   └── PaymentMethodSummary (Resumen de métodos)
└── Stock Crítico (Card condicional, solo si hay stock crítico)
```

#### **Componentes Visuales Utilizados**

| Componente | Ubicación | Uso |
|------------|-----------|-----|
| `Card` | `@/components/ui/card` | Contenedor principal |
| `Button` | `@/components/ui/button` | Botones de acción |
| `PaymentMethodStats` | `src/components/dashboard/PaymentMethodStats.tsx` | Gráfico/lista de métodos de pago |
| `PaymentMethodSummary` | `src/components/dashboard/PaymentMethodSummary.tsx` | Resumen de métodos |
| `StoreSummaryCard` | `src/components/dashboard/StoreSummaryCard.tsx` | Tarjeta de resumen por tienda |

#### **Iconos (Lucide React)**
- `DollarSign` - Dinero
- `ShoppingCart` - Ventas
- `TrendingUp` - Tendencias
- `Package` - Productos
- `AlertTriangle` - Alertas
- `Receipt` - Facturas
- `CreditCard` - Métodos de pago
- `Building2` - Tiendas
- `BarChart3` - Gráficos
- `Calendar` - Fechas
- `RefreshCw` - Actualizar

#### **Colores y Estilos**

| Elemento | Color | Clase CSS |
|----------|-------|-----------|
| Total Facturado | Azul | `text-blue-600` |
| Ingreso Neto | Verde | `text-green-600` |
| Financiamiento Krece | Naranja | `text-orange-600` |
| Ingreso Krece | Morado | `text-purple-600` |
| Stock Crítico | Rojo | `text-red-600`, `bg-red-50` |
| Cambio Positivo | Verde | `text-green-600` |
| Cambio Negativo | Rojo | `text-red-600` |

#### **Responsive Design**
- **Móvil:** 1 columna (stack vertical)
- **Tablet:** 2 columnas (`md:grid-cols-2`)
- **Desktop:** 4 columnas (`lg:grid-cols-4`)

---

### 1.3. CARACTERÍSTICAS TÉCNICAS - BACKEND

#### **Tablas de Base de Datos Utilizadas**

| Tabla | Uso en Dashboard |
|-------|------------------|
| `sales` | Ventas totales, órdenes, promedio |
| `sale_items` | Productos más vendidos |
| `sale_payments` | Métodos de pago, ingreso neto |
| `inventories` | Stock crítico |
| `products` | Información de productos |
| `stores` | Resumen por tienda |
| `krece_financing` | Financiamiento Krece |
| `krece_accounts_receivable` | Cuentas por cobrar |

#### **Consultas SQL Principales (vía Supabase Client)**

**1. Ventas Generales:**
```typescript
supabase.from('sales')
  .select('id, total_bs, total_usd, created_at, store_id')
  .eq('company_id', company.id)
  .gte('created_at', thirtyDaysAgo.toISOString())
```

**2. Ventas Recientes:**
```typescript
supabase.from('sales')
  .select(`
    id, total_bs, total_usd, created_at, store_id,
    customers(name),
    stores(name)
  `)
  .eq('company_id', company.id)
  .order('created_at', { ascending: false })
  .limit(10)
```

**3. Productos Más Vendidos:**
```typescript
supabase.from('sale_items')
  .select(`
    qty, price_usd,
    products(id, name, sku),
    sales(store_id, created_at, stores(name))
  `)
  .eq('sales.company_id', company.id)
  .gte('sales.created_at', startOfMonth.toISOString())
```

**4. Stock Crítico:**
```typescript
supabase.from('inventories')
  .select(`
    qty, min_qty,
    products(id, name, sku),
    stores(id, name)
  `)
  .eq('stores.company_id', company.id)
```

**5. Métodos de Pago:**
```typescript
supabase.from('sale_payments')
  .select(`
    payment_method, amount_usd, amount_bs,
    sales!inner(company_id, created_at)
  `)
  .eq('sales.company_id', company.id)
  .gte('sales.created_at', startDate.toISOString())
  .lte('sales.created_at', endDate.toISOString())
```

**6. Estadísticas Krece:**
```typescript
supabase.from('sales')
  .select('*')
  .eq('company_id', company.id)
  .eq('krece_enabled', true)
  .gte('created_at', startDate.toISOString())
  .lt('created_at', endDate.toISOString())
```

#### **Cálculos Realizados en Frontend**

1. **Promedio por Orden:**
   ```typescript
   averageOrderValue = totalSales / totalOrders
   ```

2. **Porcentaje de Cambio:**
   ```typescript
   calculateChange(current, previous) = ((current - previous) / previous) * 100
   ```

3. **Agrupación por Tienda:**
   - Procesamiento en memoria con `Map`
   - Agregación por `store_id`

4. **Agrupación por Método de Pago:**
   - Procesamiento en memoria con `Map`
   - Cálculo de porcentajes

---

### 1.4. MÉTRICAS DISPONIBLES

#### **Métricas Generales (4 Cards Principales)**

1. **Total Facturado**
   - Valor: `totalSalesUSD` según período
   - Comparación: vs período anterior
   - Icono: Receipt (azul)
   - Actualización: En tiempo real

2. **Ingreso Neto**
   - Valor: `paymentMethodsData.totalUSD`
   - Fuente: Tabla `sale_payments`
   - Comparación: vs Total Facturado período anterior
   - Icono: DollarSign (verde)

3. **Financiamiento Krece**
   - Valor: `kreceStats.totalFinancedAmountUSD`
   - Fuente: Tabla `krece_financing`
   - Comparación: vs mes anterior
   - Icono: CreditCard (naranja)

4. **Ingreso por Krece**
   - Valor: `kreceStats.totalInitialAmountUSD`
   - Fuente: Campo `krece_initial_amount_usd` en `sales`
   - Comparación: vs mes anterior
   - Icono: TrendingUp (morado)

#### **Resumen por Tienda**

- **Componente:** `StoreSummaryCard`
- **Datos por Tienda:**
  - Total Facturado
  - Ingreso Neto (vía `useStoreSpecificData`)
  - Financiamiento Krece (vía `useStoreSpecificData`)
- **Visualización:** Grid responsive (1/2/3 columnas)

#### **Top 10 Productos Más Vendidos**

- **Datos:** Nombre, cantidad, ingresos, tienda
- **Ordenamiento:** Por cantidad vendida
- **Período:** Mes actual
- **Visualización:** Lista con ranking numérico

#### **Últimas 10 Ventas**

- **Datos:** Cliente, tienda, fecha, total
- **Ordenamiento:** Por fecha (más reciente primero)
- **Visualización:** Lista con iconos

#### **Estadísticas de Métodos de Pago**

- **Componente:** `PaymentMethodStats`
- **Datos:** Método, total USD/BS, cantidad, porcentaje
- **Métodos Soportados:**
  - `cash_usd`, `cash_bs`
  - `card_usd`, `card_bs`
  - `transfer_usd`, `transfer_bs`
  - `zelle`, `binance`
  - `krece_initial`
- **Visualización:** Lista con iconos y colores específicos

#### **Stock Crítico**

- **Condición:** Solo se muestra si hay productos con stock bajo
- **Criterio:** `qty <= min_qty` y `qty > 0`
- **Datos:** Nombre, SKU, stock actual, mínimo, tienda
- **Visualización:** Grid con badges rojos

---

### 1.5. FLUJO DE DATOS - DASHBOARD

```
1. Usuario entra al Dashboard
   ↓
2. useDashboardData() se ejecuta
   ↓
3. Consultas a Supabase (paralelas):
   - Ventas (sales)
   - Ventas recientes (sales + customers + stores)
   - Productos vendidos (sale_items + products)
   - Stock crítico (inventories + products + stores)
   - Ventas por categoría (sale_items + products)
   ↓
4. Procesamiento en memoria:
   - Agrupación por período (hoy, ayer, mes)
   - Agrupación por tienda
   - Cálculo de promedios
   - Cálculo de porcentajes
   ↓
5. useKreceStats() se ejecuta (paralelo)
   - Consulta ventas con krece_enabled = true
   - Agrupa por período
   ↓
6. usePaymentMethodsData() se ejecuta (paralelo)
   - Consulta sale_payments
   - Agrupa por método
   - Calcula porcentajes
   ↓
7. Renderizado del Dashboard con todos los datos
```

---

## 2. 📦 MÓDULO DE PRODUCTOS

### 2.1. CARACTERÍSTICAS TÉCNICAS - FRONTEND

#### **Archivo Principal**
- **Ubicación:** `src/pages/ProductsPage.tsx`
- **Líneas:** ~766 líneas
- **Tipo:** Componente React funcional

#### **Hooks Utilizados**

| Hook | Propósito | Datos |
|------|-----------|-------|
| `useAuth()` | Autenticación | Usuario, empresa, perfil |
| `useToast()` | Notificaciones | Mensajes de éxito/error |

#### **Estado del Componente**

```typescript
const [products, setProducts] = useState<Product[]>([]);
const [stores, setStores] = useState<Store[]>([]);
const [loading, setLoading] = useState(true);
const [searchTerm, setSearchTerm] = useState('');
const [categoryFilter, setCategoryFilter] = useState<string>('all');
const [showForm, setShowForm] = useState(false);
const [editingProduct, setEditingProduct] = useState<Product | null>(null);
const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
const [showStats, setShowStats] = useState(false);
const [showBulkImport, setShowBulkImport] = useState(false);
const [sortKey, setSortKey] = useState<keyof Product>('created_at');
const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(12);
```

#### **Interfaz Product**

```typescript
interface Product {
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
  total_stock?: number; // Stock total sumado de todas las tiendas
}
```

---

### 2.2. CARACTERÍSTICAS VISUALES - FRONTEND

#### **Estructura de Layout**

```
ProductsPage
├── Header
│   ├── Título "Gestión de Productos"
│   └── Botones (Solo Admin):
│       ├── Mostrar/Ocultar Estadísticas
│       ├── Importar Masivo
│       ├── Descargar Lista (CSV)
│       └── Nuevo Producto
├── CategoryStats (Condicional, si showStats = true)
├── Bulk Import Card (Condicional, si showBulkImport = true)
│   ├── Textarea para pegar CSV/TSV
│   ├── Input para subir archivo CSV
│   └── Tabla de previsualización
├── Barra de Búsqueda y Filtros
│   ├── Input de búsqueda (SKU, nombre, categoría)
│   └── Select de categoría
├── Tabla de Productos
│   ├── Header (8 columnas)
│   │   ├── SKU (ordenable)
│   │   ├── Nombre (ordenable)
│   │   ├── Categoría
│   │   ├── Costo (ordenable)
│   │   ├── Precio (ordenable)
│   │   ├── Stock (ordenable, verde)
│   │   ├── Estado
│   │   └── Acciones
│   ├── Body (filas de productos)
│   └── Paginación
└── Modales
    ├── ProductForm (Crear/Editar)
    └── DeleteConfirmDialog (Eliminar)
```

#### **Componentes Visuales Utilizados**

| Componente | Ubicación | Uso |
|------------|-----------|-----|
| `Card` | `@/components/ui/card` | Contenedores |
| `Button` | `@/components/ui/button` | Botones de acción |
| `Input` | `@/components/ui/input` | Búsqueda |
| `Select` | `@/components/ui/select` | Filtro de categoría |
| `Badge` | `@/components/ui/badge` | Categoría, Estado |
| `ProductForm` | `src/components/pos/ProductForm.tsx` | Formulario crear/editar |
| `CategoryStats` | `src/components/products/CategoryStats.tsx` | Estadísticas por categoría |
| `DeleteConfirmDialog` | `@/components/ui/delete-confirm-dialog` | Confirmación de eliminación |

#### **Características de la Tabla**

**Columnas:**
1. **SKU** - Ordenable, texto monoespaciado, gris
2. **Nombre** - Ordenable, texto destacado
3. **Categoría** - Badge con color, "Sin categoría" si es null
4. **Costo** - Alineado a la derecha, formato `$XX.XX`
5. **Precio** - Alineado a la derecha, verde, formato `$XX.XX`
6. **Stock** - Alineado a la derecha, **SIEMPRE VERDE**, formato numérico con separadores
7. **Estado** - Badge (Activo/Inactivo)
8. **Acciones** - Botones Editar/Eliminar (solo Admin)

**Ordenamiento:**
- Clic en encabezado ordena por esa columna
- Indicadores visuales: `▲` (asc) / `▼` (desc)
- Soporta ordenamiento numérico y alfabético

**Paginación:**
- Tamaños de página: 10, 12, 20, 30, 50
- Navegación: Anterior/Siguiente + números
- Información: "Mostrando X-Y de Z"

**Búsqueda:**
- Busca en: nombre, SKU, categoría
- Filtrado en tiempo real
- Case-insensitive

**Filtros:**
- Por categoría: Todas / Phones / Accessories / Other
- Combinable con búsqueda

---

### 2.3. CARACTERÍSTICAS TÉCNICAS - BACKEND

#### **Tablas de Base de Datos Utilizadas**

| Tabla | Uso en Productos |
|-------|------------------|
| `products` | Lista de productos |
| `inventories` | Stock por producto y tienda |
| `stores` | Tiendas para asignar stock |

#### **Consultas SQL Principales**

**1. Obtener Productos:**
```typescript
supabase.from('products')
  .select('id, sku, barcode, name, category, cost_usd, sale_price_usd, tax_rate, active, created_at')
  .eq('company_id', userProfile.company_id)
  .order('created_at', { ascending: false })
```

**2. Obtener Stock:**
```typescript
supabase.from('inventories')
  .select('product_id, qty')
  .eq('company_id', userProfile.company_id)

// Luego se agrupa en memoria:
const stockByProduct = new Map<string, number>();
inventoryData.forEach(item => {
  const current = stockByProduct.get(item.product_id) || 0;
  stockByProduct.set(item.product_id, current + item.qty);
});
```

**3. Crear Producto:**
```typescript
supabase.rpc('create_product_with_inventory', {
  p_sku: string,
  p_barcode: string,
  p_name: string,
  p_category: string,
  p_cost_usd: number,
  p_sale_price_usd: number,
  p_store_inventories: [{ store_id, qty, min_qty }]
})
```

**4. Eliminar Producto:**
```typescript
supabase.from('products')
  .delete()
  .eq('id', productId)
```

#### **Funciones SQL Utilizadas**

**1. `create_product_with_inventory()`**
- **Ubicación:** `supabase/migrations/20250826180000_enhance_products_inventory.sql`
- **Parámetros:**
  - `p_sku`, `p_barcode`, `p_name`, `p_category`
  - `p_cost_usd`, `p_sale_price_usd`
  - `p_store_inventories` (JSONB array)
- **Retorna:** Producto creado
- **Permisos:** Solo admin
- **Funcionalidad:**
  - Crea producto en tabla `products`
  - Crea registros en `inventories` para cada tienda
  - Valida permisos

---

### 2.4. FUNCIONALIDADES DEL MÓDULO

#### **1. Listar Productos**
- ✅ Vista de tabla paginada
- ✅ Búsqueda en tiempo real
- ✅ Filtro por categoría
- ✅ Ordenamiento por columna
- ✅ Muestra stock total (sumado de todas las tiendas)
- ✅ Stock en color verde

#### **2. Crear Producto**
- ✅ Modal con formulario (`ProductForm`)
- ✅ Campos: SKU, barcode, nombre, categoría, costo, precio, IVA
- ✅ Asignación de stock inicial por tienda
- ✅ Validación de permisos (solo admin)
- ✅ Validación de SKU único por empresa

#### **3. Editar Producto**
- ✅ Mismo modal que crear
- ✅ Pre-carga datos del producto
- ✅ Actualiza stock por tienda
- ✅ Validación de permisos

#### **4. Eliminar Producto**
- ✅ Confirmación antes de eliminar
- ✅ Elimina producto y todos sus inventarios (CASCADE)
- ✅ Validación de permisos (solo admin)
- ✅ No se puede deshacer

#### **5. Importación Masiva**
- ✅ Soporta CSV y TSV
- ✅ Pegado desde Excel
- ✅ Subida de archivo
- ✅ Previsualización antes de importar
- ✅ Validación de columnas requeridas
- ✅ Importación en lotes (300 por lote)
- ✅ Manejo de alias de columnas

#### **6. Exportación CSV**
- ✅ Exporta todos los productos filtrados
- ✅ Incluye: SKU, barcode, nombre, categoría, stock, costo, precio, IVA, estado
- ✅ Nombre de archivo: `productos_[empresa]_[fecha].csv`

#### **7. Estadísticas por Categoría**
- ✅ Componente `CategoryStats`
- ✅ Muestra estadísticas por categoría
- ✅ Toggle mostrar/ocultar

---

## 3. 🔧 GUÍA DE MODIFICACIONES

### 3.1. CÓMO MODIFICAR EL DASHBOARD

#### **Cambiar Métricas Mostradas**

**Ubicación:** `src/pages/Dashboard.tsx` (líneas 321-471)

**Ejemplo: Agregar Nueva Métrica**

```typescript
// 1. Agregar card en el grid (línea ~322)
<Card className="p-6">
  <div className="flex items-center justify-between">
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Nueva Métrica</p>
      <p className="text-2xl font-bold">{valorNuevo}</p>
    </div>
    <div className="p-3 rounded-lg">
      <Icono className="w-6 h-6 text-[color]-600" />
    </div>
  </div>
</Card>
```

**Ejemplo: Cambiar Colores**

```typescript
// Buscar y reemplazar clases de color:
// text-blue-600 → text-[nuevo-color]-600
// bg-blue-100 → bg-[nuevo-color]-100
```

#### **Cambiar Consultas de Datos**

**Ubicación:** `src/hooks/useDashboardData.ts`

**Ejemplo: Agregar Nueva Consulta**

```typescript
// 1. Agregar consulta en fetchDashboardData (línea ~120)
const { data: nuevosDatos, error: nuevoError } = await supabase
  .from('tabla')
  .select('campos')
  .eq('company_id', company.id);

// 2. Procesar datos
const datosProcesados = procesar(nuevosDatos);

// 3. Agregar a DashboardData interface (línea ~5)
export interface DashboardData {
  // ... campos existentes
  nuevosDatos: TipoDatos[];
}

// 4. Agregar a dashboardData object (línea ~597)
const dashboardData: DashboardData = {
  // ... campos existentes
  nuevosDatos: datosProcesados,
};
```

#### **Cambiar Períodos Disponibles**

**Ubicación:** `src/pages/Dashboard.tsx` (líneas 282-307)

```typescript
// Agregar nuevo botón:
<Button
  variant={selectedPeriod === 'nuevoPeriodo' ? 'default' : 'ghost'}
  size="sm"
  onClick={() => setSelectedPeriod('nuevoPeriodo')}
>
  Nuevo Período
</Button>

// Actualizar tipo:
type PeriodType = 'today' | 'yesterday' | 'thisMonth' | 'nuevoPeriodo';

// Actualizar getPeriodData() (línea ~119) para manejar nuevo período
```

#### **Cambiar Componentes Visuales**

**Ubicación:** `src/components/dashboard/`

**Ejemplo: Modificar PaymentMethodStats**

1. Editar `src/components/dashboard/PaymentMethodStats.tsx`
2. Cambiar colores, iconos, o layout
3. El cambio se refleja automáticamente en Dashboard

---

### 3.2. CÓMO MODIFICAR EL MÓDULO DE PRODUCTOS

#### **Cambiar Columnas de la Tabla**

**Ubicación:** `src/pages/ProductsPage.tsx` (líneas 611-621 para header, 624-675 para body)

**Ejemplo: Agregar Nueva Columna "Proveedor"**

```typescript
// 1. Agregar campo a interface Product (línea ~21)
interface Product {
  // ... campos existentes
  supplier?: string; // Nuevo campo
}

// 2. Agregar columna en header (línea ~620)
<th className="px-4 py-3 text-left">Proveedor</th>

// 3. Agregar celda en body (línea ~648)
<td className="px-4 py-3">{p.supplier || 'N/A'}</td>

// 4. Actualizar consulta para incluir campo (línea ~119)
.select('id, sku, ..., supplier') // Agregar supplier

// 5. Actualizar colSpan en mensaje vacío (línea ~678)
<td colSpan={9} // Cambiar de 8 a 9
```

#### **Cambiar Consulta de Stock**

**Ubicación:** `src/pages/ProductsPage.tsx` (líneas 133-148)

**Ejemplo: Mostrar Stock Solo de Tienda Activa**

```typescript
// En lugar de sumar todas las tiendas:
const { data: inventoryData } = await supabase
  .from('inventories')
  .select('product_id, qty')
  .eq('company_id', userProfile.company_id)
  .eq('store_id', tiendaActivaId); // Agregar filtro de tienda

// Eliminar agrupación por producto, usar directamente
```

#### **Cambiar Colores de Stock**

**Ubicación:** `src/pages/ProductsPage.tsx` (línea ~641)

```typescript
// Actualmente: Siempre verde
<td className="px-4 py-3 text-right text-green-600 font-medium">

// Cambiar a condicional:
const stockColor = stock === 0 ? 'text-red-600' : 
                   stock < 10 ? 'text-orange-600' : 
                   'text-green-600';
<td className={`px-4 py-3 text-right ${stockColor} font-medium`}>
```

#### **Agregar Filtros Adicionales**

**Ubicación:** `src/pages/ProductsPage.tsx` (líneas 248-256, 579-605)

**Ejemplo: Agregar Filtro por Stock**

```typescript
// 1. Agregar estado
const [stockFilter, setStockFilter] = useState<string>('all');

// 2. Agregar select en UI (línea ~605)
<Select value={stockFilter} onValueChange={setStockFilter}>
  <SelectTrigger>
    <SelectValue placeholder="Filtrar por stock" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todos</SelectItem>
    <SelectItem value="in_stock">Con Stock</SelectItem>
    <SelectItem value="low_stock">Stock Bajo</SelectItem>
    <SelectItem value="out_of_stock">Sin Stock</SelectItem>
  </SelectContent>
</Select>

// 3. Actualizar filtro (línea ~248)
const filteredProducts = products.filter(product => {
  // ... filtros existentes
  const matchesStock = stockFilter === 'all' ||
    (stockFilter === 'in_stock' && (product.total_stock || 0) > 0) ||
    (stockFilter === 'low_stock' && (product.total_stock || 0) > 0 && (product.total_stock || 0) < 10) ||
    (stockFilter === 'out_of_stock' && (product.total_stock || 0) === 0);
  
  return matchesSearch && matchesCategory && matchesStock;
});
```

#### **Modificar Formulario de Producto**

**Ubicación:** `src/components/pos/ProductForm.tsx`

**Ejemplo: Agregar Campo "Proveedor"**

```typescript
// 1. Agregar al estado del formulario
const [formData, setFormData] = useState({
  // ... campos existentes
  supplier: '',
});

// 2. Agregar input en el formulario
<Input
  label="Proveedor"
  value={formData.supplier}
  onChange={(e) => handleInputChange('supplier', e.target.value)}
/>

// 3. Incluir en la llamada a create_product_with_inventory
// (Nota: Puede requerir modificar la función SQL también)
```

---

### 3.3. MODIFICACIONES COMUNES

#### **Cambiar Colores del Sistema**

**Archivos a modificar:**
- `src/index.css` - Variables CSS globales
- `tailwind.config.ts` - Configuración de Tailwind
- Componentes individuales - Clases específicas

**Ejemplo: Cambiar Color Primario**

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      primary: {
        DEFAULT: '#nuevo-color',
        // ...
      }
    }
  }
}
```

#### **Cambiar Tamaños de Paginación**

**Ubicación:** `src/pages/ProductsPage.tsx` (línea ~696)

```typescript
// Cambiar opciones:
{[10,12,20,30,50].map(s => <option key={s} value={s}>{s}/pág</option>)}

// A:
{[25,50,100,200].map(s => <option key={s} value={s}>{s}/pág</option>)}
```

#### **Agregar Validaciones**

**Ejemplo: Validar SKU Único Antes de Crear**

```typescript
// En handleFormSuccess o handleSubmit
const { data: existing } = await supabase
  .from('products')
  .select('id')
  .eq('company_id', company_id)
  .eq('sku', formData.sku)
  .single();

if (existing) {
  toast({
    title: "Error",
    description: "El SKU ya existe",
    variant: "destructive",
  });
  return;
}
```

---

### 3.4. PUNTOS DE ATENCIÓN

#### **⚠️ NO MODIFICAR SIN CUIDADO**

1. **Funciones SQL críticas** - `create_product_with_inventory`, `process_sale`
2. **RLS Policies** - Políticas de seguridad
3. **AuthContext** - Autenticación global
4. **Estructura de datos** - Interfaces TypeScript deben coincidir con BD

#### **✅ SEGURO PARA MODIFICAR**

1. **Colores y estilos** - Clases CSS
2. **Layout** - Orden de componentes
3. **Texto** - Labels, mensajes
4. **Validaciones frontend** - Validaciones adicionales
5. **Filtros** - Nuevos filtros en frontend

#### **🔧 MODIFICAR CON PRECAUCIÓN**

1. **Consultas SQL** - Verificar performance
2. **Agregaciones** - Asegurar que los cálculos sean correctos
3. **Estados** - No romper el flujo de datos
4. **Tipos TypeScript** - Mantener sincronizados con BD

---

### 3.5. CHECKLIST DE MODIFICACIÓN

Antes de modificar, verificar:

- [ ] ¿Estoy en la rama `desarrollo`?
- [ ] ¿He creado un respaldo del estado actual?
- [ ] ¿Entiendo cómo fluyen los datos?
- [ ] ¿He verificado que los cambios no rompan otras partes?
- [ ] ¿He probado los cambios localmente?
- [ ] ¿He actualizado los tipos TypeScript si es necesario?
- [ ] ¿He verificado que no haya errores de linting?

---

## 4. 📋 RESUMEN DE ARCHIVOS CLAVE

### Dashboard

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `src/pages/Dashboard.tsx` | ~610 | Componente principal |
| `src/hooks/useDashboardData.ts` | ~644 | Datos del dashboard |
| `src/hooks/useKreceStats.ts` | ~296 | Estadísticas Krece |
| `src/hooks/usePaymentMethodsData.ts` | ~152 | Métodos de pago |
| `src/components/dashboard/PaymentMethodStats.tsx` | ~308 | Componente métodos |
| `src/components/dashboard/StoreSummaryCard.tsx` | ~50 | Tarjeta de tienda |

### Productos

| Archivo | Líneas | Propósito |
|---------|--------|-----------|
| `src/pages/ProductsPage.tsx` | ~766 | Componente principal |
| `src/components/pos/ProductForm.tsx` | ~415 | Formulario crear/editar |
| `src/components/products/CategoryStats.tsx` | ? | Estadísticas categorías |

### Backend (SQL)

| Archivo | Propósito |
|---------|-----------|
| `supabase/migrations/20250826180000_enhance_products_inventory.sql` | Función crear producto |
| `supabase/migrations/20250826185000_create_sales_system.sql` | Sistema de ventas |
| `supabase/migrations/20250101000006_create_krece_management_functions.sql` | Funciones Krece |

---

## 5. 🎨 EJEMPLOS DE MODIFICACIONES RÁPIDAS

### Ejemplo 1: Cambiar Color del Stock a Condicional

```typescript
// En ProductsPage.tsx, línea ~641
// ANTES:
<td className="px-4 py-3 text-right text-green-600 font-medium">
  {stock.toLocaleString()}
</td>

// DESPUÉS:
const stockColor = stock === 0 
  ? 'text-red-600 font-semibold' 
  : stock < 10 
  ? 'text-orange-600 font-medium' 
  : 'text-green-600 font-medium';

<td className={`px-4 py-3 text-right ${stockColor}`}>
  {stock.toLocaleString()}
</td>
```

### Ejemplo 2: Agregar Columna "Margen" de Nuevo

```typescript
// En ProductsPage.tsx

// 1. Header (línea ~618, después de Precio):
<th className="px-4 py-3 text-right cursor-pointer" onClick={() => changeSort('margin')}>
  Margen {sortKey==='margin' ? (sortDir==='asc'?'▲':'▼') : ''}
</th>

// 2. Body (línea ~642, después de Precio):
const margin = p.cost_usd > 0 ? ((p.sale_price_usd - p.cost_usd) / p.cost_usd * 100) : 0;
<td className="px-4 py-3 text-right">{margin.toFixed(1)}%</td>

// 3. Actualizar colSpan a 9
```

### Ejemplo 3: Agregar Filtro por Rango de Precio

```typescript
// 1. Estados
const [minPrice, setMinPrice] = useState<number | ''>('');
const [maxPrice, setMaxPrice] = useState<number | ''>('');

// 2. UI (después de filtro de categoría)
<div className="flex gap-2">
  <Input
    type="number"
    placeholder="Precio Mín"
    value={minPrice}
    onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
  />
  <Input
    type="number"
    placeholder="Precio Máx"
    value={maxPrice}
    onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
  />
</div>

// 3. Filtro (en filteredProducts)
const matchesPrice = (!minPrice || p.sale_price_usd >= minPrice) &&
                     (!maxPrice || p.sale_price_usd <= maxPrice);

return matchesSearch && matchesCategory && matchesPrice;
```

---

## 6. 🚀 PRÓXIMOS PASOS SUGERIDOS

### Mejoras Potenciales para Dashboard

1. **Gráficos Interactivos**
   - Agregar gráficos con Recharts
   - Tendencias de ventas
   - Comparación de tiendas

2. **Filtros Avanzados**
   - Filtro por rango de fechas personalizado
   - Filtro por tienda específica
   - Exportar datos del dashboard

3. **Alertas en Tiempo Real**
   - Notificaciones de stock crítico
   - Alertas de ventas importantes

### Mejoras Potenciales para Productos

1. **Vista de Detalles**
   - Modal con información completa
   - Historial de ventas del producto
   - Stock por tienda desglosado

2. **Búsqueda Avanzada**
   - Búsqueda por código de barras
   - Filtro por rango de precios
   - Filtro por stock

3. **Acciones Masivas**
   - Selección múltiple
   - Edición masiva de precios
   - Cambio de estado masivo

---

**Documento creado:** 5 de Noviembre, 2025  
**Versión:** 1.0  
**Última actualización:** Análisis completo del código








