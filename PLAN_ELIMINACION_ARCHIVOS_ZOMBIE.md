# 🗑️ PLAN DE ELIMINACIÓN: Archivos Zombie y Deuda Técnica

**Fecha:** 2025-01-03  
**Auditor:** Senior Code Safety Officer  
**Estado:** ⏸️ **ESPERANDO CONFIRMACIÓN**

---

## ✅ VERIFICACIÓN DE EXISTENCIA

| Archivo/Carpeta | Estado | Tamaño/Contenido | Referencias Encontradas |
|-----------------|--------|------------------|------------------------|
| `src/pages/POS.tsx.backup` | ✅ **EXISTE** | ~3,516 líneas | ❌ Ninguna (archivo backup) |
| `src/pages/Index.tsx` | ✅ **EXISTE** | ~15 líneas | ❌ Ninguna (solo falsos positivos: `Array.from` y `index.css`) |
| `src/components/products/` | ✅ **EXISTE** | 🟢 **VACÍA** | ❌ Ninguna |
| `src/lib/inventory/` | ✅ **EXISTE** | 🟢 **VACÍA** | ❌ Ninguna |
| `src/pages/CashRegisterPage.tsx` | ✅ **EXISTE** | ~73 líneas | ❌ Ninguna (no importado en App.tsx) |
| `src/lib/reports/salesReport.test.ts` | ✅ **EXISTE** | ~N líneas | ⚠️ Importa `@/tests/fixtures/salesReport` (se eliminará también) |
| `src/lib/sales/stats.test.ts` | ✅ **EXISTE** | ~N líneas | ⚠️ Importa `@/tests/fixtures/sales` (se eliminará también) |
| `src/tests/` | ✅ **EXISTE** | 3 archivos en `fixtures/` | ⚠️ Importado por archivos de test (se eliminarán también) |

---

## 📋 PLAN DE ELIMINACIÓN (ORDEN SEGURO)

### **FASE 1: Archivos Individuales (Sin Dependencias)**

```bash
# 1. Archivo de backup
rm src/pages/POS.tsx.backup

# 2. Vista huérfana
rm src/pages/Index.tsx

# 3. Vista deshabilitada
rm src/pages/CashRegisterPage.tsx
```

**Riesgo:** 🟢 **BAJO** - No tienen dependencias activas

---

### **FASE 2: Archivos de Test (Con Dependencias Internas)**

```bash
# 4. Test de reportes (importa tests/fixtures, pero se eliminará también)
rm src/lib/reports/salesReport.test.ts

# 5. Test de estadísticas (importa tests/fixtures, pero se eliminará también)
rm src/lib/sales/stats.test.ts
```

**Riesgo:** 🟢 **BAJO** - Solo se importan entre sí (tests/fixtures), que también se eliminará

---

### **FASE 3: Carpetas Vacías**

```bash
# 6. Carpeta de productos vacía
rmdir src/components/products

# 7. Carpeta de inventario vacía
rmdir src/lib/inventory
```

**Riesgo:** 🟢 **BAJO** - Carpetas completamente vacías

---

### **FASE 4: Carpeta de Tests Completa**

```bash
# 8. Carpeta completa de tests (incluye fixtures/)
rmdir /s src/tests
```

**Contenido a eliminar:**
- `src/tests/fixtures/inventory.ts`
- `src/tests/fixtures/sales.ts`
- `src/tests/fixtures/salesReport.ts`

**Riesgo:** 🟢 **BAJO** - Solo usada por archivos de test que también se eliminan

---

## 🛡️ ARCHIVOS PROTEGIDOS (NO SE TOCARÁN)

✅ `src/types/legacy-financial.ts` - **PROTEGIDO** (en uso activo)  
✅ `src/pages/ReportsNew.tsx` - **PROTEGIDO** (importado en App.tsx línea 29)

---

## 📊 RESUMEN DE ELIMINACIÓN

| Categoría | Cantidad | Impacto Estimado |
|-----------|----------|------------------|
| **Archivos de Backup** | 1 | ~100 KB |
| **Vistas Huérfanas** | 2 | ~2 KB |
| **Archivos de Test** | 2 | ~5 KB |
| **Carpetas Vacías** | 2 | 0 KB |
| **Carpeta Tests Completa** | 1 (con 3 archivos) | ~3 KB |
| **TOTAL** | **8 elementos** | **~110 KB** |

---

## ⚠️ VERIFICACIONES POST-ELIMINACIÓN

Después de ejecutar la eliminación, se verificará:

1. ✅ `npm run build` - Build debe completarse sin errores
2. ✅ `npm run dev` - Aplicación debe iniciar correctamente
3. ✅ Navegación - Todas las rutas en `App.tsx` deben funcionar
4. ✅ Imports - No debe haber referencias rotas

---

## 🎯 ORDEN DE EJECUCIÓN PROPUESTO

```bash
# Paso 1: Archivos individuales sin dependencias
rm src/pages/POS.tsx.backup
rm src/pages/Index.tsx
rm src/pages/CashRegisterPage.tsx

# Paso 2: Archivos de test
rm src/lib/reports/salesReport.test.ts
rm src/lib/sales/stats.test.ts

# Paso 3: Carpetas vacías
rmdir src/components/products
rmdir src/lib/inventory

# Paso 4: Carpeta de tests completa
rmdir /s src/tests
```

---

## ✅ ESTADO ACTUAL

⏸️ **ESPERANDO CONFIRMACIÓN EXPLÍCITA DEL USUARIO**

**No se ejecutará ningún comando hasta recibir confirmación.**


