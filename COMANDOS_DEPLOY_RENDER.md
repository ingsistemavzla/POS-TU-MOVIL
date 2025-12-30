# 🚀 COMANDOS PARA DEPLOY EN RENDER (EJECUTAR EN ORDEN)

## ✅ PASO 1: VERIFICAR ESTADO

```bash
# Ver cambios pendientes
git status

# Verificar que el build funciona
npm run build
```

---

## ✅ PASO 2: AGREGAR ARCHIVOS AL COMMIT

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

# Agregar README y guías
git add README.md
git add GUIA_DEPLOY_RENDER_COMPLETA.md
git add COMANDOS_DEPLOY_RENDER.md
```

---

## ✅ PASO 3: VERIFICAR QUE NO HAY ARCHIVOS SENSIBLES

```bash
# Ver qué archivos están en staging
git status

# IMPORTANTE: Verificar que NO aparezcan:
# - SCRIPT_CAMBIO_CREDENCIALES*.sql
# - DIAGNOSTICO_USUARIO*.sql
```

---

## ✅ PASO 4: CREAR COMMIT

```bash
git commit -m "fix: Optimización de autenticación y redirección en Hard Refresh

- Eliminado timeout artificial de 5s cuando no hay sesión
- Verificación inmediata de sesión antes de establecer timeout
- Redirección inmediata al login en < 1 segundo
- Corrección de bucle infinito en verificación de sesión
- Mejora de UX en carga inicial de la aplicación"
```

---

## ✅ PASO 5: PUSH A GITHUB

```bash
# Verificar que estás en main
git branch

# Si no estás en main, cambiar
git checkout main

# Hacer push
git push origin main
```

---

## ✅ PASO 6: CONFIGURAR RENDER (SI ES PRIMERA VEZ)

### 6.1 Crear Nuevo Servicio en Render

1. Ir a: https://dashboard.render.com
2. Click en **"New +"** → **"Static Site"**
3. Conectar repositorio de GitHub
4. Configurar:

   **Name:** `todo-bcv-pos`

   **Branch:** `main`

   **Root Directory:** (vacío)

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
   18.x
   ```

5. Click en **"Create Static Site"**

### 6.2 Si Ya Tienes Servicio Configurado

- Render detectará automáticamente el nuevo commit
- El build se iniciará automáticamente
- Solo espera a que complete

---

## ✅ PASO 7: VERIFICAR DEPLOY EN RENDER

1. Ir a tu servicio en Render Dashboard
2. Verificar que el build está en progreso
3. Esperar a que el build complete (2-5 minutos)
4. Verificar que dice **"Live"** o **"Deployed"**

---

## ✅ PASO 8: PROBAR LA APLICACIÓN

### 8.1 Prueba Básica

1. Abrir la URL del deploy (ej: `https://todo-bcv-pos.onrender.com`)
2. Verificar que carga la pantalla de login

### 8.2 Prueba de Hard Refresh (CRÍTICA)

1. Hacer login
2. Navegar a `/dashboard`
3. Presionar **Ctrl+Shift+R**
4. **Verificar:** Debe redirigir al login en < 1 segundo

### 8.3 Prueba de Funcionalidades

1. Probar POS (agregar productos, procesar venta)
2. Probar Inventario (ver productos, editar stock)
3. Probar Ventas (ver historial)
4. Probar Dashboard (ver estadísticas)

---

## 🐛 SI HAY PROBLEMAS

### Build Falla

```bash
# Verificar que funciona localmente
npm run build

# Si falla, corregir errores antes de hacer push
```

### Aplicación No Carga

1. Verificar que **Publish Directory** = `dist`
2. Verificar que el build generó `dist/`
3. Verificar logs en Render Dashboard

### Hard Refresh Sigue Lento

1. Limpiar caché del navegador (Ctrl+Shift+Delete)
2. Verificar que los cambios están en el commit
3. Verificar logs de Render

---

## ✅ CHECKLIST FINAL

- [ ] `npm run build` funciona localmente
- [ ] Commit creado
- [ ] Push a GitHub completado
- [ ] Render detecta el commit
- [ ] Build completa sin errores
- [ ] Aplicación accesible en URL
- [ ] Login funciona
- [ ] Hard Refresh redirige en < 1 segundo
- [ ] Funcionalidades principales funcionan

---

**¡Listo!** 🎉







