# Funcionalidades de Krece en el Dashboard

## Resumen

Se han agregado nuevas funcionalidades al dashboard para mostrar información detallada sobre las ventas financiadas por Krece y las cuentas por cobrar.

## Componentes Agregados

### 1. Hook `useKreceStats`
**Archivo:** `src/hooks/useKreceStats.ts`

Este hook obtiene estadísticas completas de Krece desde la base de datos:

#### Estadísticas Generales:
- Total de ventas con Krece
- Monto total financiado (USD y BS)
- Promedio de monto por venta
- Porcentaje promedio de inicial

#### Cuentas por Cobrar:
- Total pendiente (USD y BS)
- Total pagado (USD y BS)
- Total vencido (USD y BS)
- Conteos por estado (pendiente, pagado, vencido)

#### Estadísticas por Período:
- Ventas con Krece este mes
- Ventas con Krece mes anterior
- Comparación de montos entre meses

### 2. Componente `KreceStats`
**Archivo:** `src/components/dashboard/KreceStats.tsx`

Muestra las estadísticas principales de Krece en tarjetas informativas:

#### Tarjetas Principales:
1. **Total Financiado**: Monto total financiado por Krece con comparación mensual
2. **Ventas con Krece**: Número total de ventas y promedio por venta
3. **Por Cobrar**: Monto pendiente por cobrar a Krece
4. **Vencidas**: Monto vencido que requiere atención

#### Tarjetas Secundarias:
1. **Pagadas**: Monto total pagado por Krece
2. **Financiamientos Activos**: Número de financiamientos en proceso
3. **Inicial Promedio**: Porcentaje promedio de inicial sobre el total

#### Resumen Mensual:
- Comparación entre este mes y el anterior
- Tendencias de crecimiento o decrecimiento

### 3. Componente `KreceAccountsTable`
**Archivo:** `src/components/dashboard/KreceAccountsTable.tsx`

Muestra una tabla detallada de las últimas 20 cuentas por cobrar:

#### Columnas de la Tabla:
- **Cliente**: Nombre y cédula del cliente
- **Monto USD**: Monto por cobrar en dólares
- **Monto BS**: Monto por cobrar en bolívares
- **Estado**: Badge con estado (Pendiente, Pagada, Vencida)
- **Fecha Creación**: Cuándo se creó la cuenta
- **Vencimiento**: Fecha de vencimiento del financiamiento
- **Inicial %**: Porcentaje de inicial y monto

#### Funcionalidades:
- Botón de actualización para refrescar datos
- Estados visuales con iconos y colores
- Manejo de errores y estados de carga

## Integración en el Dashboard

### Ubicación en el Dashboard:
Las nuevas funcionalidades se han integrado en el dashboard principal (`src/pages/Dashboard.tsx`):

1. **Estadísticas de Krece**: Sección completa con tarjetas informativas
2. **Tabla de Cuentas**: Tabla detallada de cuentas por cobrar

### Orden de Visualización:
1. Estadísticas generales del dashboard
2. Métodos de pago
3. **Estadísticas de Krece** (nuevo)
4. **Tabla de Cuentas por Cobrar Krece** (nuevo)
5. Stock crítico
6. Acciones rápidas

## Funciones de Base de Datos Utilizadas

### `get_krece_accounts_summary`
Función existente que proporciona resumen de cuentas por cobrar:
- Total pendiente, pagado y vencido
- Conteos por estado
- Montos en USD y BS

### Consultas Directas:
- Ventas con `krece_enabled = true`
- Financiamientos activos
- Cuentas por cobrar con relaciones a clientes

## Características Técnicas

### Estados de Carga:
- Skeleton loaders para mejor UX
- Indicadores de carga con spinners
- Manejo de errores con mensajes claros

### Formateo de Datos:
- Monedas formateadas en USD y BS
- Fechas en formato local (es-VE)
- Porcentajes con decimales apropiados

### Responsive Design:
- Grid adaptativo para diferentes tamaños de pantalla
- Tabla con scroll horizontal en móviles
- Tarjetas que se ajustan al contenido

## Beneficios para el Usuario

### Visibilidad Financiera:
- Control total sobre financiamientos de Krece
- Seguimiento de cuentas por cobrar
- Identificación rápida de cuentas vencidas

### Tendencias y Análisis:
- Comparación mensual de ventas con Krece
- Promedios y métricas de rendimiento
- Identificación de patrones de financiamiento

### Gestión Operativa:
- Lista detallada de cuentas pendientes
- Información completa de cada financiamiento
- Acceso rápido a datos de clientes

## Próximas Mejoras Sugeridas

1. **Filtros Avanzados**: Por fecha, estado, cliente
2. **Exportación de Datos**: PDF, Excel
3. **Notificaciones**: Alertas para cuentas vencidas
4. **Gráficos**: Visualización de tendencias
5. **Acciones Directas**: Marcar como pagada desde el dashboard

## Archivos Modificados

1. `src/hooks/useKreceStats.ts` - Nuevo hook
2. `src/components/dashboard/KreceStats.tsx` - Nuevo componente
3. `src/components/dashboard/KreceAccountsTable.tsx` - Nuevo componente
4. `src/pages/Dashboard.tsx` - Integración de componentes

## Notas de Implementación

- Los componentes utilizan las tablas existentes de Krece
- Se mantiene consistencia con el diseño del dashboard
- Se reutilizan componentes UI existentes
- Se implementa manejo de errores robusto
- Se optimiza el rendimiento con consultas eficientes



