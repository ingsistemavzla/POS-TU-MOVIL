# 🚨 RESUMEN: CORRECCIÓN CRÍTICA DE SEGURIDAD

## ⚠️ PROBLEMAS IDENTIFICADOS

1. **RLS NO FILTRA POR `store_id`** ❌
   - Gerentes y cajeros ven TODO el stock de la compañía
   - Gerentes y cajeros ven TODAS las ventas de la compañía
   - Gerentes y cajeros ven TODAS las tiendas de la compañía

2. **`process_sale` NO VALIDA `assigned_store_id`** ❌
   - Un cajero podría vender en otra tienda si el frontend envía el `store_id` incorrecto

3. **Frontend muestra opciones incorrectas** ⚠️
   - Cajeros ven botones de edición que no deberían tener

---

## ✅ SOLUCIONES IMPLEMENTADAS

### Script 1: `fix_rls_store_level_security_master.sql`
**OBJETIVO:** Implementar RLS que filtre por `store_id` para managers/cashiers

**CAMBIOS:**
- ✅ Elimina políticas RLS incorrectas (solo filtran por `company_id`)
- ✅ Crea políticas que filtran por `store_id` para managers/cashiers
- ✅ Global admins ven todo de su company
- ✅ Managers/Cashiers solo ven su `assigned_store`

**TABLAS AFECTADAS:**
- `inventories` - Filtrado por `store_id`
- `sales` - Filtrado por `store_id`
- `stores` - Filtrado por `assigned_store_id`
- `products` - Sin cambios (productos son a nivel company)

---

### Script 2: `fix_process_sale_add_store_validation.sql`
**OBJETIVO:** Agregar validación de `assigned_store_id` en `process_sale`

**CAMBIOS:**
- ✅ Valida `company_id` del usuario
- ✅ Si NO es admin/master_admin, valida que `p_store_id = assigned_store_id`
- ✅ Lanza excepción si el usuario intenta vender en tienda incorrecta

**VALIDACIONES AGREGADAS:**
```sql
-- Obtener información del usuario actual
SELECT role, company_id, assigned_store_id 
INTO v_user_role, v_user_company_id, v_assigned_store_id
FROM public.users
WHERE auth_user_id = auth.uid()
LIMIT 1;

-- Validar company_id
IF v_user_company_id IS DISTINCT FROM p_company_id THEN
    RAISE EXCEPTION 'No tienes permiso para procesar ventas en esta compañía';
END IF;

-- Si NO es admin/master_admin, validar que la tienda sea su assigned_store
IF v_user_role IS DISTINCT FROM 'admin' AND v_user_role IS DISTINCT FROM 'master_admin' THEN
    IF v_assigned_store_id IS NULL THEN
        RAISE EXCEPTION 'No tienes una tienda asignada. Contacta al administrador.';
    END IF;
    
    IF p_store_id IS DISTINCT FROM v_assigned_store_id THEN
        RAISE EXCEPTION 'No tienes permiso para procesar ventas en esta tienda.';
    END IF;
END IF;
```

---

## 📋 PASOS PARA APLICAR CORRECCIONES

### PASO 1: Ejecutar RLS por Tienda (CRÍTICO)
1. Abre Supabase SQL Editor
2. Ejecuta `fix_rls_store_level_security_master.sql`
3. Verifica que se crearon las políticas correctamente

**Resultado esperado:**
- Gerentes y cajeros solo verán stock/ventas de su tienda
- Global admins seguirán viendo todo

---

### PASO 2: Corregir `process_sale` (CRÍTICO)
1. Abre Supabase SQL Editor
2. Ejecuta `fix_process_sale_add_store_validation.sql`
3. Verifica que la función se creó correctamente

**Resultado esperado:**
- Un cajero/gerente no podrá vender en otra tienda
- La función lanzará excepción si intenta vender en tienda incorrecta

---

### PASO 3: Probar Seguridad
1. **Login como Gerente/Cajero**
2. **Verificar que solo ve:**
   - ✅ Stock de su tienda asignada
   - ✅ Ventas de su tienda asignada
   - ✅ Solo su tienda en el selector
3. **Intentar vender en otra tienda** (debe fallar con excepción)
4. **Verificar que no puede editar productos** (si es cajero)

---

## 🎯 CHECKLIST DE VERIFICACIÓN

- [ ] RLS implementado por `store_id` (`fix_rls_store_level_security_master.sql` ejecutado)
- [ ] `process_sale` valida `assigned_store_id` (`fix_process_sale_add_store_validation.sql` ejecutado)
- [ ] Gerentes solo ven su tienda
- [ ] Cajeros solo ven su tienda
- [ ] Global admins ven todo de su company
- [ ] No se puede vender stock de otra tienda
- [ ] Frontend no muestra opciones incorrectas para cajeros (auditar después)

---

## 🚀 ACCIÓN INMEDIATA

1. **Ejecuta `fix_rls_store_level_security_master.sql`** → Corregir RLS
2. **Ejecuta `fix_process_sale_add_store_validation.sql`** → Corregir validación de ventas
3. **Prueba como Gerente/Cajero** → Confirmar que solo ven su tienda

---

## 📝 NOTAS IMPORTANTES

- **RLS es la primera línea de defensa** - Si RLS está correcto, el frontend no puede ver datos incorrectos
- **`process_sale` es la segunda línea de defensa** - Valida que el usuario tenga permiso para vender en la tienda
- **Frontend debe confiar en RLS** - No debe filtrar por rol, RLS ya lo hace


