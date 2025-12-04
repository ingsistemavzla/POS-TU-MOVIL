# 🚨 INSTRUCCIONES: CORRECCIÓN CRÍTICA DE SEGURIDAD

## ⚠️ PROBLEMAS CRÍTICOS IDENTIFICADOS

1. **RLS NO FILTRA POR `store_id`** - Gerentes y cajeros ven TODO el stock/ventas
2. **Frontend muestra opciones incorrectas** - Cajeros ven botones de edición
3. **`process_sale` no valida `assigned_store_id`** - Puede vender en tienda incorrecta
4. **No hay protocolo de creación de usuarios** - Falta documentación

---

## ✅ SOLUCIÓN PASO A PASO

### PASO 1: Ejecutar RLS por Tienda (CRÍTICO)

**Ejecuta `fix_rls_store_level_security_master.sql`** en Supabase SQL Editor.

Este script:
- ✅ Elimina políticas RLS incorrectas
- ✅ Crea políticas que filtran por `store_id` para managers/cashiers
- ✅ Global admins ven todo de su company
- ✅ Managers/Cashiers solo ven su `assigned_store`

**Resultado esperado:**
- Gerentes y cajeros solo verán stock/ventas de su tienda
- Global admins seguirán viendo todo

---

### PASO 2: Verificar `process_sale` (CRÍTICO)

**Verifica** que la función `process_sale` más reciente valide `assigned_store_id`.

**Si NO valida**, agrega esta validación al inicio de la función:

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

-- Si NO es admin, validar que la tienda sea su assigned_store
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

### PASO 3: Auditar Frontend (IMPORTANTE)

**Archivos a revisar:**
- `src/pages/AlmacenPage.tsx` - Verificar que cajeros no vean botones de edición
- `src/pages/POS.tsx` - Verificar que solo muestre productos de la tienda asignada
- `src/pages/SalesPage.tsx` - Verificar que solo muestre ventas de la tienda asignada

**Cambios necesarios:**
- Remover condicionales de rol del frontend (RLS ya lo maneja)
- Asegurar que el frontend no muestre opciones que RLS bloqueará

---

### PASO 4: Probar Seguridad

**Después de aplicar las correcciones:**

1. **Login como Gerente/Cajero**
2. **Verificar que solo ve:**
   - ✅ Stock de su tienda asignada
   - ✅ Ventas de su tienda asignada
   - ✅ Solo su tienda en el selector
3. **Intentar vender en otra tienda** (debe fallar)
4. **Intentar editar producto** (debe fallar si es cajero)

---

## 📋 CHECKLIST DE VERIFICACIÓN

- [ ] RLS implementado por `store_id` (`fix_rls_store_level_security_master.sql` ejecutado)
- [ ] `process_sale` valida `assigned_store_id`
- [ ] Frontend no muestra opciones incorrectas para cajeros
- [ ] Gerentes solo ven su tienda
- [ ] Cajeros solo ven su tienda
- [ ] Global admins ven todo de su company
- [ ] No se puede vender stock de otra tienda

---

## 🚀 ACCIÓN INMEDIATA

1. **Ejecuta `fix_rls_store_level_security_master.sql`** → Corregir RLS
2. **Verifica `process_sale`** → Agregar validación si falta
3. **Prueba como Gerente/Cajero** → Confirmar que solo ven su tienda


