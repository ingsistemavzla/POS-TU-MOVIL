# Cierre diario de inventario – Lo que TÚ debes hacer

Plan **gratuito** Supabase. En el repo ya está todo el código; solo falta desplegar y configurar.

---

## ✅ Ya está en el repo (no tienes que tocar nada)

- Tabla y función SQL (migración `20250209170000_inventory_snapshots_and_capture.sql`) – ya la aplicaste.
- Edge Function `supabase/functions/capture-inventory-snapshot/index.ts`.
- Workflow GitHub Actions `.github/workflows/daily-inventory-snapshot.yml`.
- Documentación en `docs/CIERRES_DIARIOS_INVENTARIO_SNAPSHOTS.md`.

---

## 1. En Supabase (Dashboard)

### 1.1 Migración

Si ya ejecutaste la migración y el `SELECT capture_inventory_snapshots(...)` devolvió 4, **no hagas nada más** aquí.

Si no: en **SQL Editor** pega y ejecuta todo el contenido del archivo  
`supabase/migrations/20250209170000_inventory_snapshots_and_capture.sql`.

### 1.2 Desplegar la Edge Function

**Opción A – Con Supabase CLI (en tu PC):**

```bash
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy capture-inventory-snapshot
```

(Sustituye `TU_PROJECT_REF` por el ID de tu proyecto en la URL del dashboard, ej. `https://abcdefgh.supabase.co` → `abcdefgh`.)

**Opción B – Desde el Dashboard:**

1. **Edge Functions** → **Create a new function**.
2. Nombre: `capture-inventory-snapshot`.
3. Copia el contenido de `supabase/functions/capture-inventory-snapshot/index.ts` en el editor.
4. Deploy. En plan Free, `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` suelen inyectarse solos.

---

## 2. En GitHub

### 2.1 Secretos del repositorio

1. Repo → **Settings** → **Secrets and variables** → **Actions**.
2. **New repository secret** (crea dos):

| Nombre                      | Dónde lo sacas |
|-----------------------------|----------------|
| `SUPABASE_URL`              | Dashboard Supabase → **Settings** → **API** → Project URL (ej. `https://abcdefgh.supabase.co`, sin barra final). |
| `SUPABASE_SERVICE_ROLE_KEY` | Dashboard Supabase → **Settings** → **API** → **service_role** (secret). No uses la anon key. |

### 2.2 Subir el workflow (si aún no está en GitHub)

En tu PC, desde la raíz del repo:

```bash
git add .github/workflows/daily-inventory-snapshot.yml
git add supabase/functions/capture-inventory-snapshot/
git add docs/
git status
git commit -m "Cierre diario: Edge Function + GitHub Actions cron"
git push origin main
```

(Si tu rama se llama `master`, usa `git push origin master`.)

---

## 3. Probar

### 3.1 Edge Function con curl

Sustituye `TU_PROJECT_REF` y `TU_SERVICE_ROLE_KEY`:

```bash
curl -X POST "https://TU_PROJECT_REF.supabase.co/functions/v1/capture-inventory-snapshot" \
  -H "Authorization: Bearer TU_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Respuesta esperada: `{"success":true,"inserted":4,"captured_at":"..."}`.

### 3.2 GitHub Actions

- **Actions** → **Daily inventory snapshot** → **Run workflow** → **Run workflow**.
- Cuando termine, revisa que el job sea verde. Luego en la app, **Historial** → “Resumen de Cierres”, deberías ver las filas nuevas.

---

## Resumen rápido

| Dónde     | Qué hacer |
|----------|------------|
| **Supabase** | 1) Migración ya aplicada. 2) Desplegar Edge Function (CLI o Dashboard). |
| **GitHub**   | 1) Crear secretos `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. 2) Push del workflow y de la función si no están. |

El cron se ejecutará solo cada día a las **04:00 UTC** (00:00 Venezuela) una vez el workflow esté en el repo y los secretos configurados.
