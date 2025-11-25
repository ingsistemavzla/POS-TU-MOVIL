# Script de Restauración - Sistema POS BCV
# Este script te ayuda a restaurar el proyecto al punto de restauración

param(
    [switch]$Forzar,
    [switch]$Respaldo,
    [switch]$Ayuda
)

$TAG_RESTAURACION = "punto-restauracion-20251105-125732"

if ($Ayuda) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  SCRIPT DE RESTAURACIÓN - AYUDA" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso:" -ForegroundColor Yellow
    Write-Host "  .\restaurar.ps1              - Restauración con confirmación"
    Write-Host "  .\restaurar.ps1 -Forzar      - Restauración sin confirmar"
    Write-Host "  .\restaurar.ps1 -Respaldo    - Crea respaldo antes de restaurar"
    Write-Host "  .\restaurar.ps1 -Ayuda       - Muestra esta ayuda"
    Write-Host ""
    exit
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESTAURACIÓN AL PUNTO INICIAL" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que estamos en un repositorio Git
if (-not (Test-Path .git)) {
    Write-Host "❌ Error: No estás en un repositorio Git" -ForegroundColor Red
    exit 1
}

# Verificar que el tag existe
$tagExiste = git tag -l $TAG_RESTAURACION
if (-not $tagExiste) {
    Write-Host "❌ Error: El tag '$TAG_RESTAURACION' no existe" -ForegroundColor Red
    Write-Host "   Ejecuta: git fetch --tags" -ForegroundColor Yellow
    exit 1
}

# Mostrar estado actual
Write-Host "📊 Estado Actual:" -ForegroundColor Yellow
Write-Host ""
git status --short
Write-Host ""

# Verificar si hay cambios
$cambios = git status --porcelain
$tieneCambios = $cambios -ne $null

if ($tieneCambios -and -not $Respaldo -and -not $Forzar) {
    Write-Host "⚠️  Tienes cambios sin guardar!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Cyan
    Write-Host "  1. Crear respaldo y restaurar (recomendado)"
    Write-Host "  2. Descartar cambios y restaurar"
    Write-Host "  3. Cancelar"
    Write-Host ""
    $opcion = Read-Host "Selecciona una opción (1/2/3)"
    
    switch ($opcion) {
        "1" {
            $Respaldo = $true
        }
        "2" {
            $Forzar = $true
        }
        "3" {
            Write-Host "Operación cancelada" -ForegroundColor Yellow
            exit
        }
        default {
            Write-Host "Opción inválida. Cancelando..." -ForegroundColor Red
            exit
        }
    }
}

# Crear respaldo si se solicita
if ($Respaldo) {
    $fecha = Get-Date -Format "yyyyMMdd-HHmmss"
    $nombreRespaldo = "respaldo-antes-restaurar-$fecha"
    
    Write-Host "💾 Creando respaldo: $nombreRespaldo" -ForegroundColor Cyan
    
    # Guardar cambios actuales
    git add .
    git commit -m "WIP: Respaldo antes de restaurar - $fecha" 2>$null
    
    # Crear rama de respaldo
    git branch $nombreRespaldo
    
    Write-Host "✅ Respaldo creado en rama: $nombreRespaldo" -ForegroundColor Green
    Write-Host ""
}

# Confirmación final
if (-not $Forzar) {
    Write-Host "⚠️  ADVERTENCIA:" -ForegroundColor Red
    Write-Host "   Esto restaurará el proyecto al punto de restauración" -ForegroundColor Yellow
    Write-Host "   Tag: $TAG_RESTAURACION" -ForegroundColor Yellow
    Write-Host ""
    
    if ($Respaldo) {
        Write-Host "   ✅ Se creó un respaldo antes de restaurar" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "   ⚠️  Todos los cambios actuales se perderán" -ForegroundColor Red
        Write-Host ""
    }
    
    $confirmar = Read-Host "¿Continuar? (S/N)"
    if ($confirmar -ne "S" -and $confirmar -ne "s") {
        Write-Host "Operación cancelada" -ForegroundColor Yellow
        exit
    }
}

# Restaurar
Write-Host ""
Write-Host "🔄 Restaurando al punto de restauración..." -ForegroundColor Cyan
Write-Host ""

# Verificar rama actual
$ramaActual = git branch --show-current
Write-Host "Rama actual: $ramaActual" -ForegroundColor Gray

# Restaurar
git reset --hard $TAG_RESTAURACION

# Limpiar archivos no rastreados
Write-Host "🧹 Limpiando archivos no rastreados..." -ForegroundColor Cyan
git clean -fd

# Verificar resultado
Write-Host ""
Write-Host "✅ Restauración completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Estado Final:" -ForegroundColor Yellow
git status
Write-Host ""
Write-Host "📍 Commit actual:" -ForegroundColor Yellow
git log --oneline -1
Write-Host ""

if ($Respaldo) {
    Write-Host "💡 Tu respaldo está en la rama: $nombreRespaldo" -ForegroundColor Cyan
    Write-Host "   Para verlo: git checkout $nombreRespaldo" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "✨ Proyecto restaurado exitosamente!" -ForegroundColor Green








