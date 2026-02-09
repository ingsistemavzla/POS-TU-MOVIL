# Cierres diarios de inventario (snapshots)

## Objetivo

Capturar el estado total del stock **exactamente a las 00:00** cada día por tienda: cantidad de productos distintos, stock total y valor en USD (patrimonio). Los datos se guardan en `inventory_snapshots`.

## Tabla `inventory_snapshots`

| Columna          | Tipo        | Descripción |
|------------------|-------------|-------------|
| id               | UUID        | PK          |
| company_id       | UUID        | Empresa     |
| store_id         | UUID        | Tienda      |
| total_products   | INTEGER     | Productos distintos |
| total_stock      | INTEGER     | Suma de unidades    |
| total_value_usd  | NUMERIC     | Suma de (qty × cost_usd) |
| captured_at      | TIMESTAMPTZ | Fecha/hora del cierre (ej. 00:00) |

**Valor cuando no hay costo:** `total_value_usd` se calcula con `COALESCE(cost_usd, 0)`. Los productos sin costo cargado aportan **0** al valor total, para no generar NULL y mantener un número auditável. En la UI se puede aclarar: *"Valor estimado; productos sin costo no se incluyen en el valor."*

## Función de captura

- **Función:** `public.capture_inventory_snapshots(p_captured_at TIMESTAMPTZ)`
- **Comportamiento:** Recorre cada tienda activa, agrega inventario (con JOIN a `products` para el costo), calcula total_products, total_stock, total_value_usd e inserta una fila en `inventory_snapshots`.
- **Parámetro:** `p_captured_at` = momento del cierre. Para medianoche del día actual: `date_trunc('day', now())`. Por defecto la función usa `date_trunc('day', now())`.
- **Retorno:** Número de filas insertadas (una por tienda).

Ejecución manual en SQL:

```sql
SELECT capture_inventory_snapshots(date_trunc('day', now()));
```

---

## Cómo programar la ejecución a las 00:00 en Supabase

Tienes dos opciones: **pg_cron** (dentro de la base) o **Edge Function** + cron externo.

### Opción A: pg_cron (recomendado si está disponible)

**Requisito:** Supabase **Pro** tiene la extensión `pg_cron` habilitada en la base de datos.

1. En el **SQL Editor** de Supabase (o en una migración), habilita la extensión y programa el job:

```sql
-- Habilitar pg_cron (solo una vez; en Pro suele estar ya habilitado)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Programar ejecución todos los días a las 00:00 (hora del servidor/UTC)
SELECT cron.schedule(
  'inventory-daily-snapshot',   -- nombre del job
  '0 0 * * *',                 -- cron: minuto 0, hora 0 = medianoche cada día
  $$SELECT capture_inventory_snapshots(date_trunc('day', now()))$$
);
```

2. **Zona horaria:** Por defecto el servidor suele estar en UTC. Si quieres 00:00 en Venezuela (UTC-4):

```sql
SELECT cron.schedule(
  'inventory-daily-snapshot',
  '0 4 * * *',   -- 04:00 UTC = 00:00 Venezuela (UTC-4)
  $$SELECT capture_inventory_snapshots((date_trunc('day', now()) AT TIME ZONE 'America/Caracas')::timestamptz)$$
);
```

O más simple: ejecutar a las 04:00 UTC y guardar `captured_at` como ese instante; en la UI mostrar en zona local.

3. Ver jobs programados:

```sql
SELECT * FROM cron.job;
```

4. Eliminar el job si hace falta:

```sql
SELECT cron.unschedule('inventory-daily-snapshot');
```

**Nota:** En plan **Free**, `pg_cron` puede no estar disponible. En ese caso usa la Opción B.

---

### Opción B: Edge Function + GitHub Actions (plan Free)

En el repo ya están creados la Edge Function y el workflow. Solo hay que desplegar y configurar secretos.

#### 1. Desplegar la Edge Function

Desde la raíz del proyecto (con [Supabase CLI](https://supabase.com/docs/guides/cli) instalado y vinculado a tu proyecto):

```bash
supabase functions deploy capture-inventory-snapshot
```

La función usa por defecto los secretos que Supabase inyecta (`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`). Si despliegas desde el dashboard, esos valores se configuran solos. Si usas CLI, asegúrate de estar enlazado al proyecto correcto (`supabase link`).

#### 2. Probar la Edge Function a mano

Con curl (sustituye la URL y la key):

```bash
curl -X POST "https://TU_PROJECT_REF.supabase.co/functions/v1/capture-inventory-snapshot" \
  -H "Authorization: Bearer TU_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Respuesta esperada tipo: `{"success":true,"inserted":4,"captured_at":"..."}`.

#### 3. Configurar secretos en GitHub

En el repositorio: **Settings → Secrets and variables → Actions → New repository secret**.

Crear dos secretos:

| Nombre                     | Valor                                                                 |
|----------------------------|-----------------------------------------------------------------------|
| `SUPABASE_URL`             | `https://TU_PROJECT_REF.supabase.co` (sin barra final)                 |
| `SUPABASE_SERVICE_ROLE_KEY`| La **service_role** key del proyecto (Dashboard → Settings → API)     |

**Importante:** La key es **service_role**, no la anon key. No la expongas en el front ni en logs.

#### 4. Activar el workflow

El archivo `.github/workflows/daily-inventory-snapshot.yml` ya está en el repo. Al hacer push a la rama por defecto, GitHub Actions lo verá. El cron está en `0 4 * * *` (04:00 UTC = **00:00 Venezuela**).

- **Ejecución manual:** En GitHub → pestaña **Actions** → "Daily inventory snapshot" → **Run workflow**.
- **Ejecución automática:** Todos los días a las 04:00 UTC.

Si quieres otra hora, edita la línea `cron: '0 4 * * *'` (formato: minuto hora día mes día-semana).

---

## Resumen

| Método        | Ventaja                          | Requisito              |
|---------------|-----------------------------------|------------------------|
| **pg_cron**   | Todo en la base, sin servicios externos | Plan Pro, extensión pg_cron |
| **Edge + cron** | Funciona en plan Free, control total del horario | Crear Edge Function y cron externo |

**Recomendación:** Si tienes Pro, usar **pg_cron** con `0 0 * * *` (o la hora UTC equivalente a 00:00 local). Si estás en Free, usar **Edge Function** + cron externo (p. ej. GitHub Actions) para llamar a `capture_inventory_snapshots` cada noche.
