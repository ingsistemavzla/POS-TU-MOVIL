# 🧹 REPORTE DE HIGIENE DE DEPENDENCIAS

**Fecha:** 2025-01-03  
**Auditor:** Senior Bundle Optimizer & React Architect  
**Objetivo:** Identificar dependencias huérfanas, redundancias y pesos pesados

---

## 📊 RESUMEN EJECUTIVO

| Categoría | Cantidad | Impacto Estimado |
|-----------|----------|------------------|
| **👻 Dependencias Fantasma** | 2 | ~50 KB |
| **👯 Conflictos y Duplicados** | 0 | N/A |
| **🏋️ Pesos Pesados (Uso Mínimo)** | 3 | ~200 KB |

---

## 👻 CATEGORÍA 1: DEPENDENCIAS FANTASMA

| Librería | Estado | Recomendación | Razón |
|----------|--------|---------------|-------|
| `@hookform/resolvers` | 🔴 **No usada** | **Desinstalar** | No se encuentra ningún import. `react-hook-form` se usa, pero sin resolvers de Zod. |
| `zod` | 🔴 **No usada** | **Desinstalar** | No se encuentra ningún import. No hay validación con Zod en el código. |

---

## 👯 CATEGORÍA 2: CONFLICTOS Y DUPLICADOS

| Librería | Estado | Recomendación | Razón |
|----------|--------|---------------|-------|
| **N/A** | ✅ **Sin conflictos** | - | No se encontraron duplicados. Solo hay `date-fns` (no `moment`), solo `lucide-react` (no múltiples librerías de íconos), solo `recharts` (no múltiples librerías de gráficas). |

---

## 🏋️ CATEGORÍA 3: PESOS PESADOS (Uso Mínimo)

| Librería | Tamaño Aprox. | Uso Actual | Recomendación | Razón |
|----------|---------------|------------|---------------|-------|
| `react-aria-components` | ~150 KB | 🟡 **Uso mínimo** | ⚠️ **Revisar** | Solo se usa en `switch.tsx` (1 componente). Podría reemplazarse con Radix UI. |
| `cmdk` | ~30 KB | 🟡 **Uso mínimo** | ⚠️ **Revisar** | Solo se usa en `command.tsx` (componente base). No se importa en ningún componente funcional. |
| `embla-carousel-react` | ~20 KB | 🟡 **Uso mínimo** | ⚠️ **Revisar** | Solo se usa en `carousel.tsx` (componente base). No se importa en ningún componente funcional. |
| `input-otp` | ~15 KB | 🟡 **Uso mínimo** | ⚠️ **Revisar** | Solo se usa en `input-otp.tsx` (componente base). No se importa en ningún componente funcional. |
| `react-day-picker` | ~40 KB | 🟢 **En uso** | ✅ **Mantener** | Se usa en `calendar.tsx` y se importa extensivamente en `SalesPage.tsx`, `GenerateReportModal.tsx`, `ExportModal.tsx`, `AdvancedFiltersModal.tsx`, etc. (15+ archivos) |
| `react-resizable-panels` | ~25 KB | 🔴 **No usado** | ⚠️ **Revisar** | Solo se usa en `resizable.tsx` (componente base). No se importa en ningún componente funcional. |
| `vaul` | ~20 KB | 🔴 **No usado** | ⚠️ **Revisar** | Solo se usa en `drawer.tsx` (componente base). No se importa en ningún componente funcional. |
| `react-hook-form` | ~30 KB | 🟢 **En uso** | ✅ **Mantener** | Se usa en `form.tsx` y se exporta para uso en formularios (aunque sin resolvers de Zod). |

---

## ✅ DEPENDENCIAS ACTIVAS Y NECESARIAS

### **Core Framework:**
- ✅ `react` / `react-dom` - **ACTIVO** (Framework base)
- ✅ `react-router-dom` - **ACTIVO** (Routing en App.tsx)
- ✅ `@tanstack/react-query` - **ACTIVO** (Usado en hooks)

### **UI Components (Radix UI):**
- ✅ `@radix-ui/*` (28 paquetes) - **ACTIVOS** (Usados extensivamente en `src/components/ui/`)

### **Styling:**
- ✅ `tailwindcss` / `tailwind-merge` / `tailwindcss-animate` - **ACTIVOS** (Sistema de estilos)
- ✅ `clsx` / `class-variance-authority` - **ACTIVOS** (Utilidades de clases)

### **Backend:**
- ✅ `@supabase/supabase-js` - **ACTIVO** (Usado en todos los hooks y contextos)

### **Utilidades:**
- ✅ `date-fns` - **ACTIVO** (Usado en 7+ archivos para formateo de fechas)
- ✅ `lucide-react` - **ACTIVO** (Usado en 90+ archivos para íconos)
- ✅ `recharts` - **ACTIVO** (Usado en Dashboard, StoreDashboardPage, y componentes de gráficas)
- ✅ `jspdf` / `jspdf-autotable` - **ACTIVOS** (Usados en generación de PDFs: pdfGenerator.ts, invoicePdfGenerator.ts, salesReport.ts, inventoryReport.ts)
- ✅ `sonner` - **ACTIVO** (Usado en App.tsx y sonner.tsx para notificaciones)
- ✅ `next-themes` - **ACTIVO** (Usado en sonner.tsx para tema)

### **Formularios:**
- ✅ `react-hook-form` - **ACTIVO** (Usado en form.tsx, aunque sin resolvers de Zod)
- ❌ `@hookform/resolvers` - **NO USADO** (No hay validación con resolvers)
- ❌ `zod` - **NO USADO** (No hay validación con Zod)

---

## 📋 ANÁLISIS DETALLADO

### **🔴 Dependencias Fantasma Confirmadas:**

#### 1. `@hookform/resolvers` (v3.10.0)
- **Búsqueda realizada:** `@hookform/resolvers` en todo `src/`
- **Resultado:** ❌ **0 importaciones encontradas**
- **Razón:** `react-hook-form` se usa en `form.tsx`, pero no se usa ningún resolver (ZodResolver, YupResolver, etc.)
- **Impacto:** ~10 KB
- **Recomendación:** ✅ **Desinstalar** - No hay validación con resolvers

#### 2. `zod` (v3.25.76)
- **Búsqueda realizada:** `zod` en todo `src/`
- **Resultado:** ❌ **0 importaciones encontradas**
- **Razón:** No hay validación de esquemas con Zod en el código
- **Impacto:** ~40 KB
- **Recomendación:** ✅ **Desinstalar** - No se usa en absoluto

---

### **🟡 Componentes UI Base (Shadcn) - Uso Indirecto:**

Estos componentes están en `src/components/ui/` pero **NO se importan directamente** en componentes funcionales:

1. **`cmdk`** → Usado en `command.tsx`, pero `Command` no se importa en ningún componente funcional
2. **`embla-carousel-react`** → Usado en `carousel.tsx`, pero `Carousel` no se importa en ningún componente funcional
3. **`input-otp`** → Usado en `input-otp.tsx`, pero `InputOTP` no se importa en ningún componente funcional
4. **`react-resizable-panels`** → Usado en `resizable.tsx`, pero `Resizable` no se importa en ningún componente funcional
5. **`vaul`** → Usado en `drawer.tsx`, pero `Drawer` no se importa en ningún componente funcional
6. **`react-aria-components`** → Usado en `switch.tsx`, pero `Switch` SÍ se usa en `Users.tsx` y `SettingsPage.tsx`

**Nota:** Estos componentes son parte de la biblioteca Shadcn UI base. Aunque no se usan actualmente, podrían ser útiles en el futuro. **Recomendación:** Mantener por ahora, pero documentar que no están en uso.

---

## 🎯 PLAN DE ACCIÓN RECOMENDADO

### **FASE 1: Eliminación Segura (Dependencias Fantasma)**

```bash
npm uninstall @hookform/resolvers zod
```

**Impacto:** ~50 KB liberados  
**Riesgo:** 🟢 **BAJO** - Confirmado que no se usan

---

### **FASE 2: Revisión de Componentes UI Base (Opcional)**

Si se confirma que estos componentes NO se usarán en el futuro:

```bash
# Solo si se confirma que no se usarán:
npm uninstall cmdk embla-carousel-react input-otp react-resizable-panels vaul
```

**Impacto:** ~105 KB liberados  
**Riesgo:** 🟡 **MEDIO** - Son componentes base de Shadcn, podrían ser útiles

**Recomendación:** ⚠️ **MANTENER** por ahora - Son parte del ecosistema Shadcn UI

---

### **FASE 3: Optimización de react-aria-components (Opcional)**

Si se decide reemplazar `Switch` de `react-aria-components` por `@radix-ui/react-switch`:

```bash
# Reemplazar en switch.tsx y luego:
npm uninstall react-aria-components
```

**Impacto:** ~150 KB liberados  
**Riesgo:** 🟡 **MEDIO** - Requiere modificar código

**Recomendación:** ⚠️ **REVISAR** - Solo si se quiere reducir bundle size

---

## ✅ VERIFICACIÓN POST-LIMPIEZA

Después de eliminar dependencias, ejecutar:

```bash
# 1. Verificar que no hay errores
npm run build

# 2. Verificar que la app inicia
npm run dev

# 3. Verificar que no hay imports rotos
npm run lint
```

---

## 📊 RESUMEN FINAL

| Categoría | Librerías | Acción | Impacto |
|-----------|-----------|--------|---------|
| **👻 Fantasma** | `@hookform/resolvers`, `zod` | ✅ **Desinstalar** | ~50 KB |
| **👯 Duplicados** | Ninguno | ✅ **Sin acción** | - |
| **🏋️ Pesos Pesados** | Componentes UI base | ⚠️ **Revisar** | ~300 KB (opcional) |

---

## 🎯 CONCLUSIÓN

**Dependencias a eliminar inmediatamente:**
1. ✅ `@hookform/resolvers` - No se usa
2. ✅ `zod` - No se usa

**Dependencias a mantener (por ahora):**
- `react-day-picker` - **EN USO ACTIVO** (15+ archivos)
- `react-hook-form` - **EN USO ACTIVO** (form.tsx)
- Componentes UI base (Shadcn) - Podrían ser útiles en el futuro:
  - `cmdk`, `embla-carousel-react`, `input-otp`, `react-resizable-panels`, `vaul` - No se usan actualmente pero son parte del ecosistema Shadcn
- `react-aria-components` - Se usa en Switch (aunque podría reemplazarse)

**Impacto total de limpieza segura:** ~50 KB liberados

---

**Estado:** ✅ **REPORTE COMPLETO**  
**Próximo paso:** Ejecutar `npm uninstall @hookform/resolvers zod`

