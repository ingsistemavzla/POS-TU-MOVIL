# 📋 CONTEXTO MAESTRO - PROYECTO POS (React/Supabase)

**Fecha de Análisis:** 2025-01-28  
**Arquitecto:** Análisis Técnico Discovery  
**Objetivo:** Documentar el estado actual del proyecto sin realizar modificaciones

---

## TAREA 1: MAPEO GENERAL

### 1.1 Stack Tecnológico Exacto

#### **Core Framework & Build Tools**
- **React:** `^18.3.1`
- **React DOM:** `^18.3.1`
- **Vite:** `^5.4.19` (Build tool con SWC)
- **TypeScript:** `^5.8.3`
- **@vitejs/plugin-react-swc:** `^3.11.0` (Compilador SWC para React)

#### **Routing & Navigation**
- **react-router-dom:** `^6.30.1` (Router principal)

#### **Estado & Data Fetching**
- **@tanstack/react-query:** `^5.83.0` (Server state management, cache, refetch)
- **React Context API:** (Estado local - AuthContext, StoreContext, ChatContext)
- **NO Zustand/Redux:** El proyecto usa Context API nativo de React

#### **UI Libraries & Components**
- **Radix UI:** Suite completa de componentes headless
  - `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-toast`, etc.
- **shadcn/ui:** Sistema de componentes basado en Radix UI
- **Tailwind CSS:** `^3.4.17` (Styling)
- **lucide-react:** `^0.462.0` (Iconos)
- **next-themes:** `^0.3.0` (Tema dark/light)

#### **Backend & Database**
- **@supabase/supabase-js:** `^2.56.0` (Cliente Supabase)
- **Supabase Auth:** Autenticación y gestión de sesiones
- **Supabase Realtime:** Actualizaciones en tiempo real (para Master Audit Dashboard)

#### **Formularios & Validación**
- **react-hook-form:** `^7.61.1`
- **@hookform/resolvers:** `^3.10.0`
- **zod:** `^3.25.76` (Validación de esquemas)

#### **Utilidades & Librerías**
- **date-fns:** `^3.6.0` (Manejo de fechas)
- **recharts:** `^2.15.4` (Gráficos)
- **jspdf:** `^3.0.2` + **jspdf-autotable:** `^5.0.2` (Generación de PDFs)
- **sonner:** `^1.7.4` (Notificaciones toast)
- **react-aria-components:** `^1.12.2` (Componentes accesibles)

#### **Testing**
- **vitest:** `^4.0.8` (Framework de testing)

---

### 1.2 Punto de Entrada

#### **Archivo Principal: `src/main.tsx`**
```typescript
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(<App />);
```

#### **Componente Raíz: `src/App.tsx`**

**Jerarquía de Providers (de exterior a interior):**

```
App
├── QueryClientProvider (@tanstack/react-query)
│   └── AuthProvider (AuthContext)
│       └── StoreProvider (StoreContext)
│           └── TooltipProvider (Radix UI)
│               ├── Toaster (Radix UI Toast)
│               ├── Sonner (Sonner Toast)
│               └── BrowserRouter (React Router)
│                   └── AppRoutes
│                       └── [Rutas protegidas/públicas]
```

**Configuración del QueryClient:**
- Instancia única: `const queryClient = new QueryClient()`
- Sin configuración personalizada visible (usa defaults)

**Providers Clave:**
1. **QueryClientProvider:** Maneja cache de queries, refetch automático
2. **AuthProvider:** Gestión de autenticación, sesión, perfil de usuario, empresa
3. **StoreProvider:** Gestión de tiendas disponibles y tienda seleccionada
4. **TooltipProvider:** Contexto para tooltips de Radix UI

---

### 1.3 Rutas Principales

#### **Estructura de Rutas (basado en `App.tsx`):**

**Rutas Públicas (sin autenticación):**
- `/` → `AuthPage` (Login/Registro) - Solo si `!user`
- `/auth/callback` → `AuthCallback` (Callback OAuth)
- `/auth` → Redirige a `/`

**Rutas de Validación por Rol:**
- `/admin` → Valida rol `admin` → Redirige a `/dashboard`
- `/manager` → Valida rol `manager` → Redirige a `/estadisticas`
- `/cashier` → `CashierValidationPage` → Valida y redirige a `/pos`

**Rutas Protegidas (requieren autenticación):**

Todas las rutas protegidas están envueltas en:
- `ProtectedRoute` (verifica autenticación y rol)
- `PasswordSetupGuard` (verifica si el usuario configuró su contraseña)
- `MainLayout` (Layout principal con sidebar)

**Rutas Principales:**
1. `/` (index) → `RoleBasedRedirect` (redirige según rol)
2. `/dashboard` → `Dashboard` (requiere: `manager` o superior)
3. `/pos` → `POS` (Punto de Venta - bloqueado para `master_admin`)
4. `/almacen` → `AlmacenPage` (Inventario - requiere: `cashier` o superior)
5. `/articulos` → `ArticulosPage` (Catálogo de productos - requiere: `manager`)
6. `/estadisticas` → `EstadisticasPage` (Estadísticas - requiere: `manager`)
7. `/sales` → `SalesPage` (Ventas - requiere: `manager`)
8. `/customers` → `CustomersPage` (Clientes - requiere: `manager`)
9. `/stores` → `StoresPage` (Tiendas - requiere: `admin`)
10. `/users` → `Users` (Usuarios - requiere: `admin`)
11. `/reports` → `ReportsNew` (Reportes - requiere: `manager`)
12. `/settings` → `SettingsPage` (Configuración - requiere: `admin`)
13. `/chat` → `ChatPage` (Chat - requiere: `manager`)
14. `/master-audit` → `MasterAuditDashboardPage` (Panel de auditoría - requiere: `master_admin`)
15. `/store/:storeId` → `StoreDashboardPage` (Dashboard por tienda - requiere: `master_admin`)
16. `/cash-register` → `CashRegisterPage` (Caja registradora)

**Guards Especiales:**
- `POSAccessGuard`: Bloquea `master_admin` del POS
- `CashierRouteGuard`: Redirige `cashier` a `/pos` si intenta acceder a rutas no permitidas

**Lazy Loading:**
Todas las páginas están cargadas con `lazy()` para code splitting:
```typescript
const Dashboard = lazy(() => import("./pages/Dashboard"));
const POS = lazy(() => import("./pages/POS"));
// ... etc
```

**Code Splitting (Vite):**
Configurado en `vite.config.ts`:
- `react-vendor`: React, React DOM, React Router
- `ui-vendor`: TanStack Query
- `chart-vendor`: Recharts
- `dashboard`, `pos`, `reports`: Chunks separados por página

---

## TAREA 2: CICLO DE VIDA DEL USUARIO (Frontend)

### 2.1 ¿Qué sucede exactamente cuando la página carga?

#### **Flujo de Inicialización (`AuthContext.tsx`):**

**Paso 1: Montaje del Componente**
```typescript
useEffect(() => {
  let mounted = true;
  let timeoutId: NodeJS.Timeout;
  let isInitialized = false;
  
  const initializeAuth = async () => {
    // ...
  };
  
  initializeAuth();
  // ...
}, []);
```

**Paso 2: Limpieza de Cache (Primera Vez)**
- Verifica `sessionStorage.getItem('auth_cache_cleared')`
- Si no existe, ejecuta `clearAuthCache()` (limpia localStorage/sessionStorage de Supabase Auth)
- Marca `auth_cache_cleared = true` en sessionStorage

**Paso 3: Timeout de Seguridad (8 segundos)**
- Establece un timeout de 8 segundos
- Si la inicialización no completa en 8s:
  - Limpia cache
  - Verifica sesión actual
  - Si hay sesión sin perfil → Cierra sesión
  - Si no hay sesión → Muestra login

**Paso 4: Obtener Sesión Actual**
```typescript
const { data: { session }, error } = await supabase.auth.getSession();
```
- Lee la sesión desde **localStorage** (configurado en `supabase/client.ts`)
- Si hay error → `setLoading(false)`, muestra login

**Paso 5: Si hay Sesión (`session?.user`):**
- Verifica cache de perfil en memoria (`profileCacheRef.current`)
- Si NO hay cache:
  - Establece timeout de 3 segundos para `fetchUserProfile`
  - Ejecuta `fetchUserProfile(userId)`
  - Si falla o no encuentra perfil → Cierra sesión automáticamente
- Si hay cache:
  - Usa perfil cacheado
- Inicia `sessionKeepAlive.start()`
- `setLoading(false)`

**Paso 6: Si NO hay Sesión:**
- `setLoading(false)`
- `sessionKeepAlive.stop()`
- Muestra `AuthPage` (login)

**Paso 7: Suscripción a Cambios de Auth**
```typescript
const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
  // Maneja: SIGNED_IN, SIGNED_OUT, INITIAL_SESSION, TOKEN_REFRESHED, etc.
});
```

---

### 2.2 ¿Cómo determina el sistema si el usuario está logueado?

#### **Mecanismo de Verificación:**

**1. Verificación Inicial:**
- `supabase.auth.getSession()` → Lee desde **localStorage**
- Si retorna `session` con `user` → Usuario está logueado

**2. Estado en Context:**
```typescript
const [user, setUser] = useState<User | null>(null);
const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
const [session, setSession] = useState<Session | null>(null);
```

**3. Verificación en `AppRoutes`:**
```typescript
const AppRoutes = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <LoadingFallback />;
  
  if (!user) {
    // Muestra AuthPage (login)
    return <Routes>...</Routes>;
  }
  
  // Muestra rutas protegidas
  return <Routes>...</Routes>;
};
```

**4. Verificación de Perfil:**
- El sistema requiere **AMBOS**: `user` (auth) Y `userProfile` (public.users)
- Si hay `user` pero NO `userProfile`:
  - `fetchUserProfile()` intenta obtener el perfil
  - Si falla después de 3 segundos → Cierra sesión automáticamente
  - Muestra login

**5. Cache de Perfil:**
- Cache en memoria (`profileCacheRef`) con duración de 5 minutos
- Si el perfil está cacheado y es válido (< 5 min) → Usa cache
- Si expiró o no existe → Fetch desde Supabase

---

### 2.3 ¿Dónde se guarda la sesión?

#### **Almacenamiento de Sesión:**

**1. LocalStorage (Supabase Auth):**
```typescript
// src/integrations/supabase/client.ts
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,  // ← AQUÍ
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    refreshTokenRotationEnabled: true,
    sessionRefreshMargin: 60, // Refresh 60s antes de expirar
    sessionRefreshRetryInterval: 5,
  },
});
```

**Claves en localStorage:**
- `sb-{project-ref}-auth-token` (formato Supabase)
- Contiene: `access_token`, `refresh_token`, `expires_at`, `user`

**2. SessionStorage:**
- `auth_cache_cleared`: Flag para limpieza de cache (una vez por sesión del navegador)

**3. Memoria (React State):**
- `user`: `User | null` (en `AuthContext`)
- `session`: `Session | null` (en `AuthContext`)
- `userProfile`: `UserProfile | null` (en `AuthContext`)
- `company`: `Company | null` (en `AuthContext`)

**4. Cache en Memoria (Ref):**
- `profileCacheRef`: `Map<string, { profile, company, timestamp }>`
- Duración: 5 minutos
- Limpieza automática cada 10 minutos

---

### 2.4 Flujo Completo de Autenticación

#### **Login:**
1. Usuario ingresa email/password en `LoginForm`
2. `signIn(email, password)` → `supabase.auth.signInWithPassword()`
3. Supabase valida credenciales
4. Si éxito → `onAuthStateChange` dispara evento `SIGNED_IN`
5. `AuthContext` captura el evento → `setSession(session)`, `setUser(user)`
6. `fetchUserProfile(userId)` busca perfil en `public.users`
7. Si encuentra perfil → `setUserProfile(profile)`, `setCompany(company)`
8. Cachea perfil en `profileCacheRef`
9. `sessionKeepAlive.start()` inicia refresh automático
10. `AppRoutes` detecta `user` y `userProfile` → Muestra rutas protegidas
11. `RoleBasedRedirect` redirige según rol:
    - `master_admin` → `/master-audit`
    - `admin` → `/dashboard`
    - `manager` → `/estadisticas`
    - `cashier` → `/pos`

#### **Logout:**
1. Usuario hace clic en "Cerrar Sesión"
2. `signOut()` → `supabase.auth.signOut()`
3. `onAuthStateChange` dispara evento `SIGNED_OUT`
4. `AuthContext` captura el evento:
   - `setUserProfile(null)`
   - `setCompany(null)`
   - `profileCacheRef.current.clear()`
   - `sessionKeepAlive.stop()`
   - `clearAuthCache()` (limpia localStorage/sessionStorage)
5. `setUser(null)`, `setSession(null)`
6. `AppRoutes` detecta `!user` → Muestra `AuthPage`

#### **Refresh de Sesión:**
1. **Automático (Supabase):**
   - `autoRefreshToken: true` → Refresh automático antes de expirar
   - `sessionRefreshMargin: 60` → Refresh 60s antes de expirar

2. **Manual (SessionKeepAlive):**
   - Refresh cada 15 minutos si hay actividad
   - Solo si hubo actividad en las últimas 2 horas
   - Tracking de actividad: `click`, `keypress`, `scroll`, `mousemove`, `visibilitychange`

3. **En AuthContext:**
   - Refresh cada 30 minutos en `useEffect` cuando hay sesión

---

### 2.5 Manejo de Errores y Edge Cases

#### **Timeout de Inicialización:**
- Si `initializeAuth` tarda > 8 segundos:
  - Limpia cache
  - Verifica sesión
  - Si hay sesión sin perfil → Cierra sesión
  - Si no hay sesión → Muestra login

#### **Perfil No Encontrado:**
- Si `fetchUserProfile` no encuentra perfil después de 3 segundos:
  - Cierra sesión automáticamente
  - Limpia cache
  - Muestra login

#### **Cache Corrupto:**
- `clearAuthCache()` se ejecuta:
  - Al inicio (primera vez en sesión del navegador)
  - En timeout de inicialización
  - En timeout de fetch de perfil
  - Al cerrar sesión

#### **Sesión Expirada:**
- Supabase intenta refresh automático
- Si falla → `onAuthStateChange` dispara evento
- `AuthContext` maneja el evento y cierra sesión si es necesario

---

## RESUMEN EJECUTIVO

### **Stack Tecnológico:**
- React 18.3.1 + Vite 5.4.19 + TypeScript 5.8.3
- TanStack Query 5.83.0 (NO Redux/Zustand)
- React Router 6.30.1
- Supabase 2.56.0
- Radix UI + shadcn/ui + Tailwind CSS

### **Punto de Entrada:**
- `main.tsx` → `App.tsx`
- Providers: QueryClient → Auth → Store → Tooltip → Router

### **Rutas:**
- 16 rutas protegidas principales
- Lazy loading en todas las páginas
- Guards por rol (admin, manager, cashier, master_admin)
- Redirección automática según rol

### **Autenticación:**
- Sesión en **localStorage** (Supabase)
- Perfil en **memoria** (React State + Cache Ref)
- Refresh automático cada 15-30 minutos
- Timeout de seguridad: 8s inicialización, 3s fetch perfil
- Limpieza automática de cache corrupto

---

**Fin del Documento de Contexto Maestro**





