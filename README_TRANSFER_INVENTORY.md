# 🔧 Corrección: Transferencias de Inventario

## ❌ Problema

Los usuarios no pueden transferir productos entre sucursales. Aparece el error:

```
Could not find the function public.transfer_inventory(...) in the schema cache.
```

## ✅ Solución

Se ha creado una migración SQL que crea la función necesaria. **Debe aplicarse en Supabase.**

## 🚀 Cómo Aplicar la Migración

### Opción 1: Supabase CLI (RECOMENDADO - Más Rápido)

```bash
# Si es la primera vez
npx supabase login

# Conectar proyecto
npx supabase link --project-ref wnobdlxtsjnlcoqsskfe

# Aplicar migraciones
npx supabase db push
```

**O usar el script:**
```bash
npm run supabase:push
```

### Opción 2: Manualmente en Supabase Dashboard

1. Ir a: https://supabase.com/dashboard/project/wnobdlxtsjnlcoqsskfe/editor
2. Clic en "SQL Editor"
3. Clic en "New query"
4. Abrir: `supabase/migrations/20250103000002_create_transfer_inventory_function.sql`
5. Copiar TODO el contenido
6. Pegarlo en el SQL Editor
7. Clic en "Run" o `Ctrl+Enter`
8. Verificar que aparece "Success"

### Opción 3: Solicitar a Alguien con Acceso

Compartir el archivo `supabase/migrations/20250103000002_create_transfer_inventory_function.sql` con alguien que tenga acceso al Dashboard de Supabase para que lo ejecute manualmente.

---

## ✅ Verificación

Después de aplicar la migración:

1. Esperar 1-2 minutos (caché de Supabase puede tardar)
2. Refrescar la aplicación en el navegador
3. Ir al módulo de Inventario
4. Intentar transferir un producto entre tiendas
5. Debe funcionar sin errores ✅

---

## 📁 Archivos Relacionados

- **Migración SQL:** `supabase/migrations/20250103000002_create_transfer_inventory_function.sql`
- **Instrucciones Detalladas:** `docs/INSTRUCCIONES_TRANSFERENCIA_INVENTARIO.md`
- **Instrucciones Rápidas:** `docs/INSTRUCCIONES_RAPIDAS_TRANSFERENCIA.md`
- **Sin Acceso:** `docs/SOLUCION_SIN_ACCESO_SUPABASE.md`

---

## 🐛 Si Sigue el Error

1. Verificar que la migración se aplicó sin errores
2. Esperar 2-3 minutos más (caché)
3. Cerrar completamente el navegador y abrirlo de nuevo
4. Limpiar caché del navegador
5. Intentar de nuevo

---

## 📝 Notas

- Esta corrección NO requiere redeploy del frontend
- Solo se necesita aplicar la migración en Supabase una vez
- La función es idempotente (se puede ejecutar múltiples veces sin problemas)

