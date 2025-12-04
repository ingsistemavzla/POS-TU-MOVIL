# 📊 Before/After Refactoring Examples

## 🎯 **OBJECTIVE**
Remove redundant manual filtering from Frontend now that RLS handles security automatically.

---

## 📋 **EXAMPLE 1: useDashboardData.ts - Sales Query**

### ❌ **BEFORE (Redundant Filtering)**
```typescript
// Helper: obtener ventas de un período específico
const getSalesForPeriod = async (
  companyId: string,
  startDate: Date,
  endDate: Date,
  storeId?: string
) => {
  try {
    let query = supabase
      .from('sales')
      .select('id, total_usd, created_at')
      .eq('company_id', companyId) // ❌ REDUNDANT - RLS handles this
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    // ...
  }
};

// In component:
const storeFilter = userProfile.role === 'cashier' || userProfile.role === 'manager'
  ? userProfile.assigned_store_id || undefined // ❌ REDUNDANT - RLS handles this
  : undefined;

const [todaySales] = await Promise.all([
  getSalesForPeriod(companyId, dates.today, dates.todayEnd, storeFilter),
  // ...
]);
```

### ✅ **AFTER (RLS Handles Everything)**
```typescript
// Helper: obtener ventas de un período específico
// 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
const getSalesForPeriod = async (
  companyId: string, // Mantenido para compatibilidad, pero no se usa en la query
  startDate: Date,
  endDate: Date,
  storeId?: string // UI filter: Admin puede querer ver una tienda específica
) => {
  try {
    let query = supabase
      .from('sales')
      .select('id, total_usd, created_at')
      // ✅ REMOVED: .eq('company_id', companyId) - RLS handles this automatically
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    // ✅ KEEP: storeId filter is for UI filtering (admin selecting specific store), not security
    if (storeId) {
      query = query.eq('store_id', storeId);
    }
    // ...
  }
};

// In component:
// ✅ REMOVED: Role-based store filtering - RLS handles this automatically
// Managers/Cashiers only see sales from their assigned store, Admins see all sales in their company

const [todaySales] = await Promise.all([
  getSalesForPeriod(companyId, dates.today, dates.todayEnd), // No store filter - RLS handles it
  // ...
]);
```

---

## 📋 **EXAMPLE 2: useSalesData.ts - Main Query**

### ❌ **BEFORE (Redundant Filtering)**
```typescript
export function useSalesData(): UseSalesDataReturn {
  const { userProfile } = useAuth();
  // ...

  const fetchSalesData = useCallback(async () => {
    if (!userProfile?.company_id) {
      setLoading(false);
      return;
    }

    // Build query with filters
    let query = (supabase as any)
      .from('sales')
      .select('*')
      .eq('company_id', userProfile.company_id); // ❌ REDUNDANT

    // If user is manager, only show sales from their assigned store
    if (userProfile?.role === 'manager' && userProfile?.assigned_store_id) {
      query = query.eq('store_id', userProfile.assigned_store_id); // ❌ REDUNDANT
    }

    // Apply other filters...
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    // ...
  }, [userProfile?.company_id, filters, page, pageSize]);
}
```

### ✅ **AFTER (RLS Handles Everything)**
```typescript
export function useSalesData(): UseSalesDataReturn {
  const { userProfile } = useAuth();
  // ...

  const fetchSalesData = useCallback(async () => {
    if (!userProfile?.company_id) {
      setLoading(false);
      return;
    }

    // Build query with filters
    // 🛡️ RLS: No necesitamos filtrar por company_id o role - RLS lo hace automáticamente
    let query = (supabase as any)
      .from('sales')
      .select('*');
      // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
      // ✅ REMOVED: Role-based store filtering - RLS handles this automatically

    // Apply other filters (UI filters, not security filters)...
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom);
    }
    // ...
  }, [userProfile?.company_id, filters, page, pageSize]);
}
```

---

## 📋 **EXAMPLE 3: useDashboardData.ts - Stores Query**

### ❌ **BEFORE (Redundant Role-Based Filtering)**
```typescript
// ============================================
// 2. OBTENER TIENDAS
// ============================================
let stores: Array<{ id: string; name: string }> = [];

try {
  if (userProfile.role === 'cashier' && userProfile.assigned_store_id) {
    // ❌ REDUNDANT: Manual filtering by role
    const { data: storeData, error: storeError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('id', userProfile.assigned_store_id)
      .eq('active', true)
      .single();
  
    if (!storeError && storeData) {
      stores = [storeData];
    }
  } else {
    // ❌ REDUNDANT: Manual company_id filtering
    const { data: storesData, error: storesError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('company_id', companyId) // ❌ REDUNDANT
      .eq('active', true);
  
    if (!storesError && storesData) {
      stores = storesData;
    }
  }
} catch (err) {
  console.warn('Error fetching stores:', err);
}
```

### ✅ **AFTER (RLS Handles Everything)**
```typescript
// ============================================
// 2. OBTENER TIENDAS
// 🛡️ RLS: No necesitamos filtrar por company_id o role - RLS lo hace automáticamente
// ============================================
let stores: Array<{ id: string; name: string }> = [];

try {
  // ✅ SIMPLIFIED: RLS automatically filters stores based on user's permissions
  // Managers/Cashiers only see their assigned store, Admins see all stores in their company
  const { data: storesData, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    // ✅ REMOVED: .eq('company_id', companyId) - RLS handles this automatically
    // ✅ REMOVED: Role-based filtering - RLS handles this automatically
    .eq('active', true);
  
  if (!storesError && storesData) {
    stores = storesData;
  }
} catch (err) {
  console.warn('Error fetching stores:', err);
}
```

---

## 📋 **EXAMPLE 4: POS.tsx - Inventory Query**

### ❌ **BEFORE (Redundant Filtering)**
```typescript
const loadProductStock = async (productsList: Product[]) => {
  if (!userProfile?.company_id || productsList.length === 0 || !selectedStore) return;
  
  try {
    // For cashiers and managers, always use assigned store; for admin, use selected store
    const isRestrictedUser = userProfile?.role === 'cashier' || userProfile?.role === 'manager';
    const storeId = isRestrictedUser
      ? (userProfile as any)?.assigned_store_id ?? selectedStore?.id
      : selectedStore?.id;
    
    if (!storeId) {
      toast({ title: "Error", description: "No se ha seleccionado una tienda" });
      return;
    }
    
    // Get inventory for all products in this store
    const productIds = productsList.map(p => p.id);
    const { data, error } = await (supabase as any)
      .from('inventories')
      .select('product_id, qty')
      .in('product_id', productIds)
      .eq('store_id', storeId)
      .eq('company_id', userProfile.company_id); // ❌ REDUNDANT
    // ...
  }
};
```

### ✅ **AFTER (RLS Handles Security, UI Handles Selection)**
```typescript
const loadProductStock = async (productsList: Product[]) => {
  if (!userProfile?.company_id || productsList.length === 0 || !selectedStore) return;
  
  try {
    // ✅ SIMPLIFIED: Use selected store (RLS will enforce permissions)
    const storeId = selectedStore?.id;
    
    if (!storeId) {
      toast({ title: "Error", description: "No se ha seleccionado una tienda" });
      return;
    }
    
    // Get inventory for all products in this store
    // 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
    const productIds = productsList.map(p => p.id);
    const { data, error } = await (supabase as any)
      .from('inventories')
      .select('product_id, qty')
      .in('product_id', productIds)
      .eq('store_id', storeId) // ✅ KEEP: UI filter for selected store
      // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
    // ...
  }
};
```

---

## 📋 **EXAMPLE 5: AlmacenPage.tsx - Products Query**

### ❌ **BEFORE (Redundant Filtering)**
```typescript
// Cargar productos (sin JOIN a vista que puede no existir)
// ⚠️ FILTRO CRÍTICO: Solo productos activos para evitar contar stock de productos eliminados
const { data: productsData, error: productsError } = await (supabase.from('products') as any)
  .select('id, sku, barcode, name, category, cost_usd, sale_price_usd, tax_rate, active, created_at')
  .eq('company_id', userProfile.company_id) // ❌ REDUNDANT
  .eq('active', true)  // ⚠️ Solo productos activos
  .order('created_at', { ascending: false });
```

### ✅ **AFTER (RLS Handles Security)**
```typescript
// Cargar productos (sin JOIN a vista que puede no existir)
// ⚠️ FILTRO CRÍTICO: Solo productos activos para evitar contar stock de productos eliminados
// 🛡️ RLS: No necesitamos filtrar por company_id - RLS lo hace automáticamente
const { data: productsData, error: productsError } = await (supabase.from('products') as any)
  .select('id, sku, barcode, name, category, cost_usd, sale_price_usd, tax_rate, active, created_at')
  // ✅ REMOVED: .eq('company_id', userProfile.company_id) - RLS handles this automatically
  .eq('active', true)  // ⚠️ Solo productos activos
  .order('created_at', { ascending: false });
```

---

## 🎯 **KEY TAKEAWAYS**

### ✅ **What We REMOVED:**
1. **All `.eq('company_id', ...)` clauses** - RLS automatically filters by company
2. **Role-based conditional filtering** - RLS automatically enforces store-level restrictions
3. **Manual permission checks** - Database handles all security

### ✅ **What We KEPT:**
1. **UI filters** - `.eq('store_id', ...)` when admin explicitly selects a store
2. **Business logic filters** - `.eq('active', true)`, date ranges, categories
3. **Search filters** - `.ilike('name', ...)`, `.eq('category', ...)`

---

## 🛡️ **SECURITY VERIFICATION**

All queries now rely on:
1. **Supabase Client Session** - Automatically includes user's JWT token with `auth.uid()`
2. **RLS Policies** - Database automatically filters based on:
   - `company_id` matching user's company
   - `store_id` matching user's `assigned_store_id` (for managers/cashiers)
   - Role-based visibility (admins see all, staff see only their store)

**Result:** Frontend code is simpler, and security is enforced at the database level where it cannot be bypassed.

---

**END OF BEFORE/AFTER EXAMPLES**


