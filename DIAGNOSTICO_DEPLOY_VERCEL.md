# Diagnóstico de Deploy en Vercel

## Problema Reportado
- ❌ El deploy en Vercel está fallando
- ❌ No hay acceso directo a Vercel para ver logs
- ❌ GitHub reporta error en el deploy

## Verificación Paso a Paso

### 1. Verificar Build Local

Primero, verificar que el build funciona localmente:

```bash
# Limpiar builds anteriores
rm -rf dist

# Instalar dependencias (si es necesario)
npm install

# Ejecutar build
npm run build

# Verificar que dist se creó correctamente
ls -la dist
```

**Si el build local falla:**
- Revisar errores en la consola
- Verificar que todas las dependencias estén en `package.json`
- Verificar que no haya errores de TypeScript

### 2. Verificar Configuración de Vercel

#### 2.1. Verificar `vercel.json`
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```
✅ El archivo `vercel.json` está presente y configurado correctamente

#### 2.2. Verificar `package.json`
- Build command: `npm run build` ✅
- Output directory: `dist` (por defecto en Vite) ✅

### 3. Problemas Comunes y Soluciones

#### Problema 1: Variables de Entorno Faltantes

**Síntoma:** Build falla porque no encuentra `VITE_SUPABASE_URL` o `VITE_SUPABASE_ANON_KEY`

**Solución:** 
Aunque las variables están hardcodeadas en `src/integrations/supabase/client.ts`, Vercel podría necesitar las variables de entorno configuradas.

**Pasos:**
1. En Vercel Dashboard → Settings → Environment Variables
2. Agregar:
   ```
   VITE_SUPABASE_URL=https://wnobdlxtsjnlcoqsskfe.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indub2JkbHh0c2pubGNvcXNza2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzQzOTIsImV4cCI6MjA3MTQ1MDM5Mn0.HJhT0jTNjvKWo8I56ae10kqLKOfS3NNL7c5LwwA-Tug
   ```

#### Problema 2: Framework Preset Incorrecto

**Síntoma:** Build falla porque Vercel no detecta el framework

**Solución:**
1. En Vercel Dashboard → Settings → General → Build & Development Settings
2. Framework Preset: `Vite` (o "Other" si no está disponible)
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Install Command: `npm ci` (recomendado) o `npm install`

#### Problema 3: Node.js Version Incompatible

**Síntoma:** Build falla por versión de Node.js

**Solución:**
1. En Vercel Dashboard → Settings → General → Build & Development Settings
2. Node.js Version: `20.x` o `18.x` (verificar en `package.json` si hay `engines` especificado)

#### Problema 4: Errores de TypeScript o Linting

**Síntoma:** Build falla por errores de TypeScript

**Solución:**
- Verificar que no haya errores de TypeScript localmente:
```bash
npm run build
```

- Si hay errores, corregirlos antes de hacer push

#### Problema 5: Dependencias Faltantes o Incompatibles

**Síntoma:** Build falla por dependencias no instaladas

**Solución:**
- Verificar que todas las dependencias estén en `package.json`
- Limpiar y reinstalar:
```bash
rm -rf node_modules package-lock.json
npm install
```

### 4. Verificar Estado de Git

```bash
# Verificar que estamos en main
git branch

# Verificar que todo esté commiteado
git status

# Verificar últimos commits
git log --oneline -5

# Verificar que esté pusheado
git log origin/main..main
```

### 5. Forzar Nuevo Deploy desde GitHub

Si Vercel no detecta los cambios automáticamente:

#### Opción A: Crear un commit vacío
```bash
git commit --allow-empty -m "trigger vercel deploy"
git push origin main
```

#### Opción B: Verificar webhook en GitHub
1. Ir a GitHub → Settings → Webhooks
2. Verificar que haya un webhook para Vercel
3. Verificar que los eventos incluyan "push"

### 6. Verificar Logs de Deploy

#### Desde GitHub (si hay integración):
1. Ir a GitHub → Actions (si hay workflows configurados)
2. Revisar logs del último workflow

#### Desde Vercel (si hay acceso):
1. Ir a Vercel Dashboard → Deployments
2. Click en el último deployment
3. Revisar logs de build

### 7. Crear un Test de Build Simplificado

Crear un script de prueba para verificar que el build funciona:

```json
// package.json
{
  "scripts": {
    "build:test": "npm ci && npm run build"
  }
}
```

Ejecutar:
```bash
npm run build:test
```

## Checklist de Verificación

- [ ] Build local funciona (`npm run build`)
- [ ] `vercel.json` está presente y configurado
- [ ] `package.json` tiene `build` script
- [ ] Variables de entorno configuradas en Vercel (si es necesario)
- [ ] Framework preset configurado en Vercel (Vite o Other)
- [ ] Node.js version configurada correctamente
- [ ] Últimos cambios pusheados a `main`
- [ ] Webhook de Vercel configurado en GitHub
- [ ] No hay errores de TypeScript o linting
- [ ] Todas las dependencias están en `package.json`

## Pasos Inmediatos Recomendados

1. **Probar build local:**
   ```bash
   npm run build
   ```
   Si falla, corregir los errores antes de continuar.

2. **Verificar que todo esté commiteado:**
   ```bash
   git status
   git add .
   git commit -m "fix: corregir configuración para deploy"
   git push origin main
   ```

3. **Si el build local funciona pero Vercel falla:**
   - Verificar configuración de Vercel (Framework, Build Command, Output Directory)
   - Verificar variables de entorno en Vercel
   - Crear un commit vacío para forzar nuevo deploy:
   ```bash
   git commit --allow-empty -m "trigger vercel deploy - fix config"
   git push origin main
   ```

4. **Si persiste el problema:**
   - Contactar al administrador de Vercel
   - Revisar logs específicos del error
   - Considerar usar Vercel CLI para deploy manual:
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

## Notas Importantes

- Vercel debería detectar automáticamente los cambios en `main`
- Si el build local funciona, el problema está en la configuración de Vercel
- Siempre verificar que las variables de entorno estén configuradas
- El archivo `vercel.json` es necesario para el routing SPA (Single Page Application)

## Comandos Útiles

```bash
# Ver estado de git
git status
git log --oneline -5

# Verificar build local
npm run build

# Forzar nuevo deploy
git commit --allow-empty -m "trigger vercel deploy"
git push origin main

# Verificar que dist se creó
ls -la dist
```

