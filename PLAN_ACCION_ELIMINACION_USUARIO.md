# 📋 PLAN DE ACCIÓN: Eliminación de Usuario por Email

## 🎯 Objetivo
Eliminar el usuario `tumovilcentro4@gmail.com` y habilitar la capacidad de eliminar usuarios por email en el futuro.

---

## 📊 PASO 1: DIAGNÓSTICO FORENSE (Opcional pero Recomendado)

### **¿Por qué ejecutar el diagnóstico?**
- Identifica si el usuario existe en `auth.users`, `public.users`, o ambos
- Verifica si el `auth_user_id` está correctamente vinculado
- Confirma si el usuario pertenece a la misma empresa
- Detecta si hay dependencias (sales, transfers) que puedan causar problemas

### **Instrucciones:**

1. **Abre Supabase Dashboard:**
   - Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
   - Navega a **SQL Editor**

2. **Copia y pega el contenido de `DIAGNOSTICO_ELIMINACION_USUARIO.sql`**

3. **Ejecuta el script:**
   - Haz clic en **Run** o presiona `Ctrl+Enter`
   - Revisa los resultados de cada paso

4. **Interpreta los resultados:**
   - **PASO 1:** Si retorna filas, el usuario existe en `public.users`
   - **PASO 2:** Si retorna filas, el usuario existe en `auth.users`
   - **PASO 3:** Verifica si el `auth_user_id` está vinculado
   - **PASO 4:** Confirma que tienes permisos de admin
   - **PASO 5:** Lista todos los usuarios de la misma empresa (para comparar)
   - **PASO 6:** Cuenta dependencias (sales, transfers)
   - **PASO 7:** Verifica si el usuario está activo o inactivo
   - **PASO 8:** Simula la búsqueda que hace `delete_user_atomic_admin`

### **Resultados Esperados:**

| Escenario | Diagnóstico | Acción |
|-----------|-------------|--------|
| Usuario existe en ambas tablas, `auth_user_id` vinculado | ✅ **OK** | Proceder con eliminación |
| Usuario existe en `public.users` pero `auth_user_id IS NULL` | ⚠️ **Perfil huérfano** | Eliminar perfil manualmente o usar función especial |
| Usuario existe en otra empresa | ❌ **RLS bloquea** | No se puede eliminar (seguridad) |
| Usuario no existe | ❌ **No encontrado** | Verificar email o si ya fue eliminado |

---

## 🔧 PASO 2: IMPLEMENTACIÓN DE LA SOLUCIÓN

### **Opción A: Aplicar Migración (Recomendado para Producción)**

La migración `20250128000001_create_delete_user_by_email.sql` ya está creada y lista para aplicar.

**Instrucciones:**

1. **Si usas Supabase CLI:**
   ```bash
   supabase db push
   ```

2. **Si usas Supabase Dashboard:**
   - Ve a **SQL Editor**
   - Copia y pega el contenido de `supabase/migrations/20250128000001_create_delete_user_by_email.sql`
   - Ejecuta el script

### **Opción B: Ejecutar SQL Directo (Rápido para Pruebas)**

Si prefieres ejecutar directamente sin migración:

1. **Abre Supabase SQL Editor**
2. **Copia y pega el contenido de `SOLUCION_ELIMINACION_POR_EMAIL.sql`**
3. **Ejecuta el script**

---

## 🎯 PASO 3: ELIMINAR EL USUARIO

Una vez que la función `delete_user_by_email` esté creada, ejecuta:

```sql
-- Eliminar usuario por email
SELECT delete_user_by_email('tumovilcentro4@gmail.com');
```

### **Resultados Posibles:**

#### ✅ **Éxito:**
```json
{
  "success": true,
  "message": "Usuario [Nombre] eliminado exitosamente"
}
```

#### ❌ **Error - Usuario no encontrado:**
```json
{
  "success": false,
  "error": "Usuario con email tumovilcentro4@gmail.com no encontrado en tu empresa. Verifica que el email sea correcto y que el usuario pertenezca a tu empresa."
}
```

#### ❌ **Error - Sin permisos:**
```json
{
  "success": false,
  "error": "Solo los administradores pueden eliminar usuarios"
}
```

#### ❌ **Error - Email vacío:**
```json
{
  "success": false,
  "error": "El email no puede estar vacío"
}
```

---

## 🔒 SEGURIDAD Y VALIDACIONES

La función `delete_user_by_email` incluye las siguientes validaciones:

1. ✅ **Validación de Email:** No puede estar vacío
2. ✅ **Validación de Permisos:** Solo admins pueden ejecutar
3. ✅ **Validación de Empresa:** Solo usuarios de la misma empresa
4. ✅ **Búsqueda Case-Insensitive:** `LOWER(email) = LOWER(p_email)`
5. ✅ **Reasignación de Dependencias:** Reutiliza `delete_user_atomic_admin` que:
   - Reasigna `sales.cashier_id` al admin principal
   - Reasigna `inventory_transfers.transferred_by` al admin principal
   - Reasigna `admin_activity_log.user_id` al admin principal
6. ✅ **Eliminación Atómica:** Elimina de `public.users` y `auth.users` en una transacción

---

## 📝 CHECKLIST DE EJECUCIÓN

- [ ] **PASO 1:** Ejecutar `DIAGNOSTICO_ELIMINACION_USUARIO.sql` (opcional)
- [ ] **PASO 2:** Aplicar migración `20250128000001_create_delete_user_by_email.sql`
- [ ] **PASO 3:** Ejecutar `SELECT delete_user_by_email('tumovilcentro4@gmail.com');`
- [ ] **PASO 4:** Verificar resultado (éxito o error)
- [ ] **PASO 5:** Si hay error, revisar diagnóstico y corregir

---

## 🚨 TROUBLESHOOTING

### **Problema: "Usuario no encontrado en tu empresa"**

**Causas posibles:**
1. El email es incorrecto (typo)
2. El usuario pertenece a otra empresa
3. El usuario ya fue eliminado previamente

**Solución:**
- Ejecutar diagnóstico para verificar existencia
- Verificar que el email sea exacto (case-insensitive)
- Verificar `company_id` del usuario vs. `company_id` del admin

### **Problema: "Solo los administradores pueden eliminar usuarios"**

**Causa:** El usuario que ejecuta la función no tiene `role = 'admin'`

**Solución:**
- Verificar rol del usuario actual: `SELECT public.get_user_role();`
- Usar una cuenta de admin para ejecutar la función

### **Problema: "Error al eliminar usuario: [mensaje SQL]"**

**Causa:** Error en la función `delete_user_atomic_admin` (dependencias, FK, etc.)

**Solución:**
- Revisar el mensaje de error específico
- Verificar dependencias con el diagnóstico (PASO 6)
- Si hay dependencias críticas, considerar desactivar en lugar de eliminar

---

## 📚 ARCHIVOS RELACIONADOS

- `DIAGNOSTICO_ELIMINACION_USUARIO.sql` - Script de diagnóstico
- `AUDITORIA_ELIMINACION_USUARIO.md` - Reporte completo de auditoría
- `SOLUCION_ELIMINACION_POR_EMAIL.sql` - Función SQL (alternativa directa)
- `supabase/migrations/20250128000001_create_delete_user_by_email.sql` - Migración oficial
- `delete_user_atomic_admin.sql` - Función base que se reutiliza

---

## ✅ CONCLUSIÓN

Una vez completados los pasos, tendrás:
1. ✅ Diagnóstico completo del estado del usuario
2. ✅ Función `delete_user_by_email` disponible en tu base de datos
3. ✅ Usuario `tumovilcentro4@gmail.com` eliminado (si existe y pertenece a tu empresa)
4. ✅ Capacidad futura de eliminar usuarios por email sin depender de la UI

**¿Listo para proceder?** Ejecuta el diagnóstico primero para tener certeza, luego aplica la solución.





