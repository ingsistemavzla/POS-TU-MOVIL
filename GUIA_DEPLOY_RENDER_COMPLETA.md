# 🚀 GUÍA COMPLETA: DEPLOY EN RENDER Y PRUEBAS

**Fecha:** 2025-01-29  
**Objetivo:** Deploy completo de la aplicación en Render y verificación funcional

---

## 📋 PREPARACIÓN PRE-DEPLOY

### ✅ PASO 1: Verificar Estado del Código

```bash
# Verificar cambios pendientes
git status

# Verificar que el build funciona localmente
npm run build

# Si hay errores, corregirlos antes de continuar
```

### ✅ PASO 2: Verificar que NO hay Archivos Sensibles

```bash
# Verificar que NO hay scripts SQL con credenciales en staging
git status | grep -i "SCRIPT_CAMBIO_CREDENCIALES"
git status | grep -i "DIAGNOSTICO_USUARIO"

# Si aparecen, NO hacer commit hasta quitarlos
```

---

## 📝 PASO 3: PREPARAR COMMIT

### 3.1 Agregar Archivos de Código

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
```

### 3.2 Verificar Archivos en Staging

```bash
# Ver qué archivos están listos para commit
git status

# Ver lista de archivos específicos
git diff --staged --name-only

# IMPORTANTE: Verificar que NO aparezcan:
# - SCRIPT_CAMBIO_CREDENCIALES*.sql
# - DIAGNOSTICO_USUARIO*.sql
# - Cualquier archivo con credenciales hardcodeadas
```

### 3.3 Crear Commit

```bash
git commit -m "fix: Optimización de autenticación y redirección en Hard Refresh

- Eliminado timeout artificial de 5s cuando no hay sesión
- Verificación inmediata de sesión antes de establecer timeout
- Redirección inmediata al login en < 1 segundo
- Corrección de bucle infinito en verificación de sesión
- Mejora de UX en carga inicial de la aplicación"
```

---

## 🚀 PASO 4: PUSH A GITHUB

```bash
# Verificar que estás en la rama correcta
git branch

# Si no estás en main, cambiar a main
git checkout main

# Hacer push
git push origin main

# Si hay conflictos, resolverlos primero
```

---

## ⚙️ PASO 5: CONFIGURACIÓN EN RENDER

### 5.1 Acceder a Render Dashboard

1. Ir a [https://dashboard.render.com](https://dashboard.render.com)
2. Iniciar sesión con tu cuenta
3. Seleccionar tu servicio (o crear uno nuevo)

### 5.2 Configuración del Servicio (Static Site)

**Si ya tienes un servicio configurado:**
- Render detectará automáticamente el nuevo commit
- El build se iniciará automáticamente

**Si necesitas crear un nuevo servicio:**

1. Click en **"New +"** → **"Static Site"**
2. Conectar tu repositorio de GitHub
3. Configurar:

   **Name:**
   ```
   todo-bcv-pos (o el nombre que prefieras)
   ```

   **Branch:**
   ```
   main
   ```

   **Root Directory:**
   ```
   (dejar vacío - raíz del proyecto)
   ```

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
   18.x (o superior)
   ```

### 5.3 Variables de Entorno (OPCIONAL)

**Nota:** El código actual tiene las credenciales de Supabase hardcodeadas en `src/integrations/supabase/client.ts`, por lo que **NO necesitas variables de entorno** para el deploy básico.

**Si quieres usar variables de entorno en el futuro:**

1. En Render Dashboard → Tu servicio → **Environment**
2. Agregar variables:
   - `VITE_SUPABASE_URL` = `https://swsqmsbyikznalrvydny.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `tu_clave_anon_key`

3. Modificar `src/integrations/supabase/client.ts`:
   ```typescript
   const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://swsqmsbyikznalrvydny.supabase.co";
   const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "tu_clave_por_defecto";
   ```

---

## ✅ PASO 6: VERIFICAR DEPLOY

### 6.1 En Render Dashboard

1. Ir a tu servicio en Render
2. Verificar que el build está en progreso o completado
3. Revisar los logs del build:
   - ✅ Debe mostrar: `npm install` exitoso
   - ✅ Debe mostrar: `npm run build` exitoso
   - ✅ Debe mostrar: "Build successful"
   - ❌ Si hay errores, revisar los logs y corregir

### 6.2 Verificar URL del Deploy

1. En Render Dashboard → Tu servicio
2. Copiar la URL del deploy (ej: `https://todo-bcv-pos.onrender.com`)
3. Verificar que la URL está activa

---

## 🧪 PASO 7: PRUEBAS FUNCIONALES

### 7.1 Prueba de Carga Inicial

1. **Abrir la URL del deploy en navegador**
2. **Verificar:**
   - ✅ La página carga sin errores
   - ✅ No hay pantalla blanca prolongada
   - ✅ Se muestra la pantalla de login en < 1 segundo

### 7.2 Prueba de Hard Refresh (CRÍTICA)

1. **Hacer login con credenciales válidas**
2. **Navegar a cualquier página protegida** (ej: `/dashboard`)
3. **Presionar Ctrl+Shift+R (Hard Refresh)**
4. **Verificar:**
   - ✅ Redirección al login en < 1 segundo
   - ✅ NO hay pantalla blanca de 10-20 segundos
   - ✅ NO aparece error 404
   - ✅ Usuario ve login directamente

### 7.3 Prueba de Autenticación

1. **Login con usuario válido**
2. **Verificar:**
   - ✅ Login exitoso
   - ✅ Redirección según rol (admin/manager/cashier)
   - ✅ Dashboard carga correctamente
   - ✅ No hay errores en consola

### 7.4 Prueba de Funcionalidades Principales

1. **POS (Punto de Venta):**
   - ✅ Cargar productos
   - ✅ Agregar productos al carrito
   - ✅ Procesar venta
   - ✅ Verificar que stock se actualiza

2. **Inventario:**
   - ✅ Ver lista de productos
   - ✅ Editar stock
   - ✅ Transferencias entre tiendas

3. **Ventas:**
   - ✅ Ver historial de ventas
   - ✅ Filtrar por fecha
   - ✅ Ver detalles de venta

4. **Dashboard:**
   - ✅ Ver estadísticas
   - ✅ Ver gráficos
   - ✅ Ver KPIs

---

## 🔍 PASO 8: VERIFICACIÓN DE LOGS

### 8.1 En Render Dashboard

1. Ir a tu servicio → **Logs**
2. Verificar que no hay errores críticos:
   - ❌ Errores 500
   - ❌ Errores de autenticación
   - ❌ Errores de base de datos

### 8.2 En Navegador (Consola)

1. Abrir DevTools (F12)
2. Ir a la pestaña **Console**
3. Verificar que no hay errores:
   - ❌ `ReferenceError`
   - ❌ `TypeError`
   - ❌ Errores de red (404, 500)

---

## 🐛 SOLUCIÓN DE PROBLEMAS COMUNES

### Problema 1: Build Falla en Render

**Síntomas:**
- Build muestra errores en Render Dashboard
- Build no completa

**Solución:**
```bash
# Verificar que el build funciona localmente
npm run build

# Si falla localmente, corregir errores antes de hacer push
# Verificar que todas las dependencias están en package.json
```

### Problema 2: Aplicación No Carga

**Síntomas:**
- URL muestra error 404 o página en blanco
- Build exitoso pero aplicación no funciona

**Solución:**
1. Verificar que **Publish Directory** está configurado como `dist`
2. Verificar que el build generó la carpeta `dist/`
3. Verificar que `index.html` está en `dist/`

### Problema 3: Errores de Autenticación

**Síntomas:**
- Login no funciona
- Errores de Supabase en consola

**Solución:**
1. Verificar que las credenciales de Supabase están correctas
2. Verificar que la URL de Supabase es accesible
3. Verificar que no hay problemas de CORS

### Problema 4: Hard Refresh Sigue Lento

**Síntomas:**
- Hard Refresh tarda 10-20 segundos
- Pantalla blanca prolongada

**Solución:**
1. Verificar que los cambios en `AuthContext.tsx` están en el commit
2. Verificar que el build incluye los cambios
3. Limpiar caché del navegador (Ctrl+Shift+Delete)
4. Verificar logs de Render para ver si hay errores

---

## ✅ CHECKLIST FINAL

### Pre-Deploy
- [ ] `npm run build` funciona localmente
- [ ] No hay errores de TypeScript
- [ ] No hay scripts SQL sensibles en staging
- [ ] Commit creado con mensaje descriptivo

### Deploy
- [ ] Push a GitHub completado
- [ ] Render detecta el nuevo commit
- [ ] Build inicia automáticamente
- [ ] Build completa sin errores
- [ ] Deploy se activa automáticamente

### Post-Deploy
- [ ] Aplicación accesible en URL de Render
- [ ] Login funciona correctamente
- [ ] Hard Refresh redirige en < 1 segundo
- [ ] Funcionalidades principales funcionan
- [ ] No hay errores en consola
- [ ] No hay errores en logs de Render

---

## 📞 SOPORTE

Si encuentras problemas durante el deploy:

1. **Revisar logs de Render:**
   - Render Dashboard → Tu servicio → Logs
   - Buscar errores específicos

2. **Revisar consola del navegador:**
   - F12 → Console
   - Buscar errores de JavaScript

3. **Verificar configuración:**
   - Build Command correcto
   - Publish Directory correcto
   - Variables de entorno (si aplica)

---

## 🎉 RESULTADO ESPERADO

Después de completar todos los pasos:

✅ **Aplicación desplegada en Render**  
✅ **URL accesible públicamente**  
✅ **Hard Refresh redirige en < 1 segundo**  
✅ **Todas las funcionalidades funcionan correctamente**  
✅ **Sin errores críticos en logs o consola**

---

**¡Listo para probar!** 🚀




