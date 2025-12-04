# 🔄 CÓMO HABILITAR REALTIME EN SUPABASE

## 📍 MÉTODO 1: Desde el Dashboard (Interfaz Web)

### Opción A: Pestaña "Replication"
1. Ve a **Supabase Dashboard**
2. En el menú lateral izquierdo, busca **"Database"**
3. Dentro de Database, busca **"Replication"** o **"Replicación"**
4. Si no lo ves, intenta:
   - **"Database" → "Replication"**
   - O **"Database" → "Settings" → "Replication"**

### Opción B: Desde la Tabla Directamente
1. Ve a **Supabase Dashboard → Database → Tables**
2. Busca la tabla `inventory_movements`
3. Haz clic en la tabla
4. Busca una pestaña o botón que diga **"Replication"** o **"Enable Realtime"**
5. Activa el toggle o botón

---

## 📍 MÉTODO 2: Usando SQL (MÁS DIRECTO)

Si no encuentras la opción en la interfaz, puedes habilitarlo directamente con SQL:

### Ejecuta este SQL en Supabase SQL Editor:

```sql
-- Habilitar Realtime para inventory_movements
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_movements;

-- Habilitar Realtime para inventory_transfers
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_transfers;

-- Habilitar Realtime para sales
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
```

### Si alguna tabla no existe, verifica primero:

```sql
-- Verificar qué tablas existen
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('inventory_movements', 'inventory_transfers', 'sales')
ORDER BY table_name;
```

### Si la tabla no existe, créala primero:

```sql
-- Crear tabla inventory_movements si no existe
CREATE TABLE IF NOT EXISTS public.inventory_movements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('IN', 'OUT', 'TRANSFER', 'ADJUST')),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    qty INTEGER NOT NULL,
    store_from_id UUID REFERENCES public.stores(id),
    store_to_id UUID REFERENCES public.stores(id),
    reason TEXT,
    user_id UUID NOT NULL REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company_id ON public.inventory_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product_id ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON public.inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store_from_id ON public.inventory_movements(store_from_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_store_to_id ON public.inventory_movements(store_to_id);

-- Habilitar RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_movements;
```

---

## 📍 MÉTODO 3: Verificar si Realtime ya está Habilitado

Ejecuta este SQL para ver qué tablas tienen Realtime habilitado:

```sql
-- Ver todas las tablas con Realtime habilitado
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

Si ves las tablas en la lista, **ya están habilitadas** ✅

---

## 📍 MÉTODO 4: Habilitar Realtime para TODAS las Tablas (No Recomendado)

Si quieres habilitar Realtime para todas las tablas (puede ser costoso):

```sql
-- ⚠️ CUIDADO: Esto habilita Realtime para TODAS las tablas
-- Puede afectar el rendimiento y costos
ALTER PUBLICATION supabase_realtime ADD TABLE ALL TABLES IN SCHEMA public;
```

**No recomendado** - Mejor habilitar solo las tablas necesarias.

---

## ✅ VERIFICACIÓN FINAL

Después de ejecutar el SQL, verifica que funcionó:

```sql
-- Verificar que las tablas tienen Realtime habilitado
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename IN ('inventory_movements', 'inventory_transfers', 'sales')
ORDER BY tablename;
```

Deberías ver las 3 tablas en la lista.

---

## 🆘 SI ALGO NO FUNCIONA

### Error: "table does not exist"
- La tabla no existe aún
- No es problema - el panel funcionará igual
- Las ventas seguirán funcionando normalmente

### Error: "publication does not exist"
- Realtime no está habilitado en tu proyecto
- Ve a Supabase Dashboard → Settings → API
- Verifica que Realtime esté habilitado en tu proyecto

### Error: "permission denied"
- Necesitas permisos de administrador
- O ejecuta como usuario con permisos suficientes

---

## 🎯 RECOMENDACIÓN

**Usa el MÉTODO 2 (SQL)** - Es el más directo y confiable:

1. Abre Supabase SQL Editor
2. Ejecuta el SQL del MÉTODO 2
3. Verifica con el SQL de verificación
4. ¡Listo!

---

**¿Necesitas ayuda con algún paso específico?**





