# 📋 REFERENCIA: Sitio Web Pública y Sistema Principal

## 🔗 RELACIÓN ENTRE SISTEMAS

### **Sistema Principal (Este Repositorio):**
- Panel de Gestión Web (`/gestion-web`)
- Administra productos, precios, imágenes y visibilidad
- Genera listas de precios PDF con encabezado formal

### **Sitio Web Pública (Proyecto Separado):**
- Catálogo público de productos
- Muestra solo productos con `web_visible = true`
- Los clientes pueden descargar listas de precios simplificadas

---

## 🔌 CONEXIÓN: Funciones RPC Públicas

El sitio web pública se conecta a Supabase usando funciones RPC públicas (sin autenticación):

### **Funciones Disponibles:**

1. **`get_public_web_catalog()`** - Catálogo completo de productos visibles
2. **`get_public_web_product_stock_by_store()`** - Stock por sucursal

### **Datos Retornados:**
```typescript
{
  id: string;
  name: string;
  sku: string;
  category: string;
  sale_price_usd: number;
  total_stock: number;
  web_image_url: string;
  web_visible: boolean; // Siempre true (ya filtrado)
}
```

---

## 📊 FUNCIONALIDADES COMPARTIDAS

### **1. Lista de Precios PDF**

**Sistema Principal:**
- Modal completo con filtros avanzados
- Encabezado formal (logo, empresa, datos)
- Edición manual de tasa BCV
- Archivo: `src/components/web/PriceListModal.tsx`
- Generador: `src/utils/priceListPdfGenerator.ts`

**Web Pública:**
- Modal simplificado (solo porcentajes)
- **Encabezado IDÉNTICO al sistema principal** (logo, empresa, datos formales, fecha y hora; sin tasa BCV impresa por ser variable)
- Tasa BCV se usa solo para cálculos internos (columna BS BCV si aplica), no se imprime en el encabezado
- Solo productos visibles de la categoría seleccionada
- **Ver:** `INSTRUCCIONES_ENCABEZADO_PDF_WEB_PUBLICA.txt` para código exacto

### **2. Tasa BCV**

**Sistema Principal:**
- Función: `src/utils/bcvRate.ts`
- Obtiene desde API: `https://ve.dolarapi.com/v1/dolares`
- Busca: `fuente === 'oficial'`, usa campo `promedio`
- Fallback a base de datos

**Web Pública:**
- Debe copiar la función `fetchBcvRateFromApi()` del sistema principal
- Solo API (sin acceso a BD)
- Obtener en vivo al generar PDF

---

## 📁 ARCHIVOS DEL SISTEMA PRINCIPAL

### **Componentes:**
- `src/components/web/PriceListModal.tsx` - Modal de lista de precios
- `src/pages/GestionWebPage.tsx` - Panel de gestión web

### **Utilidades:**
- `src/utils/priceListPdfGenerator.ts` - Generador de PDF
- `src/utils/bcvRate.ts` - Obtención de tasa BCV

### **SQL (Base de Datos):**
- `sql/01_crear_web_product_metadata.sql` - Tabla de metadatos web
- `sql/02_crear_vista_web_products.sql` - Vista de productos web
- `sql/03_crear_rpc_web_catalog.sql` - RPC catálogo interno
- `sql/06_crear_rpc_public_web_catalog.sql` - RPC catálogo público
- `sql/07_crear_rpc_stock_por_sucursal.sql` - RPC stock público

---

## 🎯 FLUJO DE DATOS

```
Sistema Principal (Gestión Web)
    ↓
Actualiza: products.sale_price_usd
Actualiza: web_product_metadata (image_url, visible)
    ↓
Funciones RPC Públicas
    ↓
Sitio Web Pública
    ↓
Muestra productos con web_visible = true
```

---

## 📝 NOTAS IMPORTANTES

1. **Solo productos visibles:** La web pública solo muestra productos con `web_visible = true` y `web_image_url` presente.

2. **Sin autenticación:** La web pública usa clave anónima de Supabase, no requiere login.

3. **Tasa BCV:** La web pública debe obtenerla en vivo para evitar desfases temporales.

4. **Formato PDF:** La web pública debe usar el **mismo encabezado formal** que el sistema principal (logo, empresa, datos, fecha y hora; sin tasa BCV en encabezado). Ver `INSTRUCCIONES_ENCABEZADO_PDF_WEB_PUBLICA.txt`.

---

## 🔗 REFERENCIAS RÁPIDAS

- **Panel Gestión Web:** `/gestion-web` (solo admins)
- **RPC Pública:** `get_public_web_catalog()`
- **API BCV:** `https://ve.dolarapi.com/v1/dolares`
- **Función BCV:** `src/utils/bcvRate.ts` → `fetchBcvRateFromApi()`
- **Encabezado PDF:** `INSTRUCCIONES_ENCABEZADO_PDF_WEB_PUBLICA.txt` (código exacto)

---

**Última actualización:** Enero 2026

