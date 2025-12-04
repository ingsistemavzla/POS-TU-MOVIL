# 📋 AUDITORÍA TÉCNICA DEL PROYECTO

**Fecha:** 2025-01-XX  
**Objetivo:** Análisis completo del stack tecnológico antes de cambios visuales

---

## 1. FRAMEWORK CORE

### **Stack Principal:**
- **Framework:** React 18.3.1 (SPA - Single Page Application)
- **Build Tool:** Vite 5.4.19 (con plugin React SWC para compilación rápida)
- **Router:** React Router DOM 6.30.1
- **TypeScript:** 5.8.3 (con configuración flexible: `noImplicitAny: false`, `strictNullChecks: false`)
- **Estado Global:** Context API (AuthContext, ChatContext, StoreContext)
- **Data Fetching:** TanStack React Query 5.83.0 + Supabase Client 2.56.0

### **Arquitectura:**
- **Patrón:** Component-Based Architecture
- **Estructura:** Feature-based organization (`pages/`, `components/`, `hooks/`, `contexts/`)
- **Alias de Path:** `@/` apunta a `./src/`

---

## 2. ESTADO DEL STYLING

### **Tailwind CSS:**
- **Versión:** 3.4.17
- **Configuración:** `tailwind.config.ts` (TypeScript)
- **Plugins Instalados:**
  - `tailwindcss-animate` 1.0.7 (animaciones)
  - `@tailwindcss/typography` 0.5.16 (devDependencies - no activo en config)

### **Pre-procesadores:**
- ❌ **No se usan SASS/LESS**
- ❌ **No se usan CSS Modules**
- ✅ **Solo Tailwind CSS puro** con `@layer` directives en `index.css`

### **Sistema de Diseño:**
- **Tema:** Dark Mode con variables CSS custom (`--primary`, `--background`, etc.)
- **Colores:** HSL-based color system con variables CSS
- **Breakpoints:** `xs: 475px`, `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`
- **Animaciones:** Custom keyframes (`fade-in`, `glow-pulse`, `float`, `shine`, `zoom-bounce`)

---

## 3. COMPONENTES UI

### **Librería Base:**
- ✅ **ShadcnUI** (implícito por estructura de `src/components/ui/`)
- ✅ **Radix UI** (componentes primitivos accesibles):
  - `@radix-ui/react-dialog`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-select`
  - `@radix-ui/react-toast`
  - `@radix-ui/react-tabs`
  - Y 20+ componentes más

### **Componentes Custom:**
- ✅ **51 componentes UI** en `src/components/ui/` (50 `.tsx`, 1 `.ts`)
- ✅ **Componentes de Negocio:**
  - `components/auth/` (Login, Register, EditProfile)
  - `components/dashboard/` (KPIs, Charts, Stats)
  - `components/pos/` (POS Wizard, Product Form)
  - `components/reports/` (Report Modals, Filters)
  - `components/sales/` (Sale Detail, Stats)

### **Utilidades:**
- `class-variance-authority` 0.7.1 (variantes de componentes)
- `clsx` 2.1.1 + `tailwind-merge` 2.6.0 (merge de clases)

---

## 4. ICONOGRAFÍA

### **Librería Principal:**
- ✅ **Lucide React** 0.462.0
- **Uso:** Iconos SVG como componentes React
- **Ejemplos:** `LayoutDashboard`, `ShoppingCart`, `Package`, `Users`, `Store`, `Settings`, etc.

---

## 5. FUENTES

### **Fuente Principal:**
- ✅ **Google Fonts - Inter** (cargada en `index.html`)
- **Pesos:** 300, 400, 500, 600, 700, 800
- **Configuración:** Preconnect + link tag en `<head>`
- **Fallback:** `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif`

### **Fuente Secundaria (CSS):**
- **Questrial** mencionada en `index.css` pero no cargada (posible inconsistencia)

---

## 6. ESTRUCTURA DE CARPETAS

```
src/
├── components/        # Componentes reutilizables
│   ├── ui/          # 51 componentes ShadcnUI
│   ├── auth/        # Autenticación
│   ├── dashboard/   # Componentes del dashboard
│   ├── pos/         # Componentes POS
│   ├── reports/     # Componentes de reportes
│   └── layout/      # MainLayout, UserMenu
├── pages/           # Páginas principales (15 archivos)
├── hooks/           # Custom hooks (13 archivos)
├── contexts/        # Context providers (3 archivos)
├── integrations/    # Supabase client y types
├── lib/             # Utilidades y helpers
├── utils/           # Utilidades específicas
└── types/           # TypeScript types
```

---

## 7. DEPENDENCIAS CRÍTICAS

### **Backend:**
- `@supabase/supabase-js` 2.56.0

### **Formularios:**
- `react-hook-form` 7.61.1
- `@hookform/resolvers` 3.10.0
- `zod` 3.25.76 (validación)

### **Gráficos:**
- `recharts` 2.15.4

### **PDF:**
- `jspdf` 3.0.2
- `jspdf-autotable` 5.0.2

### **Fechas:**
- `date-fns` 3.6.0
- `react-day-picker` 8.10.1

### **Otros:**
- `sonner` 1.7.4 (toast notifications)
- `next-themes` 0.3.0 (theme management)
- `cmdk` 1.1.1 (command menu)

---

## 8. CONFIRMACIÓN DE PROTOCOLO: "FUNCIONALIDAD INTOCABLE"

### ✅ **CONFIRMACIÓN EXPLÍCITA:**

Entiendo y aplicaré estrictamente las siguientes reglas durante todo el proceso de rediseño:

#### **1. Lógica Preservada:**
- ✅ **NO eliminaré ni modificaré:**
  - Hooks (`useState`, `useEffect`, `useCallback`, `useMemo`, custom hooks)
  - Estados (`const [state, setState] = useState(...)`)
  - Funciones manejadoras de eventos (`handleSubmit`, `onClick`, `onChange`)
  - Llamadas a API (`supabase.from()`, `supabase.rpc()`)
  - Lógica de negocio (cálculos, validaciones, transformaciones de datos)

#### **2. Estructura del DOM:**
- ✅ **Mantendré la estructura semántica del HTML**
- ✅ **Solo modificaré clases CSS (`className`)**
- ✅ **Si necesito agregar `div` contenedores para efectos visuales, lo haré sin romper el flujo de datos**
- ✅ **NO eliminaré elementos funcionales (inputs, buttons, forms)**

#### **3. Imports:**
- ✅ **NO eliminaré importaciones de librerías funcionales**
- ✅ **Solo agregaré imports si son necesarios para estilos (ej: nuevos iconos de Lucide)**

#### **4. Responsive:**
- ✅ **Los cambios visuales NO romperán la usabilidad móvil existente**
- ✅ **Respetaré los breakpoints actuales (`xs`, `sm`, `md`, `lg`, `xl`, `2xl`)**
- ✅ **Mantendré las clases responsive existentes**

#### **5. Accesibilidad:**
- ✅ **NO modificaré atributos de accesibilidad (`aria-*`, `role`, `tabIndex`)**
- ✅ **Mantendré la estructura semántica de Radix UI**

---

## 9. ÁMBITO DE CAMBIOS PERMITIDOS

### ✅ **SÍ PUEDO MODIFICAR:**
- Colores (variables CSS, clases Tailwind)
- Sombras (`box-shadow`, `shadow-*`)
- Bordes (`border-*`, `rounded-*`)
- Espaciados (`padding`, `margin`, `gap`, `space-*`)
- Tamaños de fuente (`text-*`)
- Efectos visuales (`backdrop-blur`, `opacity`, `gradient-*`)
- Animaciones (si no afectan la funcionalidad)
- Imágenes/Logos (rutas de archivos)

### ❌ **NO PUEDO MODIFICAR:**
- Lógica de componentes
- Props y sus tipos
- Event handlers
- Hooks y sus dependencias
- Estructura de datos
- Validaciones
- Llamadas a API
- Rutas de navegación
- Estados y sus actualizaciones

---

## 10. RESUMEN EJECUTIVO

### **Stack Tecnológico:**
- **Frontend:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS 3.4 + Custom CSS Variables
- **UI Components:** ShadcnUI + Radix UI
- **Icons:** Lucide React
- **Fonts:** Google Fonts (Inter)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)

### **Estado del Proyecto:**
- ✅ Arquitectura sólida y bien organizada
- ✅ Sistema de diseño consistente
- ✅ Componentes reutilizables
- ✅ TypeScript configurado (modo flexible)
- ✅ Responsive design implementado

### **Protocolo Aceptado:**
✅ **CONFIRMADO:** Respetaré estrictamente la "Funcionalidad Intocable" durante todos los cambios visuales.

---

**FIN DE LA AUDITORÍA**


