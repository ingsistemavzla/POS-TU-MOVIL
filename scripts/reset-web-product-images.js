/**
 * Script para vaciar el bucket product-images de Supabase Storage
 *
 * REQUISITOS:
 * - Node.js 18+
 * - SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
 *
 * USO:
 *   SUPABASE_SERVICE_ROLE_KEY=tu_key node scripts/reset-web-product-images.js
 *
 * IMPORTANTE: Usa service_role para poder borrar objetos sin RLS de storage.
 * La limpieza de metadatos (web_product_metadata) se hace con el SQL aparte.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://swsqmsbyikznalrvydny.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = 'product-images';
const BATCH_SIZE = 1000; // Supabase remove() máximo por llamada

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ ERROR: SUPABASE_SERVICE_ROLE_KEY es requerido.');
  console.error('   Dashboard Supabase → Settings → API → service_role key');
  console.error('\n   Ejecución: SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/reset-web-product-images.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function listAllPaths(path = '') {
  const paths = [];
  const { data: items, error } = await supabase.storage.from(BUCKET).list(path, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' },
  });

  if (error) {
    throw new Error(`Error listando ${path}: ${error.message}`);
  }

  for (const item of items || []) {
    const fullPath = path ? `${path}/${item.name}` : item.name;
    const isFile = item.id && typeof item.id === 'string';
    if (isFile) {
      paths.push(fullPath);
    } else if (item.name !== '.emptyFolderPlaceholder') {
      const subPaths = await listAllPaths(fullPath);
      paths.push(...subPaths);
    }
  }
  return paths;
}

async function main() {
  console.log('\n🧹 Reset: Vaciar bucket product-images');
  console.log('='.repeat(50));
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Bucket: ${BUCKET}\n`);

  try {
    const allPaths = await listAllPaths();
    const total = allPaths.length;

    if (total === 0) {
      console.log('✅ El bucket ya está vacío. No hay archivos que borrar.');
      return;
    }

    console.log(`📁 Encontrados ${total} archivo(s). Borrando en lotes de ${BATCH_SIZE}...`);

    let deleted = 0;
    for (let i = 0; i < allPaths.length; i += BATCH_SIZE) {
      const batch = allPaths.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.storage.from(BUCKET).remove(batch);
      if (error) {
        console.error(`❌ Error borrando lote ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      } else {
        deleted += batch.length;
        console.log(`   Borrados ${deleted}/${total}`);
      }
    }

    console.log(`\n✅ ${deleted} archivo(s) eliminado(s) del bucket product-images.`);
    console.log('\n⚠️  Siguiente paso: Ejecuta sql/RESET_WEB_IMAGES_metadata.sql en Supabase SQL Editor');
    console.log('   para limpiar image_url y visible en web_product_metadata.\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
