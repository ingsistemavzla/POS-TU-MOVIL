/**
 * Script para aplicar la migración de transfer_inventory sin acceso directo a Supabase Dashboard
 * 
 * REQUISITOS:
 * 1. Tener Node.js instalado (versión 18+)
 * 2. Tener las credenciales de Supabase (service_role key o access token)
 * 3. Ejecutar: node scripts/apply-transfer-inventory-migration.js
 * 
 * OPCIONES DE EJECUCIÓN:
 * - Con SUPABASE_SERVICE_ROLE_KEY (recomendado para producción)
 * - Con SUPABASE_ACCESS_TOKEN (alternativa)
 * - Usar Supabase CLI: npm run supabase:push (opción más sencilla)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Leer la migración SQL
const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250103000002_create_transfer_inventory_function.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📋 Script de Aplicación de Migración: transfer_inventory');
console.log('=' .repeat(60));

// Configuración de Supabase (puede venir de variables de entorno)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wnobdlxtsjnlcoqsskfe.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_ACCESS_TOKEN) {
  console.error('\n❌ ERROR: Se requiere una de estas credenciales:');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY (recomendado)');
  console.error('   - SUPABASE_ACCESS_TOKEN (alternativa)');
  console.error('\n📝 Cómo obtenerlas:');
  console.error('   1. Ve a tu proyecto en Supabase Dashboard');
  console.error('   2. Settings → API');
  console.error('   3. Copia el "service_role" key (mantén secreto) o el access token');
  console.error('\n💡 Ejemplo de ejecución:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=tu_key_aqui node scripts/apply-transfer-inventory-migration.js');
  console.error('\n   O en Windows PowerShell:');
  console.error('   $env:SUPABASE_SERVICE_ROLE_KEY="tu_key_aqui"; node scripts/apply-transfer-inventory-migration.js');
  process.exit(1);
}

console.log('\n✅ Credenciales encontradas');
console.log(`📍 URL: ${SUPABASE_URL}`);

// Usar @supabase/supabase-js si está disponible, o fetch directamente
async function applyMigration() {
  try {
    // Intentar usar @supabase/supabase-js si está disponible
    let supabase;
    try {
      const { createClient } = await import('@supabase/supabase-js');
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ACCESS_TOKEN, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });
    } catch (e) {
      console.log('\n⚠️  @supabase/supabase-js no disponible, usando fetch directo...');
      console.log('   Error:', e.message);
      supabase = null;
    }

    if (supabase) {
      console.log('\n🔄 Aplicando migración usando Supabase Client...');
      
      // Dividir la migración en statements individuales (simplificado)
      // Para funciones complejas, es mejor ejecutarlas como un bloque
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      // Ejecutar como un bloque completo (más seguro para funciones)
      const { data, error } = await supabase.rpc('exec_sql', {
        sql: migrationSQL
      }).catch(async () => {
        // Si no existe exec_sql, usar el endpoint REST directamente
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ACCESS_TOKEN,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ACCESS_TOKEN}`
          },
          body: JSON.stringify({ sql: migrationSQL })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }
        return { data: await response.json(), error: null };
      });

      if (error) throw error;

      console.log('\n✅ Migración aplicada exitosamente');
      
      // Verificar que la función existe
      const { data: checkData, error: checkError } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', 'transfer_inventory')
        .single();

      if (!checkError && checkData) {
        console.log('✅ Función transfer_inventory verificada');
      } else {
        console.log('⚠️  No se pudo verificar la función (esto puede ser normal)');
      }

    } else {
      // Usar fetch directo con pg_rest o endpoint SQL
      console.log('\n🔄 Aplicando migración usando fetch directo...');
      console.log('⚠️  Nota: Este método requiere que Supabase tenga habilitado el endpoint SQL REST');
      
      // Esta es una aproximación - en realidad necesitarías un endpoint personalizado
      // o usar la API REST de Supabase de manera diferente
      console.log('\n❌ Método fetch directo no implementado completamente');
      console.log('\n💡 OPCIONES ALTERNATIVAS:');
      console.log('   1. Instalar @supabase/supabase-js: npm install @supabase/supabase-js');
      console.log('   2. Usar Supabase CLI: npx supabase db push');
      console.log('   3. Aplicar manualmente en SQL Editor de Supabase Dashboard');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ ERROR al aplicar la migración:');
    console.error(error.message);
    
    if (error.message.includes('exec_sql')) {
      console.error('\n💡 La función exec_sql no existe. Opciones:');
      console.error('   1. Aplicar la migración manualmente en SQL Editor de Supabase');
      console.error('   2. Usar Supabase CLI: npx supabase db push');
      console.error('   3. Crear un endpoint Edge Function en Supabase para ejecutar SQL');
    }
    
    process.exit(1);
  }
}

// Mostrar la migración antes de ejecutarla
console.log('\n📄 Contenido de la migración:');
console.log('-'.repeat(60));
console.log(migrationSQL.substring(0, 500) + '...');
console.log('-'.repeat(60));

// Confirmar antes de ejecutar
console.log('\n⚠️  ADVERTENCIA: Este script modificará la base de datos.');
console.log('   Asegúrate de tener un backup antes de continuar.');
console.log('\n¿Deseas continuar? (Ctrl+C para cancelar)');

// Ejecutar después de 3 segundos (dar tiempo para cancelar)
setTimeout(() => {
  applyMigration().then(() => {
    console.log('\n✅ Proceso completado');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Proceso falló:', error);
    process.exit(1);
  });
}, 3000);

