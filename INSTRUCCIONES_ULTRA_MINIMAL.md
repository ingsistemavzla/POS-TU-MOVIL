# 🚨 INSTRUCCIONES: Script Ultra-Mínimo para Errores 500

## ⚠️ PROBLEMA

Los errores 500 persisten incluso después de ejecutar scripts anteriores. Esto indica que las políticas RLS están causando fallos en el servidor, no solo bloqueando acceso.

## ✅ SOLUCIÓN: Script Ultra-Mínimo

### EJECUTAR: `fix_rls_ultra_minimal.sql`

Este script crea políticas **ABSOLUTAMENTE MÍNIMAS**:
- ✅ Solo lectura propia (`auth_user_id = auth.uid()`)
- ✅ Solo crear tu propio perfil
- ✅ Solo actualizar tu propio perfil

**NO tiene dependencias circulares** - no consulta `public.users` dentro de las políticas.

### PASOS:

1. **Ejecuta `fix_rls_ultra_minimal.sql`** en Supabase SQL Editor
2. **Verifica** que se crearon 3 políticas
3. **Prueba login/registro**

---

## 🔍 SI AÚN HAY ERRORES 500

### Deshabilitar RLS Temporalmente (Diagnóstico)

Si los errores 500 persisten, ejecuta esto para confirmar que el problema es RLS:

```sql
-- Deshabilitar RLS temporalmente
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
```

**Luego prueba el login/registro.** Si funciona, el problema es RLS.

**Después, vuelve a habilitar:**
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

Y ejecuta `fix_rls_ultra_minimal.sql` nuevamente.

---

## 📋 DESPUÉS DE QUE FUNCIONE

Una vez que el login/registro funcione con las políticas mínimas, podemos agregar políticas adicionales de forma incremental para:
- Admins ver usuarios de su compañía
- Eliminar usuarios desde frontend

Pero primero necesitamos que funcione lo básico.


