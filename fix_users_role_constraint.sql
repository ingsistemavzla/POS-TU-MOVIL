-- ============================================================================
-- CORRECCIÓN DE CONSTRAINT DE ROLES EN TABLA USERS
-- Fecha: 2025-01-28
-- Objetivo: Incluir 'master_admin' en el constraint CHECK de roles
-- ============================================================================
-- 
-- PROBLEMA IDENTIFICADO:
-- El constraint actual solo permite: ('admin', 'manager', 'cashier')
-- Falta 'master_admin', causando que usuarios Master sean "fantasmas" en la BD
--
-- SOLUCIÓN:
-- 1. Eliminar el constraint actual
-- 2. Crear uno nuevo que incluya 'master_admin'
-- 3. Verificar integridad de datos existentes
-- ============================================================================

-- PASO 1: Verificar constraint actual (para diagnóstico)
DO $$
DECLARE
    constraint_name TEXT;
    constraint_def TEXT;
BEGIN
    SELECT conname, pg_get_constraintdef(oid)
    INTO constraint_name, constraint_def
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%';
    
    IF constraint_name IS NOT NULL THEN
        RAISE NOTICE 'Constraint actual encontrado: %', constraint_name;
        RAISE NOTICE 'Definición: %', constraint_def;
    ELSE
        RAISE NOTICE 'No se encontró constraint de role en users';
    END IF;
END $$;

-- PASO 2: Eliminar constraint existente (si existe)
-- Buscar y eliminar cualquier constraint CHECK relacionado con 'role'
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.users'::regclass
          AND contype = 'c'
          AND (
            conname LIKE '%role%' 
            OR pg_get_constraintdef(oid) LIKE '%role%'
          )
    LOOP
        EXECUTE 'ALTER TABLE public.users DROP CONSTRAINT IF EXISTS ' || constraint_record.conname || ' CASCADE';
        RAISE NOTICE 'Constraint eliminado: %', constraint_record.conname;
    END LOOP;
END $$;

-- PASO 3: Verificar integridad de datos existentes antes de aplicar nuevo constraint
-- Identificar usuarios con roles inválidos (si existen)
DO $$
DECLARE
    invalid_roles_count INTEGER;
    invalid_roles TEXT;
BEGIN
    SELECT COUNT(*), string_agg(DISTINCT role, ', ')
    INTO invalid_roles_count, invalid_roles
    FROM public.users
    WHERE role NOT IN ('master_admin', 'admin', 'manager', 'cashier');
    
    IF invalid_roles_count > 0 THEN
        RAISE WARNING 'Se encontraron % usuarios con roles inválidos: %', invalid_roles_count, invalid_roles;
        RAISE WARNING 'Estos usuarios necesitarán corrección manual antes de aplicar el constraint';
    ELSE
        RAISE NOTICE 'Todos los usuarios tienen roles válidos';
    END IF;
END $$;

-- PASO 4: Crear nuevo constraint que incluye 'master_admin'
ALTER TABLE public.users 
ADD CONSTRAINT users_role_check 
CHECK (role IN ('master_admin', 'admin', 'manager', 'cashier'));

-- PASO 5: Verificar que el constraint se creó correctamente
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.users'::regclass
          AND conname = 'users_role_check'
          AND contype = 'c'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE '✅ Constraint creado exitosamente: users_role_check';
        RAISE NOTICE 'Roles permitidos: master_admin, admin, manager, cashier';
    ELSE
        RAISE EXCEPTION '❌ Error: No se pudo crear el constraint';
    END IF;
END $$;

-- PASO 6: Verificar integridad referencial
-- Asegurar que no hay referencias huérfanas
DO $$
DECLARE
    orphaned_users_count INTEGER;
BEGIN
    -- Verificar usuarios sin company_id (no debería haber, pero verificamos)
    SELECT COUNT(*) INTO orphaned_users_count
    FROM public.users
    WHERE company_id IS NULL;
    
    IF orphaned_users_count > 0 THEN
        RAISE WARNING 'Se encontraron % usuarios sin company_id', orphaned_users_count;
    ELSE
        RAISE NOTICE '✅ Todos los usuarios tienen company_id asignado';
    END IF;
    
    -- Verificar usuarios con assigned_store_id pero sin store válida
    SELECT COUNT(*) INTO orphaned_users_count
    FROM public.users u
    LEFT JOIN public.stores s ON u.assigned_store_id = s.id
    WHERE u.assigned_store_id IS NOT NULL
      AND s.id IS NULL;
    
    IF orphaned_users_count > 0 THEN
        RAISE WARNING 'Se encontraron % usuarios con assigned_store_id inválido', orphaned_users_count;
    ELSE
        RAISE NOTICE '✅ Todos los assigned_store_id son válidos';
    END IF;
END $$;

-- PASO 7: Actualizar constraint en tabla 'invitations' si existe
-- (Mantener consistencia en toda la BD)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'invitations'
    ) THEN
        -- Eliminar constraint antiguo de invitations si existe
        ALTER TABLE public.invitations 
        DROP CONSTRAINT IF EXISTS invitations_role_check CASCADE;
        
        -- Crear nuevo constraint con master_admin
        ALTER TABLE public.invitations 
        ADD CONSTRAINT invitations_role_check 
        CHECK (role IN ('master_admin', 'admin', 'manager', 'cashier'));
        
        RAISE NOTICE '✅ Constraint actualizado en tabla invitations';
    ELSE
        RAISE NOTICE 'Tabla invitations no existe, omitiendo';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'No se pudo actualizar constraint en invitations: %', SQLERRM;
END $$;

-- PASO 8: Crear índice compuesto para optimizar búsquedas por rol y company
-- (Solo si no existe ya)
CREATE INDEX IF NOT EXISTS users_role_company_idx 
ON public.users(role, company_id) 
WHERE active = true;

-- PASO 9: Crear índice para búsquedas por assigned_store_id
-- (Útil para filtrar gerentes/cajeros por tienda)
CREATE INDEX IF NOT EXISTS users_assigned_store_idx 
ON public.users(assigned_store_id) 
WHERE assigned_store_id IS NOT NULL;

-- ============================================================================
-- RESUMEN DE CAMBIOS
-- ============================================================================
-- ✅ Constraint actualizado: Ahora permite 'master_admin', 'admin', 'manager', 'cashier'
-- ✅ Índices creados: Optimización para búsquedas por rol y tienda
-- ✅ Integridad verificada: Usuarios huérfanos identificados (si existen)
-- ============================================================================
-- 
-- PRÓXIMOS PASOS:
-- 1. Verificar que no hay usuarios con roles inválidos
-- 2. Si hay usuarios con roles inválidos, corregirlos manualmente:
--    UPDATE public.users SET role = 'admin' WHERE role = 'rol_invalido';
-- 3. Confirmar ejecución exitosa antes de continuar con Pasos 2 y 3
-- ============================================================================

