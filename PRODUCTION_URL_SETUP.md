# Configuración de URLs para Producción

## Problema Resuelto

El problema era que en producción, `window.location.origin` devuelve `http://tumovilmargarita.com` (sin puerto), pero tu aplicación corre directamente en el dominio sin puerto.

## Solución Implementada

### 1. Archivo de Configuración (`src/config/environment.ts`)

```typescript
export const getAuthRedirectUrl = (): string => {
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  
  if (isProduction) {
    // Production: Use the domain without port
    return 'http://tumovilmargarita.com/auth/callback';
  } else {
    // Development: Use localhost with dynamic port
    return `${window.location.origin}/auth/callback`;
  }
};
```

### 2. URLs Configuradas

- **Desarrollo Local:** `http://localhost:8080/auth/callback`
- **Producción:** `http://tumovilmargarita.com/auth/callback`

### 3. Archivos Modificados

- ✅ `src/config/environment.ts` - Nueva configuración
- ✅ `src/contexts/AuthContext.tsx` - Registro de usuarios
- ✅ `src/pages/Users.tsx` - Invitaciones de usuarios

## Configuración en Supabase

### 1. Ir al Dashboard de Supabase
- Accede a [supabase.com](https://supabase.com)
- Selecciona tu proyecto

### 2. Configurar URLs de Redirección
- Ve a **Authentication** → **URL Configuration**
- En **Site URL**, agrega: `http://tumovilmargarita.com`
- En **Redirect URLs**, agrega: `http://tumovilmargarita.com/auth/callback`

### 3. URLs Completas para Supabase

```
Site URL: http://tumovilmargarita.comgit 
Redirect URLs:
- http://tumovilmargarita.com/auth/callback
- http://localhost:8080/auth/callback (para desarrollo)
```

## Verificación

### 1. En Desarrollo
- Las URLs de redirección usarán `localhost:8080`
- Funciona automáticamente

### 2. En Producción
- Las URLs de redirección usarán `tumovilmargarita.com`
- Los enlaces de confirmación de email funcionarán correctamente

## Notas Importantes

1. **Dominio:** Asegúrate de que tu aplicación esté corriendo en `tumovilmargarita.com` (sin puerto)
2. **HTTPS:** Si planeas usar HTTPS, cambia `http://` por `https://` en la configuración
3. **Dominio:** Si cambias el dominio, actualiza `src/config/environment.ts`

## Configuración de Vercel (SPA Routing)

### Problema de Routing
Si estás desplegando en Vercel y obtienes errores 404 en rutas como `/pos`, `/auth/callback`, etc., es porque Vercel no sabe que tu aplicación es una SPA.

### Solución: Archivo `vercel.json`
He creado un archivo `vercel.json` en la raíz del proyecto que resuelve este problema:

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

### Pasos para Aplicar:
1. **Commit y push** del archivo `vercel.json`
2. **Vercel hará auto-deploy**
3. **El routing funcionará correctamente**

## Próximos Pasos Recomendados

1. **Configurar Supabase** con las URLs correctas
2. **Hacer deploy** con el nuevo `vercel.json`
3. **Probar en producción** el flujo de autenticación
4. **Considerar HTTPS** para mayor seguridad
