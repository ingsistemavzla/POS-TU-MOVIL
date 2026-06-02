/**
 * Crear sucursal vía código (RPC create_store_system) — NO usa el frontend.
 *
 * REQUISITOS:
 * 1. Migración aplicada: supabase/migrations/20260522100000_create_store_v1_system.sql
 * 2. Trigger on_store_created activo en producción
 * 3. SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en entorno
 *
 * PowerShell:
 *   $env:SUPABASE_URL="https://TU_PROYECTO.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key"
 *   $env:STORE_COMPANY_ID="uuid-de-tu-empresa"
 *   $env:STORE_NAME="Sucursal Zona Gamer"
 *   node scripts/create-store.js
 *
 * Opcionales: STORE_ADDRESS, STORE_PHONE, STORE_BUSINESS_NAME, STORE_TAX_ID,
 *             STORE_FISCAL_ADDRESS, STORE_PHONE_FISCAL, STORE_EMAIL_FISCAL
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const COMPANY_ID = process.env.STORE_COMPANY_ID;
const STORE_NAME = process.env.STORE_NAME;

function required(name, value) {
  if (!value || !String(value).trim()) {
    console.error(`\n❌ Falta variable de entorno: ${name}`);
    process.exit(1);
  }
  return String(value).trim();
}

required('SUPABASE_URL', SUPABASE_URL);
required('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_KEY);
required('STORE_COMPANY_ID', COMPANY_ID);
required('STORE_NAME', STORE_NAME);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const payload = {
  p_company_id: COMPANY_ID,
  p_name: STORE_NAME,
  p_address: process.env.STORE_ADDRESS ?? null,
  p_phone: process.env.STORE_PHONE ?? null,
  p_business_name: process.env.STORE_BUSINESS_NAME ?? null,
  p_tax_id: process.env.STORE_TAX_ID ?? null,
  p_fiscal_address: process.env.STORE_FISCAL_ADDRESS ?? null,
  p_phone_fiscal: process.env.STORE_PHONE_FISCAL ?? null,
  p_email_fiscal: process.env.STORE_EMAIL_FISCAL ?? null,
  p_active: process.env.STORE_ACTIVE !== 'false',
};

console.log('🏪 Creando sucursal vía create_store_system...');
console.log('   Empresa:', COMPANY_ID);
console.log('   Nombre:', STORE_NAME);

const { data, error } = await supabase.rpc('create_store_system', payload);

if (error) {
  console.error('\n❌ Error RPC:', error.message);
  console.error(error);
  process.exit(1);
}

if (!data?.success) {
  console.error('\n❌ Respuesta sin éxito:', JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log('\n✅ Sucursal creada');
console.log('   ID:', data.store?.id);
console.log('   Nombre:', data.store?.name);
console.log('   Validación:', data.validation?.status, '-', data.validation?.message);
console.log(
  '   Inventarios:',
  data.validation?.inventory_rows,
  '/',
  data.validation?.active_products,
  'productos activos'
);
console.log('\n📋 JSON completo:');
console.log(JSON.stringify(data, null, 2));
