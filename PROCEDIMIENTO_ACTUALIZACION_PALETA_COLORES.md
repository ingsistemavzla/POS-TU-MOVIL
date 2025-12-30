# Procedimiento de Actualización de Paleta de Colores

## Objetivo
Ajustar las paletas de colores de los dashboards internos de los paneles administrativos para que coincidan con la paleta utilizada en la página 404 (Sesión Expirada), manteniendo los verdes de resalte pero con las tonalidades correctas.

## Paleta de Colores Aplicada (Página 404)

### Fondos
- **Fondo principal**: Gradiente oscuro
  - `#0a0a0a` (negro)
  - `#1a1a2e` (azul oscuro)
  - `#16213e` (azul marino)

### Verdes Neón (Acentos)
- **Verde principal**: `#10b981` (Emerald 500)
- **Verde oscuro**: `#059669` (Emerald 600)
- **Verde claro**: `#34d399` (Emerald 400, hover)

### Glassmorphism
- **Fondo translúcido**: `rgba(17, 24, 39, 0.8)` (gris oscuro translúcido)
- **Bordes**: `rgba(16, 185, 129, 0.3)` (verde neón 30% opacidad)
- **Blur**: `blur(20px)`
- **Sombras**:
  - `rgba(0, 0, 0, 0.4)` (negro 40%)
  - `rgba(16, 185, 129, 0.1)` (verde neón 10%)

## Cambios Realizados en `src/index.css`

### 1. Gradiente de Fondo de la Aplicación
**Antes:**
```css
--gradient-app-bg: linear-gradient(135deg, #3d4a3d 0%, #495749 100%);
```

**Después:**
```css
--gradient-app-bg: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%);
```

### 2. Clase `.glass-panel`
**Antes:**
- Fondo: `rgba(9, 9, 9, 0.75)`
- Blur: `blur(12px)`
- Borde: `rgba(0, 255, 127, 0.2)`

**Después:**
- Fondo: `rgba(17, 24, 39, 0.8)`
- Blur: `blur(20px)`
- Borde: `rgba(16, 185, 129, 0.3)`
- Sombras mejoradas con efectos de neón

### 3. Clase `.glass-panel-dense`
**Antes:**
- Fondo: `rgba(6, 6, 6, 0.75)`
- Borde: `rgba(0, 255, 127, 0.2)`

**Después:**
- Fondo: `rgba(17, 24, 39, 0.75)`
- Borde: `rgba(16, 185, 129, 0.25)`
- Blur: `blur(20px)`
- Sombras con efectos de neón

### 4. Clase `.glass-card`
**Antes:**
- Fondo: `var(--glass-card)` (rgba(15, 15, 15, 0.6))
- Borde: `rgba(0, 255, 127, 0.2)`

**Después:**
- Fondo: `rgba(17, 24, 39, 0.8)`
- Borde: `rgba(16, 185, 129, 0.3)`
- Blur: `blur(20px)`
- Sombras mejoradas

### 5. Clase `.glass-muted-dark`
**Antes:**
- Fondo: `rgba(17, 34, 23, 0.64)`
- Borde: `rgba(0, 255, 127, 0.2)`

**Después:**
- Fondo: `rgba(17, 24, 39, 0.7)`
- Borde: `rgba(16, 185, 129, 0.25)`
- Blur: `blur(20px)`
- Sombras con efectos de neón

### 6. Clase `.glass-input`
**Antes:**
- Fondo: `rgba(15, 23, 42, 0.5)`
- Borde focus: `var(--color-neon-primary)`

**Después:**
- Fondo: `rgba(17, 24, 39, 0.6)`
- Borde focus: `rgba(16, 185, 129, 0.5)`
- Box-shadow en focus con efecto neón

### 7. Clase `.glass-green-dark`
**Antes:**
- Fondo: `rgba(9, 23, 14, 0.72)`
- Borde: `rgba(0, 255, 127, 0.3)`

**Después:**
- Fondo: `rgba(17, 24, 39, 0.75)`
- Borde: `rgba(16, 185, 129, 0.3)`
- Blur: `blur(20px)`
- Sombras con efectos de neón

### 8. Variables CSS
**Actualizado:**
```css
--glass-bg: rgba(17, 24, 39, 0.8);
--glass-border: rgba(16, 185, 129, 0.3);
--gradient-btn-primary: linear-gradient(135deg, #10b981 0%, #059669 100%);
```

## Verdes de Resalte Mantenidos

Los verdes de resalte se mantienen pero con las tonalidades correctas:
- **Verde principal**: `#10b981` (Emerald 500) - usado en iconos, textos destacados
- **Verde oscuro**: `#059669` (Emerald 600) - usado en gradientes
- **Verde claro**: `#34d399` (Emerald 400) - usado en estados hover

## Archivos Afectados

1. **src/index.css** - Variables CSS globales y clases de glassmorphism
2. Todos los componentes que usan las clases:
   - `.glass-panel`
   - `.glass-panel-dense`
   - `.glass-card`
   - `.glass-muted-dark`
   - `.glass-input`
   - `.glass-green-dark`

## Paneles Afectados

Los siguientes paneles administrativos ahora usan la nueva paleta:
- Dashboard principal
- Panel de Estadísticas
- Panel de Reportes
- Panel de Configuración
- Panel de Gestión de Tiendas
- Panel de Almacén
- Panel de Ventas
- Panel de Usuarios
- Panel de Clientes
- Y todos los dashboards internos

## Resultado

Todos los dashboards internos ahora tienen:
- ✅ Fondo oscuro con gradiente (#0a0a0a → #1a1a2e → #16213e)
- ✅ Paneles glassmorphism con fondo `rgba(17, 24, 39, 0.8)`
- ✅ Bordes verdes neón `rgba(16, 185, 129, 0.3)`
- ✅ Efectos de blur mejorados (20px)
- ✅ Sombras con efectos de neón
- ✅ Verdes de resalte con tonalidades correctas (#10b981, #059669, #34d399)

## Notas

- Los cambios son retrocompatibles: todos los componentes existentes seguirán funcionando
- La paleta es consistente en toda la aplicación
- Los efectos de neón mejoran la experiencia visual sin afectar la legibilidad
- El blur de 20px proporciona un efecto glassmorphism más pronunciado y moderno




