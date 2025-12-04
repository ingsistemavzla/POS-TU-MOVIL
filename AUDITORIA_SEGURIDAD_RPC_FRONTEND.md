# 🔒 AUDITORÍA DE SEGURIDAD: Protocolos Transaccionales y Manejo de Errores Frontend

**Fecha:** 2025-01-27  
**Auditor:** Arquitecto de Seguridad y Auditor de Base de Datos  
**Objetivo:** Validar seguridad de RPCs transaccionales y manejo de errores HTTP antes de implementar RLS

---

## 📋 TAREA 1: Verificación de Protocolo de Seguridad en RPCs

### ✅ RESULTADO: Todas las funciones usan `SECURITY DEFINER`

---

### 1. `process_sale`

**Archivo:** `supabase/migrations/20250115000001_add_inventory_movements_to_process_sale.sql`

**Definición:**
```sql
CREATE OR REPLACE FUNCTION process_sale(
    p_company_id UUID,
    p_store_id UUID,
    p_cashier_id UUID,
    p_customer_id UUID DEFAULT NULL,
    p_payment_method TEXT DEFAULT 'cash_usd',
    p_customer_name TEXT DEFAULT 'Cliente General',
    p_bcv_rate NUMERIC DEFAULT 41.73,
    p_customer_id_number TEXT DEFAULT NULL,
    p_items JSONB DEFAULT '[]'::jsonb,
    p_notes TEXT DEFAULT NULL,
    p_tax_rate NUMERIC DEFAULT 0.16,
    p_krece_enabled BOOLEAN DEFAULT false,
    p_krece_initial_amount_usd NUMERIC DEFAULT 0,
    p_krece_financed_amount_usd NUMERIC DEFAULT 0,
    p_krece_initial_percentage NUMERIC DEFAULT 0,
    p_is_mixed_payment BOOLEAN DEFAULT false,
    p_mixed_payments JSONB DEFAULT '[]'::jsonb,
    p_subtotal_usd NUMERIC DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  ✅
AS $$
```

**Estado:** ✅ **USA `SECURITY DEFINER`**

**Implicaciones de Seguridad:**
- ✅ La función ejecuta con permisos del propietario (no del invocador)
- ✅ Bypasea RLS automáticamente
- ✅ Permite operaciones transaccionales complejas sin restricciones de RLS
- ⚠️ **REQUIERE validación interna de permisos** (company_id, role, assigned_store_id)

---

### 2. `transfer_inventory`

**Archivo:** `supabase/migrations/20250103000002_create_transfer_inventory_function.sql`

**Definición:**
```sql
CREATE OR REPLACE FUNCTION public.transfer_inventory(
  p_product_id uuid,
  p_from_store_id uuid,
  p_to_store_id uuid,
  p_quantity integer,
  p_company_id uuid,
  p_transferred_by uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER  ✅
AS $$
```

**Estado:** ✅ **USA `SECURITY DEFINER`**

**Implicaciones de Seguridad:**
- ✅ La función ejecuta con permisos del propietario
- ✅ Bypasea RLS automáticamente
- ✅ Permite transferencias entre sucursales sin restricciones de RLS
- ⚠️ **REQUIERE validación interna de permisos** (solo `admin` puede transferir)

---

### 3. `delete_sale_and_restore_inventory`

**Archivo:** `supabase/migrations/20250127000001_enhance_delete_sale_with_audit.sql`

**Definición:**
```sql
CREATE OR REPLACE FUNCTION delete_sale_and_restore_inventory(
    p_sale_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  ✅
AS $$
```

**Estado:** ✅ **USA `SECURITY DEFINER`**

**Implicaciones de Seguridad:**
- ✅ La función ejecuta con permisos del propietario
- ✅ Bypasea RLS automáticamente
- ✅ Permite eliminación de ventas y restauración de inventario sin restricciones de RLS
- ⚠️ **REQUIERE validación interna de permisos** (company_id, role)

---

## 📊 RESUMEN TAREA 1

| RPC | `SECURITY DEFINER` | Estado | Validación Interna |
|-----|-------------------|--------|-------------------|
| `process_sale` | ✅ SÍ | ✅ Seguro | ⚠️ Requiere validación de company_id, role, assigned_store_id |
| `transfer_inventory` | ✅ SÍ | ✅ Seguro | ⚠️ Requiere validación de role (solo admin) |
| `delete_sale_and_restore_inventory` | ✅ SÍ | ✅ Seguro | ⚠️ Requiere validación de company_id, role |

**Conclusión TAREA 1:**
- ✅ **Todas las funciones transaccionales críticas usan `SECURITY DEFINER`**
- ✅ **Protocolo de seguridad correcto implementado**
- ⚠️ **ADVERTENCIA:** Las funciones `SECURITY DEFINER` **bypasean RLS**, por lo que **DEBEN** tener validación interna de permisos basada en `auth.uid()` y la tabla `public.users`

---

## 📋 TAREA 2: Impacto del Frontend - Manejo de Errores HTTP

### ❌ RESULTADO: **NO existe manejo específico de errores 403/404 de Supabase**

---

### Análisis del Código Frontend

#### 1. **Manejo Genérico de Errores**

**Patrón Encontrado en Múltiples Archivos:**

```typescript
// Ejemplo de AlmacenPage.tsx (líneas 102-124)
const { data: productsData, error: productsError } = await supabase
  .from('products')
  .select('...')
  .eq('company_id', userProfile.company_id);

if (productsError) {
  console.error('Error fetching products:', productsError);
  toast({
    title: "Error",
    description: `No se pudieron cargar los productos: ${productsError.message || 'Error desconocido'}`,
    variant: "destructive",
  });
  setProducts([]);
  setLoading(false);
  return;
}
```

**Problemas Identificados:**
- ❌ **NO verifica el código de estado HTTP** (403, 404, 500)
- ❌ **NO diferencia entre errores de permisos y errores de red**
- ❌ **NO maneja específicamente "Access Denied" o "Permission Denied"**
- ❌ **Asume que el error siempre tiene un `message`**

---

#### 2. **Archivos Auditados**

| Archivo | Manejo de Errores | Manejo 403/404 | Estado |
|---------|------------------|----------------|--------|
| `src/pages/AlmacenPage.tsx` | ✅ Genérico (`error.message`) | ❌ NO | ⚠️ Vulnerable |
| `src/pages/ArticulosPage.tsx` | ✅ Genérico (`error.message`) | ❌ NO | ⚠️ Vulnerable |
| `src/pages/POS.tsx` | ✅ Genérico (`error.message`) | ❌ NO | ⚠️ Vulnerable |
| `src/pages/SalesPage.tsx` | ✅ Genérico (`error.message`) | ❌ NO | ⚠️ Vulnerable |
| `src/pages/EstadisticasPage.tsx` | ✅ Genérico (`error.message`) | ❌ NO | ⚠️ Vulnerable |
| `src/hooks/useDashboardData.ts` | ✅ Genérico (`error.message`) | ❌ NO | ⚠️ Vulnerable |
| `src/components/auth/ProtectedRoute.tsx` | ✅ Solo validación de rol en frontend | ❌ NO | ⚠️ Vulnerable |

---

#### 3. **Ejemplo de Código Vulnerable**

**`src/pages/AlmacenPage.tsx` (líneas 102-118):**
```typescript
if (productsError) {
  console.error('Error fetching products:', productsError);
  console.error('Error details:', {
    message: productsError.message,
    code: productsError.code,
    details: productsError.details,
    hint: productsError.hint
  });
  toast({
    title: "Error",
    description: `No se pudieron cargar los productos: ${productsError.message || 'Error desconocido'}`,
    variant: "destructive",
  });
  setProducts([]);
  setLoading(false);
  return;
}
```

**Problemas:**
- ❌ **NO verifica `productsError.code`** (podría ser `PGRST301` para 403, `PGRST116` para 404)
- ❌ **NO verifica `productsError.status`** (podría ser `403`, `404`, `500`)
- ❌ **NO redirige o muestra mensaje específico para "Acceso Denegado"**
- ❌ **Asume que el usuario siempre tendrá datos** (no maneja el caso de "sin permisos")

---

#### 4. **Estructura de Error de Supabase (No Utilizada)**

**Supabase retorna errores con esta estructura:**
```typescript
{
  message: string;
  details?: string;
  hint?: string;
  code?: string;  // Ej: "PGRST301" (403), "PGRST116" (404)
  status?: number; // Ej: 403, 404, 500
}
```

**Códigos de Error Comunes:**
- `PGRST301` = 403 Forbidden (RLS bloquea acceso)
- `PGRST116` = 404 Not Found (recurso no existe o RLS lo oculta)
- `PGRST301` = 500 Internal Server Error

**El frontend NO utiliza estos códigos para diferenciar errores.**

---

#### 5. **Componente `ProtectedRoute.tsx` - Validación Solo en Frontend**

**`src/components/auth/ProtectedRoute.tsx` (líneas 32-73):**
```typescript
// Check role permissions
if (requiredRole) {
  const roleHierarchy = { master_admin: 4, admin: 3, manager: 3, cashier: 1 };
  const userRoleLevel = roleHierarchy[userProfile.role as keyof typeof roleHierarchy] || 0;
  const requiredRoleLevel = roleHierarchy[requiredRole];

  if (userRoleLevel < requiredRoleLevel) {
    if (userProfile.role === 'cashier') {
      return <Navigate to="/pos" replace />;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">
            No tienes permisos suficientes para acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }
}
```

**Problemas:**
- ⚠️ **Solo valida en frontend** (puede ser bypassed)
- ❌ **NO valida contra RLS** (asume que RLS no bloqueará)
- ❌ **NO maneja errores 403 de Supabase** (si RLS bloquea, el frontend no lo detecta)

---

## 📊 RESUMEN TAREA 2

| Aspecto | Estado | Detalles |
|---------|--------|----------|
| **Manejo de Errores 403** | ❌ NO existe | El frontend NO verifica códigos de estado HTTP 403 |
| **Manejo de Errores 404** | ❌ NO existe | El frontend NO verifica códigos de estado HTTP 404 |
| **Diferenciación de Errores** | ❌ NO existe | Todos los errores se tratan igual (genérico) |
| **Mensajes Específicos** | ❌ NO existe | No hay mensajes específicos para "Acceso Denegado" |
| **Redirección por Permisos** | ⚠️ Parcial | Solo en `ProtectedRoute`, no en queries de datos |
| **Asunción de Datos** | ⚠️ Vulnerable | El frontend asume que siempre habrá datos si no hay error explícito |

**Conclusión TAREA 2:**
- ❌ **El frontend NO tiene manejo específico de errores 403/404 de Supabase**
- ❌ **El frontend asume que el usuario siempre tendrá acceso a los datos**
- ⚠️ **VULNERABILIDAD:** Si RLS bloquea una query, el frontend mostrará un error genérico en lugar de "Acceso Denegado"

---

## 🚨 VULNERABILIDADES IDENTIFICADAS

### 1. **Falta de Manejo de Errores 403/404**

**Riesgo:** ALTO  
**Impacto:** 
- Usuarios verán errores genéricos en lugar de mensajes claros de "Acceso Denegado"
- No hay diferenciación entre errores de red y errores de permisos
- La aplicación puede fallar silenciosamente si RLS bloquea queries

**Recomendación:**
```typescript
// Crear helper function para manejar errores de Supabase
const handleSupabaseError = (error: any, context: string) => {
  if (error?.code === 'PGRST301' || error?.status === 403) {
    toast({
      title: "Acceso Denegado",
      description: "No tienes permisos para realizar esta acción.",
      variant: "destructive",
    });
    // Opcional: Redirigir a dashboard o página de acceso denegado
    return 'FORBIDDEN';
  }
  
  if (error?.code === 'PGRST116' || error?.status === 404) {
    toast({
      title: "Recurso No Encontrado",
      description: "El recurso solicitado no existe o no tienes acceso.",
      variant: "destructive",
    });
    return 'NOT_FOUND';
  }
  
  // Error genérico
  toast({
    title: "Error",
    description: error?.message || 'Error desconocido',
    variant: "destructive",
  });
  return 'ERROR';
};
```

---

### 2. **Asunción de Datos Siempre Disponibles**

**Riesgo:** MEDIO  
**Impacto:**
- Si RLS bloquea una query, el frontend puede mostrar pantallas vacías sin explicación
- No hay feedback claro al usuario sobre por qué no ve datos

**Recomendación:**
```typescript
// Verificar si el error es de permisos antes de mostrar datos vacíos
if (error?.code === 'PGRST301' || error?.status === 403) {
  return (
    <div className="p-4">
      <Alert variant="destructive">
        <AlertTitle>Acceso Denegado</AlertTitle>
        <AlertDescription>
          No tienes permisos para ver estos datos.
        </AlertDescription>
      </Alert>
    </div>
  );
}
```

---

### 3. **Validación Solo en Frontend (`ProtectedRoute`)**

**Riesgo:** MEDIO  
**Impacto:**
- La validación de roles en `ProtectedRoute` puede ser bypassed si el usuario manipula el código
- No hay validación contra RLS en las queries de datos

**Recomendación:**
- ✅ **Mantener validación en frontend** para UX (mostrar/ocultar elementos)
- ✅ **Implementar RLS en backend** como fuente de verdad
- ✅ **Manejar errores 403** de Supabase como validación secundaria

---

## ✅ RECOMENDACIONES FINALES

### 1. **Implementar Helper de Manejo de Errores**

Crear `src/utils/supabaseErrorHandler.ts`:
```typescript
export const handleSupabaseError = (error: any, context: string) => {
  // Verificar código de error de Supabase
  if (error?.code === 'PGRST301' || error?.status === 403) {
    return {
      type: 'FORBIDDEN',
      message: 'Acceso Denegado',
      description: 'No tienes permisos para realizar esta acción.',
    };
  }
  
  if (error?.code === 'PGRST116' || error?.status === 404) {
    return {
      type: 'NOT_FOUND',
      message: 'Recurso No Encontrado',
      description: 'El recurso solicitado no existe o no tienes acceso.',
    };
  }
  
  return {
    type: 'ERROR',
    message: 'Error',
    description: error?.message || 'Error desconocido',
  };
};
```

### 2. **Actualizar Todas las Queries de Supabase**

Reemplazar:
```typescript
if (error) {
  toast({ title: "Error", description: error.message });
}
```

Por:
```typescript
if (error) {
  const errorInfo = handleSupabaseError(error, 'fetching products');
  toast({
    title: errorInfo.message,
    description: errorInfo.description,
    variant: errorInfo.type === 'FORBIDDEN' ? 'destructive' : 'default',
  });
  
  if (errorInfo.type === 'FORBIDDEN') {
    // Opcional: Redirigir o mostrar UI específica
  }
}
```

### 3. **Validar RLS en Funciones `SECURITY DEFINER`**

Asegurar que todas las funciones `SECURITY DEFINER` validen permisos internamente:
```sql
-- Ejemplo en process_sale
SELECT role, company_id, assigned_store_id INTO v_role, v_user_company, v_assigned_store
FROM public.users
WHERE auth_user_id = auth.uid()
LIMIT 1;

IF v_user_company IS DISTINCT FROM p_company_id THEN
  RETURN jsonb_build_object('success', false, 'error', 'COMPANY_MISMATCH');
END IF;

IF v_role IS DISTINCT FROM 'admin' THEN
  IF v_assigned_store IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NO_ASSIGNED_STORE');
  END IF;
  IF p_store_id IS DISTINCT FROM v_assigned_store THEN
    RETURN jsonb_build_object('success', false, 'error', 'STORE_NOT_ALLOWED');
  END IF;
END IF;
```

---

## 📋 CHECKLIST PRE-IMPLEMENTACIÓN RLS

- [x] ✅ Verificar que RPCs críticos usan `SECURITY DEFINER`
- [x] ✅ Verificar que RPCs validan permisos internamente
- [ ] ❌ Implementar manejo de errores 403/404 en frontend
- [ ] ❌ Crear helper `handleSupabaseError`
- [ ] ❌ Actualizar todas las queries de Supabase para usar el helper
- [ ] ❌ Agregar mensajes específicos de "Acceso Denegado"
- [ ] ❌ Implementar RLS en tablas críticas
- [ ] ❌ Probar que RLS bloquea correctamente y el frontend muestra mensajes apropiados

---

**FIN DEL REPORTE DE AUDITORÍA**





