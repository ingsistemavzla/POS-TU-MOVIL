# Auditoría de Componentes - Capa de Precios Dinámicos

## 1. Componentes reutilizados para tasas/impuestos

| Componente | Uso en GestionWebPage | Clonado para Config Global |
|------------|------------------------|----------------------------|
| **Card** | Filtros, tabla, modal edición | ✅ Misma estructura |
| **CardHeader / CardTitle** | — | ✅ Nuevo para "Configuración Global" |
| **Input** | Búsqueda, filtros, precio, URL imagen | ✅ Misma clase `glass-input` |
| **Label** | Precio, visibilidad, URL | ✅ Misma clase `text-white/90 text-sm` |
| **Button** | Actualizar, Guardar (modal), Generar PDF | ✅ `variant="outline" size="sm"` |
| **Switch** | Visibilidad web | ❌ No usado (son inputs numéricos) |

## 2. Gestión de estado de ajustes web

| Aspecto | Antes | Después |
|---------|-------|---------|
| **Fuente** | `useSystemSettings` (tax_rate, currency, etc.) | Extendido con web_adjustment_rate, web_tax_percentage, manual_bcv_rate |
| **Objeto** | `SystemSettings` interface | Mismo objeto extendido (campos opcionales) |
| **Persistencia** | `updateSettings()` upsert a system_settings | Misma función, incluye nuevos campos |
| **Estado local** | — | `webAdjustmentRate`, `webTaxPercentage`, `manualBcvRate` (strings para Input) |
| **Sincronización** | — | `useEffect` carga desde settings al cambiar |

**Conclusión:** Se extendió `useSystemSettings` sin crear nueva lógica. Los inputs usan estado local y se persisten con `updateSettings` existente.
