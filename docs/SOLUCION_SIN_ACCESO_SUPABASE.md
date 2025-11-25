# Solución para Aplicar Migración Sin Acceso Directo a Supabase

## 🎯 Problema

No tienes acceso directo al SQL Editor de Supabase Dashboard, pero necesitas aplicar la migración de `transfer_inventory`.

## ✅ Soluciones Disponibles

### Opción 1: Usar Supabase CLI (RECOMENDADO)

Si tienes Supabase CLI instalado o puedes instalarlo:

```bash
# Instalar Supabase CLI globalmente
npm install -g supabase

# O usar npx (sin instalación global)
npx supabase@latest

# Conectar con tu proyecto
npx supabase link --project-ref wnobdlxtsjnlcoqsskfe

# Aplicar migraciones pendientes
npx supabase db push
```

**Ventajas:**
- ✅ Automático y seguro
- ✅ Aplica todas las migraciones pendientes
- ✅ Mantiene historial de migraciones aplicadas

**Desventajas:**
- ⚠️ Requiere acceso de autenticación con Supabase

---

### Opción 2: Script Node.js con Service Role Key

Si tienes acceso al **service_role key** de tu proyecto Supabase:

1. **Obtener el Service Role Key:**
   - Ve a Supabase Dashboard → Settings → API
   - Copia el **service_role** key (⚠️ manténlo secreto, tiene permisos completos)

2. **Ejecutar el script:**

   **En Windows (PowerShell):**
   ```powershell
   $env:SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key_aqui"
   node scripts/apply-transfer-inventory-migration.js
   ```

   **En Linux/Mac:**
   ```bash
   SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key_aqui" node scripts/apply-transfer-inventory-migration.js
   ```

**Ventajas:**
- ✅ No requiere interfaz gráfica
- ✅ Puede automatizarse

**Desventajas:**
- ⚠️ Requiere el service_role key (muy sensible)
- ⚠️ El script actual puede necesitar ajustes dependiendo de la configuración de Supabase

---

### Opción 3: Solicitar a Alguien con Acceso

Si hay otro miembro del equipo con acceso a Supabase Dashboard:

1. Compartir el archivo de migración:
   - `supabase/migrations/20250103000002_create_transfer_inventory_function.sql`

2. Pedir que ejecuten estos pasos:
   - Ir a SQL Editor en Supabase Dashboard
   - Copiar y pegar el contenido del archivo
   - Ejecutar la consulta
   - Verificar que no hay errores

**Ventajas:**
- ✅ Más seguro (no requiere credenciales sensibles)
- ✅ Permite supervisión del proceso

**Desventajas:**
- ⚠️ Depende de disponibilidad de otra persona

---

### Opción 4: Crear Edge Function Temporal (AVANZADO)

Crear una Edge Function en Supabase que ejecute la migración cuando se llame:

1. **Crear Edge Function:**
```typescript
// supabase/functions/apply-migration/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const migrationSQL = `
    -- Contenido de la migración aquí
  `;
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  // Ejecutar migración...
});
```

2. **Desplegar y llamar:**
```bash
supabase functions deploy apply-migration
curl https://wnobdlxtsjnlcoqsskfe.supabase.co/functions/v1/apply-migration
```

**Ventajas:**
- ✅ Reutilizable
- ✅ Puede incluir validaciones

**Desventajas:**
- ⚠️ Requiere más conocimiento técnico
- ⚠️ Necesita deploy de Edge Function

---

### Opción 5: Usar API REST Directamente (TÉCNICO)

Si Supabase tiene habilitado el endpoint para ejecutar SQL directamente (poco común):

```bash
curl -X POST 'https://wnobdlxtsjnlcoqsskfe.supabase.co/rest/v1/rpc/exec_sql' \
  -H 'apikey: TU_SERVICE_ROLE_KEY' \
  -H 'Authorization: Bearer TU_SERVICE_ROLE_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "sql": "-- Contenido de la migración aquí"
  }'
```

**Desventajas:**
- ❌ Raramente está habilitado por defecto
- ❌ Requiere configuración especial en Supabase

---

## 🚀 RECOMENDACIÓN: Opción 1 (Supabase CLI)

Para la mayoría de casos, usar Supabase CLI es la mejor opción:

```bash
# Instalar si no está instalado
npm install -g supabase

# Login (si es necesario)
npx supabase login

# Conectar proyecto
npx supabase link --project-ref wnobdlxtsjnlcoqsskfe

# Aplicar todas las migraciones
npx supabase db push
```

---

## 📋 Verificación Post-Migración

Después de aplicar la migración, verificar que funcionó:

### Desde el código (TypeScript/JavaScript):

```typescript
const { data, error } = await supabase.rpc('transfer_inventory', {
  p_product_id: 'test-id',
  p_from_store_id: 'test-id',
  p_to_store_id: 'test-id',
  p_quantity: 1,
  p_company_id: 'test-id',
  p_transferred_by: 'test-id'
});

if (error && error.message.includes('schema cache')) {
  console.error('❌ La función aún no existe');
} else {
  console.log('✅ La función existe (o hay otro error de validación)');
}
```

### Desde SQL (si tienes acceso):

```sql
-- Verificar que la función existe
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname = 'transfer_inventory';

-- Debe retornar una fila con la función
```

---

## 🔧 Troubleshooting

### Error: "Could not find the function in the schema cache"

**Causa:** La función no existe en la base de datos o el caché no se ha actualizado.

**Solución:**
1. Aplicar la migración usando una de las opciones anteriores
2. Esperar 1-2 minutos (el caché puede tardar en actualizarse)
3. Refrescar el navegador/aplicación
4. Intentar de nuevo

### Error: "Permission denied"

**Causa:** Las credenciales no tienen permisos suficientes.

**Solución:**
- Usar `service_role` key en vez de `anon` key
- Verificar que el usuario tiene rol `admin` o `manager` en la tabla `users`

### Error: "Table does not exist"

**Causa:** Faltan dependencias (tablas que la función necesita).

**Solución:**
- La migración incluye `CREATE TABLE IF NOT EXISTS` para `inventory_transfers`
- Verificar que existan las tablas: `inventories`, `products`, `stores`, `users`, `companies`

---

## 📝 Checklist Final

- [ ] Migración aplicada exitosamente
- [ ] Función `transfer_inventory` existe (verificación SQL o código)
- [ ] Tabla `inventory_transfers` existe
- [ ] Probado transferencia desde el frontend
- [ ] Stock se actualiza correctamente en ambas tiendas
- [ ] No hay errores en consola del navegador

---

## 🆘 ¿Ninguna Opción Funciona?

Si ninguna de las opciones anteriores es viable, considera:

1. **Contactar soporte de Supabase:** Pueden ayudar con problemas de acceso
2. **Crear un ticket interno:** Si trabajas en un equipo, asignar la tarea a alguien con acceso
3. **Usar un entorno temporal:** Crear una base de datos temporal para probar la migración antes

---

## 📞 Contacto

Si necesitas ayuda adicional con este proceso, documenta:
- Qué opción intentaste
- Qué error específico apareció
- Capturas de pantalla o logs relevantes

