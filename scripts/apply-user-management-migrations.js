/**
 * Script para aplicar migraciones de gestión de usuarios en Supabase
 * Este script intenta aplicar las funciones SQL mediante la API de Supabase
 * 
 * NOTA: Requiere las credenciales de Supabase en variables de entorno
 * SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 */

const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function applyMigration(sqlFilePath) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    log('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY deben estar definidos en las variables de entorno', 'red');
    log('\nEjemplo:', 'yellow');
    log('export SUPABASE_URL="https://tu-proyecto.supabase.co"', 'yellow');
    log('export SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"', 'yellow');
    log('\nO en Windows:', 'yellow');
    log('set SUPABASE_URL=https://tu-proyecto.supabase.co', 'yellow');
    log('set SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key', 'yellow');
    return false;
  }

  try {
    log(`\n📄 Leyendo migración: ${sqlFilePath}`, 'blue');
    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    if (!sql || sql.trim().length === 0) {
      log(`❌ El archivo ${sqlFilePath} está vacío`, 'red');
      return false;
    }

    log('📤 Enviando SQL a Supabase...', 'blue');

    // Usar la API REST de Supabase para ejecutar SQL
    // Nota: Esta API puede no estar disponible en todos los proyectos
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        query: sql
      })
    });

    if (!response.ok) {
      // Si la API RPC no está disponible, intentar método alternativo
      log('⚠️  La API RPC exec_sql no está disponible. Usando método alternativo...', 'yellow');
      return await applyViaDirectSQL(supabaseUrl, supabaseServiceKey, sql);
    }

    const result = await response.json();
    log('✅ Migración aplicada exitosamente', 'green');
    return true;

  } catch (error) {
    log(`❌ Error aplicando migración: ${error.message}`, 'red');
    log('\n💡 Alternativa: Aplica las migraciones manualmente usando:', 'yellow');
    log('1. Supabase Dashboard > SQL Editor', 'yellow');
    log('2. Copia el contenido del archivo SQL', 'yellow');
    log('3. Ejecuta el script en el SQL Editor', 'yellow');
    return false;
  }
}

async function applyViaDirectSQL(supabaseUrl, serviceKey, sql) {
  // Método alternativo: usar pg REST API si está disponible
  // Esto requiere configuración adicional en Supabase
  log('⚠️  Método alternativo no implementado completamente', 'yellow');
  log('Por favor, usa Supabase Dashboard > SQL Editor para aplicar las migraciones', 'yellow');
  return false;
}

async function main() {
  log('🚀 Aplicador de Migraciones de Gestión de Usuarios', 'blue');
  log('='.repeat(50), 'blue');

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  const migrations = [
    '20250107000001_update_user_and_reset_password.sql',
    '20250107000002_fix_delete_user_with_sales.sql'
  ];

  let allSuccess = true;

  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration);
    
    if (!fs.existsSync(filePath)) {
      log(`❌ Archivo no encontrado: ${filePath}`, 'red');
      allSuccess = false;
      continue;
    }

    const success = await applyMigration(filePath);
    if (!success) {
      allSuccess = false;
    }
  }

  if (!allSuccess) {
    log('\n⚠️  Algunas migraciones no se pudieron aplicar automáticamente', 'yellow');
    log('Por favor, revisa el documento docs/APLICAR_MIGRACIONES_USUARIOS.md', 'yellow');
    log('para instrucciones sobre cómo aplicarlas manualmente', 'yellow');
    process.exit(1);
  }

  log('\n✅ Todas las migraciones aplicadas exitosamente', 'green');
}

if (require.main === module) {
  main().catch(error => {
    log(`❌ Error fatal: ${error.message}`, 'red');
    process.exit(1);
  });
}

module.exports = { applyMigration };

