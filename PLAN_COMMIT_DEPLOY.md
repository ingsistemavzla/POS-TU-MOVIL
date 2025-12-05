# 📋 PLAN DE COMMIT Y DEPLOY EN RENDER

**Fecha:** 2025-01-27  
**Objetivo:** Preparar commit limpio y deploy seguro en Render

---

## 🔒 SEGURIDAD: Archivos que NO deben ir al repositorio

### ⚠️ Scripts SQL Sensibles (EXCLUIR)
- `SCRIPT_CAMBIO_CREDENCIALES_ADMIN.sql`
- `SCRIPT_CAMBIO_CREDENCIALES_ADMIN_FINAL.sql`
- `DIAGNOSTICO_USUARIO_TUMOVIL.sql`
- Cualquier script SQL con credenciales hardcodeadas

### ⚠️ Archivos de Documentación Temporal (OPCIONAL)
- Muchos archivos `.md` de auditoría y diagnóstico pueden quedarse o eliminarse según necesidad

---

## ✅ ARCHIVOS A INCLUIR EN EL COMMIT

### 1. Código Fuente (CRÍTICO)
- ✅ `src/` - Todo el código fuente
- ✅ `public/` - Assets públicos
- ✅ `supabase/migrations/` - Migraciones de base de datos
- ✅ `package.json` y `package-lock.json`
- ✅ `vite.config.ts`
- ✅ `tsconfig.json`
- ✅ `tailwind.config.ts`
- ✅ `index.html`

### 2. Configuración
- ✅ `.gitignore` (actualizado)
- ✅ `components.json`
- ✅ `eslint.config.js`
- ✅ `postcss.config.js`

### 3. Documentación Importante
- ✅ `README.md`
- ✅ Documentación técnica relevante (opcional)

---

## 🚫 ARCHIVOS A EXCLUIR DEL COMMIT

### Scripts SQL con Credenciales
```
SCRIPT_CAMBIO_CREDENCIALES_ADMIN.sql
SCRIPT_CAMBIO_CREDENCIALES_ADMIN_FINAL.sql
DIAGNOSTICO_USUARIO_TUMOVIL.sql
```

### Archivos Temporales
- Scripts SQL de diagnóstico/corrección temporal
- Backups (`.backup`, `.bak`)
- Archivos de timestamp

---

## 📝 PASOS PARA COMMIT

### Paso 1: Actualizar .gitignore
```bash
# Agregar al .gitignore:
echo "" >> .gitignore
echo "# Scripts SQL sensibles" >> .gitignore
echo "SCRIPT_CAMBIO_CREDENCIALES*.sql" >> .gitignore
echo "DIAGNOSTICO_USUARIO*.sql" >> .gitignore
```

### Paso 2: Agregar archivos de código
```bash
# Agregar solo código fuente y configuración
git add src/
git add public/
git add supabase/
git add package.json package-lock.json
git add *.config.* *.json *.ts *.html
git add README.md
```

### Paso 3: Verificar antes de commit
```bash
git status
# Revisar que NO aparezcan los scripts SQL sensibles
```

### Paso 4: Commit
```bash
git commit -m "feat: Actualización de paneles de dashboard de almacén y artículos

- Actualizado InventoryDashboardHeader con KPIs completos
- Agregado ArticlesStatsRow para vista de artículos
- Mejorada gestión de stock por tienda
- Actualizado sistema de filtros y búsqueda
- Refactorización de componentes de inventario"
```

### Paso 5: Push
```bash
git push origin main
```

---

## 🚀 CONFIGURACIÓN DE RENDER

### Build Settings en Render Dashboard

**Build Command:**
```bash
npm install && npm run build
```

**Publish Directory:**
```
dist
```

**Node Version:**
```
18.x o superior
```

### Variables de Entorno en Render

**REQUERIDAS:**
- `VITE_SUPABASE_URL` - URL de Supabase (ya está en código, pero mejor como variable)
- `VITE_SUPABASE_ANON_KEY` - Clave pública de Supabase

**OPCIONALES:**
- `NODE_ENV=production`
- `VITE_API_URL` - Si hay API externa

### Nota sobre Variables de Entorno

El código actual tiene las credenciales hardcodeadas en `src/integrations/supabase/client.ts`. Para producción, deberías:

1. **Opción 1 (Recomendada):** Usar variables de entorno
   ```typescript
   const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://swsqmsbyikznalrvydny.supabase.co";
   const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "...";
   ```

2. **Opción 2:** Mantener hardcodeadas (menos seguro pero funcional)

---

## ✅ CHECKLIST PRE-DEPLOY

### Antes de hacer commit:
- [ ] Verificar que scripts SQL sensibles NO están en staging
- [ ] Verificar que no hay credenciales hardcodeadas en código
- [ ] Verificar que `npm run build` funciona localmente
- [ ] Verificar que no hay errores de TypeScript
- [ ] Verificar que no hay errores de ESLint críticos

### Después del commit:
- [ ] Verificar que el push fue exitoso
- [ ] Verificar que Render detecta el nuevo commit
- [ ] Monitorear el build en Render
- [ ] Verificar que el deploy fue exitoso
- [ ] Probar la aplicación en producción

---

## 🔧 COMANDOS RÁPIDOS

### Verificar build local
```bash
npm run build
npm run preview
```

### Verificar cambios antes de commit
```bash
git status
git diff --staged
```

### Commit seguro
```bash
git add src/ public/ supabase/ package*.json *.config.* *.ts *.html README.md
git status  # Verificar que NO hay scripts SQL
git commit -m "feat: Actualización de paneles de dashboard"
git push origin main
```

---

## 📊 RESUMEN DE CAMBIOS PRINCIPALES

### Archivos Modificados (Código):
- `src/pages/AlmacenPage.tsx` - Panel de almacén actualizado
- `src/pages/ArticulosPage.tsx` - Panel de artículos actualizado
- `src/components/inventory/InventoryDashboardHeader.tsx` - Nuevo componente
- `src/components/inventory/ArticlesStatsRow.tsx` - Nuevo componente
- `src/hooks/useInventoryFinancialSummary.ts` - Hook compartido

### Archivos Nuevos (Código):
- Componentes de dashboard de inventario
- Hooks para resumen financiero

### Archivos Eliminados:
- Componentes obsoletos de inventario
- Páginas obsoletas (ProductsPage, InventoryPage)

---

## ⚠️ IMPORTANTE

1. **NO hacer commit de scripts SQL con credenciales**
2. **Verificar build local antes de push**
3. **Monitorear el deploy en Render**
4. **Probar la aplicación después del deploy**

---

**FIN DEL PLAN**


