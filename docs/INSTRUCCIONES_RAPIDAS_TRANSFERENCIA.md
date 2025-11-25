# 🚀 Instrucciones Rápidas: Corregir Transferencias de Inventario

## ⚡ Opción Más Rápida: Usar Supabase CLI (RECOMENDADO)

Esta es la forma más simple y segura de aplicar la migración:

```bash
# Paso 1: Instalar Supabase CLI (solo la primera vez)
npm install -g supabase

# Paso 2: Login en Supabase (solo la primera vez)
npx supabase login

# Paso 3: Conectar tu proyecto
npx supabase link --project-ref wnobdlxtsjnlcoqsskfe

# Paso 4: Aplicar todas las migraciones pendientes
npx supabase db push
```

**O usa el script de npm:**
```bash
npm run supabase:push
```

Esto aplicará automáticamente todas las migraciones pendientes, incluyendo la de `transfer_inventory`.

---

## 📋 Opción Alternativa: Solicitar a Alguien con Acceso

Si no puedes usar Supabase CLI, la siguiente opción más simple es pedir a alguien con acceso al Dashboard:

### Paso 1: Obtener Service Role Key

1. Ve a: `https://supabase.com/dashboard/project/wnobdlxtsjnlcoqsskfe/settings/api`
2. Copia el **service_role** key (⚠️ manténlo secreto)

### Paso 2: Ejecutar Script

**Windows PowerShell:**
```powershell
$env:SUPABASE_SERVICE_ROLE_KEY="tu_key_aqui"
npm run migrate:transfer
```

**Linux/Mac:**
```bash
SUPABASE_SERVICE_ROLE_KEY="tu_key_aqui" npm run migrate:transfer
```

---

## 🔍 Verificar que Funcionó

1. **Abrir la aplicación en el navegador**
2. **Ir al módulo de Inventario**
3. **Intentar transferir un producto entre tiendas**
4. **Si funciona:** ✅ Problema resuelto
5. **Si sigue el error:** Ver sección de Troubleshooting abajo

---

## 🐛 Si Nada Funciona

### Opción Final: Aplicar Manualmente

1. **Abrir el archivo de migración:**
   ```
   supabase/migrations/20250103000002_create_transfer_inventory_function.sql
   ```

2. **Copiar TODO el contenido**

3. **Solicitar a alguien con acceso a Supabase Dashboard:**
   - Ir a: `https://supabase.com/dashboard/project/wnobdlxtsjnlcoqsskfe/editor`
   - Clic en "SQL Editor" en el menú lateral
   - Clic en "New query"
   - Pegar el contenido completo del archivo de migración
   - Clic en "Run" o presionar `Ctrl+Enter`
   - Verificar que aparezca "Success" y no haya errores
   - (Opcional) Verificar que la función existe:
     ```sql
     SELECT proname FROM pg_proc WHERE proname = 'transfer_inventory';
     ```
     Debe retornar una fila.

---

## 📞 ¿Necesitas Ayuda?

- Revisa: `docs/SOLUCION_SIN_ACCESO_SUPABASE.md` para más opciones
- Revisa: `docs/INSTRUCCIONES_TRANSFERENCIA_INVENTARIO.md` para detalles técnicos

