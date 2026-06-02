# Backup completo del esquema public (datos del POS)
# Requiere: PostgreSQL 17 client (pg_dump) y contraseña de Database en Supabase Dashboard
#
# Uso:
#   $env:SUPABASE_DB_PASSWORD = "tu_database_password"
#   .\scripts\backup-db.ps1
#
# La contraseña está en: Dashboard → Project Settings → Database → Database password

$ErrorActionPreference = "Stop"

$ProjectRef = "swsqmsbyikznalrvydny"
$PgDump = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
$OutDir = Join-Path $PSScriptRoot "..\backups"
$Date = Get-Date -Format "yyyyMMdd_HHmm"
$OutFile = Join-Path $OutDir "backup_pre_sucursal_$Date.sql"

if (-not (Test-Path $PgDump)) {
    Write-Error "No se encontró pg_dump en $PgDump. Instala PostgreSQL 17 client tools."
}

if (-not $env:SUPABASE_DB_PASSWORD) {
    $secure = Read-Host "Database password (Supabase → Settings → Database)" -AsSecureString
    $env:SUPABASE_DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )
}

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

# Pooler session mode (IPv4). La URL directa db.*.supabase.co suele resolver solo IPv6 en Windows.
$pgHost = "aws-1-us-east-1.pooler.supabase.com"
$pgUser = "postgres.$ProjectRef"

Write-Host "Conectando a $pgHost ..."
Write-Host "Generando: $OutFile"

& $PgDump `
    -h $pgHost `
    -p 5432 `
    -U $pgUser `
    -d postgres `
    -n public `
    --no-owner `
    --no-acl `
    --format=plain `
    --file $OutFile

if ($LASTEXITCODE -ne 0) {
    Remove-Item $OutFile -ErrorAction SilentlyContinue
    Write-Error "pg_dump falló con código $LASTEXITCODE"
}

$info = Get-Item $OutFile
if ($info.Length -lt 1024) {
    Write-Error "El archivo es demasiado pequeño ($($info.Length) bytes). Revisa la contraseña o la conexión."
}

Write-Host ""
Write-Host "Backup OK"
Write-Host "  Archivo: $($info.FullName)"
Write-Host "  Tamaño:  $([math]::Round($info.Length / 1MB, 2)) MB"
Write-Host ""
Write-Host "Copia este archivo fuera del repo (OneDrive, disco externo, etc.)."
