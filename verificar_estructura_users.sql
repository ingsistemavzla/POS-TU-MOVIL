-- ============================================================================
-- SCRIPT DE VERIFICACIÓN: Estructura de la Tabla `public.users`
-- Fecha: 2025-01-27
-- Objetivo: Verificar la estructura exacta de la tabla users para RLS
-- ============================================================================

-- ============================================================================
-- 1. ESTRUCTURA DE COLUMNAS
-- ============================================================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- ============================================================================
-- 2. CONSTRAINTS (CHECK, FOREIGN KEY, UNIQUE, PRIMARY KEY)
-- ============================================================================
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass
ORDER BY contype, conname;

-- ============================================================================
-- 3. FOREIGN KEYS (Relaciones)
-- ============================================================================
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'users';

-- ============================================================================
-- 4. ÍNDICES
-- ============================================================================
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'users'
ORDER BY indexname;

-- ============================================================================
-- 5. VERIFICACIÓN DE CONSTRAINT DE ROLES
-- ============================================================================
DO $$
DECLARE
    v_constraint_def TEXT;
    v_roles_allowed TEXT;
BEGIN
    SELECT pg_get_constraintdef(oid)
    INTO v_constraint_def
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%'
    LIMIT 1;
    
    IF v_constraint_def IS NOT NULL THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ CONSTRAINT DE ROLES ENCONTRADO:';
        RAISE NOTICE '   %', v_constraint_def;
        
        -- Extraer roles permitidos
        IF v_constraint_def LIKE '%master_admin%' THEN
            RAISE NOTICE '   ✅ Incluye: master_admin';
        ELSE
            RAISE WARNING '   ⚠️ NO incluye: master_admin';
        END IF;
        
        IF v_constraint_def LIKE '%admin%' THEN
            RAISE NOTICE '   ✅ Incluye: admin';
        ELSE
            RAISE WARNING '   ⚠️ NO incluye: admin';
        END IF;
        
        IF v_constraint_def LIKE '%manager%' THEN
            RAISE NOTICE '   ✅ Incluye: manager';
        ELSE
            RAISE WARNING '   ⚠️ NO incluye: manager';
        END IF;
        
        IF v_constraint_def LIKE '%cashier%' THEN
            RAISE NOTICE '   ✅ Incluye: cashier';
        ELSE
            RAISE WARNING '   ⚠️ NO incluye: cashier';
        END IF;
    ELSE
        RAISE WARNING '⚠️ No se encontró constraint de roles en la tabla users';
    END IF;
END $$;

-- ============================================================================
-- 6. VERIFICACIÓN DE FUNCIONES HELPER
-- ============================================================================
SELECT 
    routine_name,
    routine_type,
    data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
    AND routine_name IN (
        'get_user_company_id',
        'get_assigned_store_id',
        'is_admin',
        'is_master_admin'
    )
ORDER BY routine_name;

-- ============================================================================
-- 7. RESUMEN EJECUTIVO
-- ============================================================================
DO $$
DECLARE
    v_column_count INTEGER;
    v_index_count INTEGER;
    v_constraint_count INTEGER;
    v_has_auth_user_id BOOLEAN;
    v_has_role BOOLEAN;
    v_has_assigned_store_id BOOLEAN;
    v_has_company_id BOOLEAN;
    v_has_active BOOLEAN;
BEGIN
    -- Contar columnas
    SELECT COUNT(*) INTO v_column_count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users';
    
    -- Contar índices
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'users';
    
    -- Contar constraints
    SELECT COUNT(*) INTO v_constraint_count
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass;
    
    -- Verificar columnas críticas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_user_id'
    ) INTO v_has_auth_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
    ) INTO v_has_role;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'assigned_store_id'
    ) INTO v_has_assigned_store_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'company_id'
    ) INTO v_has_company_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'active'
    ) INTO v_has_active;
    
    -- Mostrar resumen
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '📊 RESUMEN EJECUTIVO: Tabla public.users';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📋 ESTRUCTURA:';
    RAISE NOTICE '   Total de columnas: %', v_column_count;
    RAISE NOTICE '   Total de índices: %', v_index_count;
    RAISE NOTICE '   Total de constraints: %', v_constraint_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔑 COLUMNAS CRÍTICAS PARA RLS:';
    RAISE NOTICE '   auth_user_id: %', CASE WHEN v_has_auth_user_id THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   role: %', CASE WHEN v_has_role THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   assigned_store_id: %', CASE WHEN v_has_assigned_store_id THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   company_id: %', CASE WHEN v_has_company_id THEN '✅' ELSE '❌' END;
    RAISE NOTICE '   active: %', CASE WHEN v_has_active THEN '✅' ELSE '❌' END;
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════';
    
    -- Validación final
    IF v_has_auth_user_id AND v_has_role AND v_has_company_id AND v_has_active THEN
        RAISE NOTICE '✅ La tabla users tiene todas las columnas necesarias para RLS';
    ELSE
        RAISE WARNING '⚠️ Faltan columnas críticas para implementar RLS';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================





