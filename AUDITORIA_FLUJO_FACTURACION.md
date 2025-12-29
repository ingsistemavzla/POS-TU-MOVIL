# 🔍 AUDITORÍA FORENSE: Flujo de Facturación Actual

## 📋 RESUMEN EJECUTIVO

**Objetivo:** Identificar dónde se genera el número de factura en el código actual y detectar lógica legacy que debe eliminarse antes de implementar generación atómica basada en secuencias de base de datos.

---

## 1️⃣ RECONOCIMIENTO: Dónde Vive el Proceso de Venta

### **Archivo Principal: `src/pages/POS.tsx`**

**Líneas Clave:**
- **Línea 1822:** Llamada al RPC `process_sale` (punto de entrada al backend)
- **Líneas 1200-1234:** Función `reserveInvoiceNumber()` - **⚠️ LÓGICA LEGACY DETECTADA**
- **Líneas 1701-1715:** Reserva de número de factura ANTES de procesar la venta
- **Líneas 1974-2037:** Asignación POST-PROCESAMIENTO del número de factura reservado

**Flujo Actual:**
```
1. Usuario hace clic en "Procesar Venta"
2. Se llama a `reserveInvoiceNumber()` (Frontend)
3. Se genera un número de factura en el cliente
4. Se verifica que no exista (`invoiceExists()`)
5. Se llama a `supabase.rpc('process_sale', saleParams)` (Backend)
6. DESPUÉS de procesar, se actualiza la venta con el número reservado
```

---

## 2️⃣ 👻 DETECCIÓN DE RASTROS LEGACY

### **🔴 CRÍTICO: Lógica de Generación de Factura en Frontend**

#### **A. Función `reserveInvoiceNumber()` (Líneas 1200-1234)**

**Ubicación:** `src/pages/POS.tsx:1200-1234`

**Problema:**
```typescript
const reserveInvoiceNumber = useCallback(async (): Promise<ReservedInvoice> => {
  const now = new Date();
  
  // Sincronizar con el último número global (sin filtrar por día ni tienda)
  await syncInvoiceSequence();  // ⚠️ Busca el MAX en la base de datos
  
  const previousState: InvoiceTrackerState = { ...invoiceTrackerRef.current };
  let candidateSeq = previousState.lastSeq + 1;  // ⚠️ Incrementa en el cliente
  let candidateInvoice = formatInvoiceNumber(candidateSeq, now);
  
  // Verificar que no exista (búsqueda global)
  while (await invoiceExists(candidateInvoice)) {  // ⚠️ Verifica existencia en el cliente
    attempts += 1;
    candidateSeq += 1;
    candidateInvoice = formatInvoiceNumber(candidateSeq, now);
    // ...
  }
  
  // Actualizar estado (sin dateKey - es global y continuo)
  invoiceTrackerRef.current = { lastSeq: candidateSeq, ... };  // ⚠️ Estado local
  
  return { invoiceNumber: candidateInvoice, sequence: candidateSeq, ... };
}, [invoiceExists, syncInvoiceSequence]);
```

**Problemas Identificados:**
1. ❌ **Genera el número en el Frontend** (no atómico)
2. ❌ **Usa estado local** (`invoiceTrackerRef.current`) que puede desincronizarse
3. ❌ **Verifica existencia con `invoiceExists()`** (race condition posible)
4. ❌ **Incrementa secuencia en el cliente** (no garantiza unicidad)

---

#### **B. Función `syncInvoiceSequence()` (Líneas ~1100-1150)**

**Ubicación:** `src/pages/POS.tsx` (aproximadamente línea 1100)

**Problema:**
```typescript
// Busca el MAX invoice_number en la base de datos
const { data } = await supabase
  .from('sales')
  .select('invoice_number')
  .order('created_at', { ascending: false })
  .limit(1);

// Parsea la secuencia del último número
const seq = parseInvoiceSequence((data[0] as any).invoice_number);
```

**Problemas Identificados:**
1. ❌ **Busca MAX en el cliente** (no atómico)
2. ❌ **Race condition:** Entre la búsqueda y la reserva, otro usuario puede crear una factura
3. ❌ **No garantiza monotonicidad** (puede haber duplicados si dos usuarios reservan simultáneamente)

---

#### **C. Función `invoiceExists()` (Líneas ~1152-1160)**

**Ubicación:** `src/pages/POS.tsx` (aproximadamente línea 1152)

**Problema:**
```typescript
const invoiceExists = async (invoiceNumber: string) => {
  const { data } = await supabase
    .from('sales')
    .filter('invoice_number', 'eq', invoiceNumber)
    .maybeSingle();
  return !!data;
};
```

**Problemas Identificados:**
1. ❌ **Verificación no atómica** (otro usuario puede crear la factura entre la verificación y la reserva)
2. ❌ **Race condition crítica** en alta concurrencia

---

#### **D. Asignación POST-PROCESAMIENTO (Líneas 1974-2037)**

**Ubicación:** `src/pages/POS.tsx:1974-2037`

**Problema:**
```typescript
// DESPUÉS de procesar la venta, se actualiza con el número reservado
const payload: Database['public']['Tables']['sales']['Update'] = {
  invoice_number: reservation.invoiceNumber,
};
const { error: updateError } = await supabase
  .from('sales')
  .update(payload as any)
  .eq('id', saleId);
```

**Problemas Identificados:**
1. ❌ **Doble transacción:** Primero crea la venta, luego actualiza el número
2. ❌ **No atómico:** Si falla la actualización, la venta queda sin número
3. ❌ **Complejidad innecesaria:** El backend ya genera el número, pero se ignora

---

### **🟡 UTILIDADES RELACIONADAS (No críticas, pero deben revisarse)**

#### **E. `src/utils/invoiceGenerator.ts`**

**Funciones:**
- `formatInvoiceNumber(sequence, date)` - Formatea el número (OK, puede mantenerse)
- `getDayKey(date)` - Genera clave de día (OK, puede mantenerse)

**Veredicto:** ✅ **SEGURO** - Son funciones de formato, no generan la secuencia.

---

## 3️⃣ 🗺️ PLAN DE ADAPTACIÓN

### **ESTRATEGIA: Reemplazar Lógica Legacy por RPC Atómica**

#### **PASO 1: Eliminar Lógica Legacy del Frontend**

**Archivos a Modificar:**
- `src/pages/POS.tsx`

**Código a ELIMINAR:**
1. **Función `reserveInvoiceNumber()`** (Líneas 1200-1234)
2. **Función `syncInvoiceSequence()`** (Líneas ~1100-1150)
3. **Función `invoiceExists()`** (Líneas ~1152-1160)
4. **Estado `invoiceTrackerRef`** y toda su lógica relacionada
5. **Lógica de asignación POST-PROCESAMIENTO** (Líneas 1974-2037)

**Código a MANTENER:**
- ✅ Función `formatInvoiceNumber()` de `invoiceGenerator.ts` (solo formato)
- ✅ Preparación de `saleParams` (Líneas 1797-1817)
- ✅ Llamada al RPC `process_sale` (Línea 1822)

---

#### **PASO 2: Modificar la Llamada al RPC**

**Ubicación:** `src/pages/POS.tsx:1822`

**ANTES:**
```typescript
// 1. Reservar número de factura (LEGACY)
reservedInvoice = await reserveInvoiceNumber();

// 2. Preparar parámetros
const saleParams = { ... };

// 3. Llamar al RPC
const { data, error } = await supabase.rpc('process_sale', saleParams);

// 4. Actualizar con número reservado (LEGACY)
await supabase.from('sales').update({ invoice_number: reservedInvoice.invoiceNumber }).eq('id', saleId);
```

**DESPUÉS:**
```typescript
// 1. Preparar parámetros (SIN reservar número)
const saleParams = { ... };

// 2. Llamar al RPC (el backend genera el número atómicamente)
const { data, error } = await supabase.rpc('process_sale', saleParams);

// 3. El RPC retorna el invoice_number generado
const invoiceNumber = data?.invoice_number || data?.sale?.invoice_number;
```

---

#### **PASO 3: Verificar que el Backend Genera el Número**

**Archivo Backend:** `supabase/migrations/20250115000001_add_inventory_movements_to_process_sale.sql`

**Línea 132:**
```sql
v_invoice_number := generate_invoice_number(p_company_id);
```

**Función Backend:** `generate_invoice_number(p_company_id UUID)`

**Ubicación:** `supabase/migrations/20250826185000_create_sales_system.sql:19-50`

**Problema Actual:**
```sql
-- ⚠️ PROBLEMA: Usa MAX() que no es atómico
SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '\d+$') AS INTEGER)), 0) + 1
INTO v_sequence
FROM public.sales 
WHERE company_id = p_company_id 
AND invoice_number LIKE v_year || v_month || '-%';
```

**Solución Requerida:**
- Crear una **SECUENCIA DE BASE DE DATOS** (PostgreSQL `SEQUENCE`)
- Usar `nextval()` para obtener el siguiente número de forma atómica
- Garantizar monotonicidad y unicidad

---

### **PASO 4: Estructura de la Nueva RPC**

**Nombre Propuesto:** `create_sale_transaction` (o modificar `process_sale` existente)

**Responsabilidades:**
1. ✅ Generar número de factura atómicamente (usando `SEQUENCE`)
2. ✅ Crear la venta con el número ya asignado
3. ✅ Procesar items y actualizar inventario
4. ✅ Retornar el `invoice_number` generado

**Retorno Esperado:**
```json
{
  "success": true,
  "sale_id": "uuid",
  "invoice_number": "FAC-01ENE2025-0001",
  "message": "Venta procesada exitosamente"
}
```

---

## 📊 RESUMEN DE HALLAZGOS

### **✅ Código Limpio (No tocar):**
- Preparación de `saleParams` (Líneas 1797-1817)
- Llamada al RPC `process_sale` (Línea 1822)
- Funciones de formato (`formatInvoiceNumber`, `getDayKey`)

### **❌ Código Legacy a Eliminar:**
1. `reserveInvoiceNumber()` - Genera número en frontend
2. `syncInvoiceSequence()` - Busca MAX en frontend
3. `invoiceExists()` - Verifica existencia no atómica
4. `invoiceTrackerRef` - Estado local de secuencia
5. Asignación POST-PROCESAMIENTO del número de factura

### **⚠️ Backend a Mejorar:**
- `generate_invoice_number()` actual usa `MAX()` (no atómico)
- Debe migrarse a `SEQUENCE` de PostgreSQL para atomicidad

---

## 🎯 CONCLUSIÓN

**El proceso de venta actual vive en:** `src/pages/POS.tsx`

**Rastros de lógica antigua detectados en:**
- Líneas 1200-1234: `reserveInvoiceNumber()`
- Líneas ~1100-1150: `syncInvoiceSequence()`
- Líneas ~1152-1160: `invoiceExists()`
- Líneas 1974-2037: Asignación POST-PROCESAMIENTO
- Estado `invoiceTrackerRef` y toda su gestión

**Estrategia:**
1. Eliminar toda la lógica de reserva de números en el frontend
2. Modificar la llamada al RPC para confiar en el backend
3. Actualizar el backend para usar `SEQUENCE` de PostgreSQL
4. El RPC debe retornar el `invoice_number` generado
5. El frontend solo debe leer y mostrar el número retornado

**Mantener la estructura de:** Estado del carrito (`cart`, `setCart`), preparación de parámetros, y manejo de errores/éxito.





