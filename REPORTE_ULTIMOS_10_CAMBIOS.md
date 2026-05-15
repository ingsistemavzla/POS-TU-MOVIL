# Reporte de cambios — últimos 10 commits

**Repositorio:** POS-TU-MOVIL (`todo-bcv-pos`)  
**Rama:** `main`  
**Período cubierto:** 12 abr 2026 → 15 may 2026  
**Generado:** 15 may 2026

---

## Resumen ejecutivo

| # | Commit | Fecha | Tipo | Impacto principal |
|---|--------|-------|------|-------------------|
| 1 | `14d2922` | 15-may-2026 | feat | Carga, paginación, caché y UX en dashboard, ventas, almacén, login |
| 2 | `3cb92e7` | 15-may-2026 | fix | Auth sin bloqueo infinito con mantenimiento apagado |
| 3 | `d876b8a` | 15-may-2026 | chore | Protocolo de mantenimiento desactivado |
| 4 | `17d0aa4` | 15-may-2026 | feat | Protocolo de mantenimiento frontend (incidente) |
| 5 | `9d40b8f` | 08-may-2026 | feat | Landing `/server` con informe de incidente |
| 6 | `3def164` | 07-may-2026 | fix | Variables VITE Supabase y logos locales |
| 7 | `8756124` | 21-abr-2026 | feat | PDF inventario por categoría (Almacén) |
| 8 | `9a7b233` | 12-abr-2026 | UI | Contraste reloj Venezuela en navbar |
| 9 | `2335991` | 12-abr-2026 | feat | Hora Venezuela en facturas, historial y RPC |
| 10 | `28c81cc` | 12-abr-2026 | UX | Filtros de sucursal en inventario y ventas |

**Totales aproximados (10 commits):** ~3.500+ líneas añadidas, ~900+ eliminadas en decenas de archivos.

---

## 1. `14d2922` — Mejoras de carga, paginación y UX (15 may 2026)

**Mensaje:** `feat: mejoras de carga, paginación y UX en paneles principales`

### Objetivo
Percepción de velocidad, una sola pantalla de carga en dashboard, paginación en listas grandes y corrección crítica en ventas.

### Cambios principales

#### Dashboard
- **`DashboardPageLoader`**: misma `LoadingScreen` oficial en Suspense y en la página.
- **`useDashboardData`**: caché `sessionStorage` (3 min), carga en segundo plano si hay datos, timeout 20 s, `financialHealth` corregido en datos vacíos.
- **`Dashboard.tsx`**: eliminados doble loader, `authLoading` en pantalla completa y skeletons por timeout de 5 s.
- **Prefetch** del chunk del dashboard en `MainLayout` para admin/manager.

#### Navegación y carga global
- **`RoutePageLoader`**: spinner liviano entre rutas (no pantalla completa).
- **`AuthBootLoader`**: `LoadingScreen` solo en arranque en frío sin sesión.
- **`routePrefetch.ts`**: precarga de módulos al hover en menú.

#### Inventario (Almacén / Artículos)
- **`useClientPagination`**: 20 ítems por página.
- **`ListPaginationBar`**: barra de paginación reutilizable.
- **`inventoryPageCache.ts`**: caché 5 min en `sessionStorage`.
- **`InventoryLoadingSkeletons`**: skeletons durante refetch.
- Refactor en `AlmacenPage.tsx` y `ArticulosPage.tsx`.

#### Ventas
- **`useSalesData.ts`**: `pageSize` 20, `Promise.all` metadatos + historial, fix **`.catch is not a function`** en RPC.
- **`SalesPage.tsx`**: carga solo bloquea si no hay datos previos.

#### Login / Auth visual
- **`LoginLordIcon.tsx`**: animación Lordicon en login.
- **`AuthPage.tsx`**: fondo oscuro, partículas, circuitos SVG, iconos flotantes restaurados.
- **`GlassLoginForm.tsx`**: Lordicon en lugar de logo estático.
- **`index.css`**: gradientes y watermark de logo.

#### Otros
- Ajustes menores en **`POS.tsx`**, **`LoadingScreen.tsx`** (`showConnecting` opcional).

### Archivos (22): +1.057 / −551 líneas

---

## 2. `3cb92e7` — Fix auth con mantenimiento apagado (15 may 2026)

**Mensaje:** `fix(auth): ejecutar initializeAuth con protocolo mantenimiento apagado`

### Problema
Con `MAINTENANCE_PROTOCOL_ENABLED = false`, `initializeAuth` salía temprano y dejaba **`loading` infinito** en la app.

### Solución
- **`AuthContext.tsx`**: `initializeAuth` se ejecuta siempre que el protocolo esté desactivado.

### Archivos (1): +1 / −2 líneas

---

## 3. `d876b8a` — Desactivar protocolo mantenimiento (15 may 2026)

**Mensaje:** `chore: desactivar protocolo mantenimiento frontend`

### Cambios
- **`maintenance.ts`**: `MAINTENANCE_PROTOCOL_ENABLED` y `MAINTENANCE_FORCED_FROM_BUILD` en `false`.
- **`App.tsx` / `main.tsx`**: rutas normales restauradas.
- **`ACTIVAR_MANTENIMIENTO.md`**: guía para reactivar.
- **`DESACTIVAR_MANTENIMIENTO.md`**: simplificado.
- **`AuthContext.tsx`**: ajustes al volver al modo operativo.

### Archivos (6): +90 / −81 líneas

---

## 4. `17d0aa4` — Protocolo mantenimiento activo (15 may 2026)

**Mensaje:** `feat: protocolo mantenimiento frontend activo en build`

### Objetivo
Bloquear uso del POS durante incidente de conectividad / Supabase (“Failed to fetch”).

### Cambios
- **`maintenance.ts`**: flags, detección de errores de red, ventana de gracia.
- **Componentes**: `MaintenanceBanner`, `MaintenanceEnforcer`, `MaintenanceLoginShell`.
- **`useMaintenanceMode`**: hook de estado de mantenimiento.
- **`AuthContext`**: cierre de sesión y restricción de flujo en modo mantenimiento.
- **`GlassLoginForm` / `GlassRegisterForm`**: UI adaptada.
- **`REPORTE_PROTOCOLO_MANTENIMIENTO.md`**: documentación del protocolo.
- **`DESACTIVAR_MANTENIMIENTO.md`**, **`.env.example`**.

### Archivos (16): +1.006 / −115 líneas

---

## 5. `9d40b8f` — Landing `/server` (08 may 2026)

**Mensaje:** `feat: landing /server con informe de incidente y planes`

### Cambios
- **`ServerStatusPage.tsx`**: página pública (~650 líneas) con informe de incidente, estado y planes.
- **`App.tsx`**: ruta `/server`.

### Archivos (2): +670 / −1 líneas

---

## 6. `3def164` — Fix VITE Supabase y logos (07 may 2026)

**Mensaje:** `fix(auth): variables VITE Supabase y logos locales (sin galenospro)`

### Cambios
- **`client.ts`**: lectura correcta de `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Logos locales en login (`GlassLoginForm`, `PhoneMockup3D`, `AuthPage`, `index.html`).
- Eliminación de dependencia de URLs externas (galenospro).

### Archivos (6): +14 / −10 líneas

---

## 7. `8756124` — PDF inventario por categoría (21 abr 2026)

**Mensaje:** `feat(almacen): PDF lista de inventario por categoría`

### Cambios
- **`inventoryListPdfGenerator.ts`**: generador PDF (nombre, stock total, precio USD).
- **`AlmacenPage.tsx`**: botón y modal para exportar lista por categoría.

### Archivos (2): +227 / −9 líneas

---

## 8. `9a7b233` — Contraste reloj navbar (12 abr 2026)

**Mensaje:** `UI: mejor contraste del reloj Venezuela en el navbar`

### Cambios
- **`VenezuelaNavClock.tsx`**: texto claro sobre chip esmeralda para mejor legibilidad.

### Archivos (1): +4 / −4 líneas

---

## 9. `2335991` — Hora Venezuela en facturas e historial (12 abr 2026)

**Mensaje:** `Hora Venezuela en facturas e historial; reloj navbar; migración RPC...`

### Cambios
- **`venezuelaTime.ts`** + tests Vitest: utilidades zona `America/Caracas`.
- **`VenezuelaNavClock.tsx`**: reloj en navbar (`MainLayout`).
- **`invoicePdfGenerator.ts`**, **`SalesPage.tsx`**: fechas en hora Venezuela.
- **Migración SQL** `get_sales_history_v2` con `created_at_fmt` en Caracas.
- **`sql/12_verificar_get_sales_history_venezuela_tz.sql`**: script de verificación post-deploy.

### Archivos (8): +331 / −25 líneas

---

## 10. `28c81cc` — UX filtros sucursal inventario/ventas (12 abr 2026)

**Mensaje:** `UX inventario y ventas: filtro sucursal solo en KPIs...`

### Cambios
- **`ArticulosPage.tsx`**: listado y stock por tienda sin recargar al cambiar filtro global; KPIs sí filtran por sucursal.
- **`AlmacenPage.tsx`**: `StoreFilterBar` para KPIs; tabla sin filtro por tienda en la grilla principal.
- **`SalesPage.tsx`**: `StoreFilterBar` debajo de “Gestión de Ventas” y encima del historial.

### Archivos (3): +32 / −105 líneas

---

## Mapa por área funcional

```
Auth / Sesión     ████████  commits 2, 3, 4, 6
Mantenimiento     ████████  commits 3, 4, 5
Dashboard         ████      commit 1
Ventas            ██████    commits 1, 9, 10
Inventario        ██████    commits 1, 7, 10
Login / UI        ████      commit 1
Hora Venezuela    ████      commits 8, 9
PDF / Reportes    ██        commit 7
```

---

## Deploy

- **Último push en producción:** `14d2922` → `origin/main` (15 may 2026).
- **Plataforma:** Render (auto-deploy en push a `main`).
- **Build:** `npm install && npm run build` → carpeta `dist`.

---

## Pendientes / advertencias conocidas (no bloqueantes del último commit)

| Tema | Detalle |
|------|---------|
| Tabla `bcv_rates` | No existe en schema remoto; error al guardar tasa BCV (consola). |
| RPC Krece | `get_krece_accounts_summary` 400; fallback a queries directas. |
| Columnas Krece | `initial_amount_usd`, `amount_usd` vs nombres reales en BD. |
| Warnings build | `className` duplicado en `POS.tsx` y `ArticulosPage.tsx`. |

---

## Cómo ver este historial en git

```bash
git log -10 --oneline
git show 14d2922 --stat
git diff 28c81cc..14d2922 --stat
```

---

*Documento generado a partir de `git log -10` y `--stat` del repositorio local.*
