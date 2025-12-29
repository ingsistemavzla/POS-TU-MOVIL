# 🚀 COMANDOS PARA COMMIT Y DEPLOY

## ✅ VERIFICACIONES COMPLETADAS

- ✅ Build funciona correctamente (`npm run build` exitoso)
- ✅ `.gitignore` actualizado (excluye scripts SQL sensibles)
- ✅ Código fuente listo para commit

---

## 📝 COMANDOS PARA EJECUTAR

### 1. Verificar estado actual
```bash
git status
```

### 2. Agregar solo archivos de código (EXCLUYE scripts SQL)
```bash
# Agregar código fuente
git add src/
git add public/
git add supabase/

# Agregar configuración
git add package.json package-lock.json
git add vite.config.ts tsconfig.json tailwind.config.ts
git add index.html
git add .gitignore
git add components.json eslint.config.js postcss.config.js

# Agregar README
git add README.md

# Agregar documentación técnica relevante (opcional)
git add PLAN_COMMIT_DEPLOY.md
git add COMANDOS_COMMIT_DEPLOY.md
```

### 3. VERIFICAR que NO hay scripts SQL sensibles
```bash
git status
# Debe mostrar solo archivos de código, NO los scripts SQL
```

### 4. Commit
```bash
git commit -m "feat: Actualización de paneles de dashboard de almacén y artículos

- Actualizado InventoryDashboardHeader con KPIs completos y desglose por categoría
- Agregado ArticlesStatsRow para vista de artículos con estadísticas
- Mejorada gestión de stock por tienda con edición y transferencias
- Actualizado sistema de filtros y búsqueda en ambos paneles
- Refactorización de componentes de inventario para mejor reutilización
- Actualizado .gitignore para excluir scripts SQL sensibles"
```

### 5. Push a main
```bash
git push origin main
```

---

## 🚀 CONFIGURACIÓN EN RENDER

### Build Settings (en Render Dashboard):

**Build Command:**
```
npm install && npm run build
```

**Publish Directory:**
```
dist
```

**Node Version:**
```
18.x (o superior)
```

### Variables de Entorno (si las necesitas):

**Nota:** El código actual tiene las credenciales de Supabase hardcodeadas en `src/integrations/supabase/client.ts`, por lo que NO necesitas variables de entorno para el deploy básico.

Si quieres usar variables de entorno en el futuro:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## ✅ CHECKLIST POST-DEPLOY

Después del push, verifica en Render:

- [ ] Render detecta el nuevo commit
- [ ] Build inicia automáticamente
- [ ] Build completa sin errores
- [ ] Deploy se activa automáticamente
- [ ] Aplicación está accesible en la URL de Render
- [ ] Login funciona correctamente
- [ ] Paneles de dashboard cargan correctamente

---

## 🔍 VERIFICACIÓN RÁPIDA

### Ver qué se va a commitear:
```bash
git diff --staged --name-only
```

### Ver cambios específicos:
```bash
git diff --staged
```

### Si necesitas deshacer algo:
```bash
git reset HEAD <archivo>  # Quitar del staging
git restore <archivo>     # Descartar cambios
```

---

## ⚠️ IMPORTANTE

**NO ejecutar estos comandos si ves scripts SQL en el staging:**
- `SCRIPT_CAMBIO_CREDENCIALES*.sql`
- `DIAGNOSTICO_USUARIO*.sql`

Si aparecen, quítalos del staging:
```bash
git reset HEAD SCRIPT_CAMBIO_CREDENCIALES*.sql
git reset HEAD DIAGNOSTICO_USUARIO*.sql
```

---

**Listo para ejecutar** ✅





