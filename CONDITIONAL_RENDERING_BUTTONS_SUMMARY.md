# 🛡️ Conditional Rendering de Botones de Eliminar/Editar

## ✅ **CAMBIOS IMPLEMENTADOS**

Se implementó renderizado condicional para ocultar botones de eliminar y editar a usuarios que no tienen permisos (cashiers y managers).

---

## 📋 **LÓGICA APLICADA**

### **Source of Truth:**
- `userProfile.role` desde el hook `useAuth()`

### **Permisos:**
- **`canDelete`** = Solo `['master_admin', 'admin']`
- **`canEdit`** = Solo `['master_admin', 'admin']`

### **Condición:**
```typescript
{(userProfile?.role === 'master_admin' || userProfile?.role === 'admin') && (
  // Botones de editar/eliminar
)}
```

---

## 📝 **CAMBIOS POR ARCHIVO**

### 1. ✅ `src/pages/SalesPage.tsx`

**Ubicación:** Línea ~1789-1797

**Antes:**
```tsx
<TableCell>
  <Button
    variant="ghost"
    size="sm"
    onClick={() => handleDeleteSale(sale.id, sale.invoice_number)}
    className="flex items-center justify-center h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
  >
    <Trash2 className="h-4 w-4" />
  </Button>
</TableCell>
```

**Después:**
```tsx
<TableCell>
  {/* 🛡️ Conditional Rendering: Solo admins pueden eliminar ventas */}
  {userProfile?.role === 'master_admin' || userProfile?.role === 'admin' ? (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => handleDeleteSale(sale.id, sale.invoice_number)}
      className="flex items-center justify-center h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  ) : null}
</TableCell>
```

**Cambio:** Botón de eliminar venta solo visible para admins.

---

### 2. ✅ `src/pages/AlmacenPage.tsx`

**Ubicación:** Línea ~649-673

**Antes:**
```tsx
<div className="flex items-center gap-2">
  {/* Si el usuario no tiene permiso, las acciones fallarán en el backend */}
  <>
    <Button variant="ghost" size="sm" onClick={() => { setEditingProduct(product); setShowForm(true); }} title="Editar producto">
      <Edit className="w-4 h-4" />
    </Button>
    <Button variant="ghost" size="sm" onClick={() => setDeletingProduct(product)} title="Eliminar producto" className="text-red-600 hover:text-red-700 hover:bg-red-50">
      <Trash2 className="w-4 h-4" />
    </Button>
  </>
</div>
```

**Después:**
```tsx
<div className="flex items-center gap-2">
  {/* 🛡️ Conditional Rendering: Solo admins pueden editar/eliminar productos */}
  {(userProfile?.role === 'master_admin' || userProfile?.role === 'admin') && (
    <>
      <Button variant="ghost" size="sm" onClick={() => { setEditingProduct(product); setShowForm(true); }} title="Editar producto">
        <Edit className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setDeletingProduct(product)} title="Eliminar producto" className="text-red-600 hover:text-red-700 hover:bg-red-50">
        <Trash2 className="w-4 h-4" />
      </Button>
    </>
  )}
</div>
```

**Cambio:** Botones de editar y eliminar producto solo visibles para admins.

---

### 3. ✅ `src/pages/Users.tsx`

**Ubicación:** Línea ~1346-1370

**Antes:**
```tsx
<td className="p-4 opacity-90">
  <div className="flex items-center gap-2">
    <Button size="sm" variant="outline" onClick={() => openEditModal(user)} disabled={loading} title={`Modificar usuario (${roleLabel})`}>
      <Edit className="w-4 h-4 mr-2" />
      Modificar
    </Button>
    <Button size="sm" variant="destructive" onClick={() => deleteUser(user.id, user.name || 'Usuario')} disabled={loading} title="Eliminar usuario permanentemente">
      <Trash2 className="w-4 h-4" />
    </Button>
  </div>
</td>
```

**Después:**
```tsx
<td className="p-4 opacity-90">
  <div className="flex items-center gap-2">
    {/* 🛡️ Conditional Rendering: Solo admins pueden editar/eliminar usuarios */}
    {(userProfile?.role === 'master_admin' || userProfile?.role === 'admin') && (
      <>
        <Button size="sm" variant="outline" onClick={() => openEditModal(user)} disabled={loading} title={`Modificar usuario (${roleLabel})`}>
          <Edit className="w-4 h-4 mr-2" />
          Modificar
        </Button>
        <Button size="sm" variant="destructive" onClick={() => deleteUser(user.id, user.name || 'Usuario')} disabled={loading} title="Eliminar usuario permanentemente">
          <Trash2 className="w-4 h-4" />
        </Button>
      </>
    )}
  </div>
</td>
```

**Cambio:** Botones de editar y eliminar usuario solo visibles para admins.

---

### 4. ✅ `src/pages/CustomersPage.tsx`

**Ubicación:** Línea ~534-562

**Antes:**
```tsx
<div className="flex space-x-1 ml-2">
  <Button size="sm" variant="ghost" onClick={() => setViewingCustomer(customer)} title="Ver detalles" className="h-8 w-8 xs:h-9 xs:w-9 p-0 touch-manipulation">
    <Eye className="w-4 h-4" />
  </Button>
  <Button size="sm" variant="ghost" onClick={() => openEditForm(customer)} title="Editar" className="h-8 w-8 xs:h-9 xs:w-9 p-0 touch-manipulation">
    <Edit className="w-4 h-4" />
  </Button>
  <Button size="sm" variant="ghost" onClick={() => setDeletingCustomer(customer)} title="Eliminar" className="h-8 w-8 xs:h-9 xs:w-9 p-0 touch-manipulation text-red-600 hover:text-red-700 hover:bg-red-50">
    <Trash2 className="w-4 h-4" />
  </Button>
</div>
```

**Después:**
```tsx
<div className="flex space-x-1 ml-2">
  <Button size="sm" variant="ghost" onClick={() => setViewingCustomer(customer)} title="Ver detalles" className="h-8 w-8 xs:h-9 xs:w-9 p-0 touch-manipulation">
    <Eye className="w-4 h-4" />
  </Button>
  {/* 🛡️ Conditional Rendering: Solo admins pueden editar/eliminar clientes */}
  {(userProfile?.role === 'master_admin' || userProfile?.role === 'admin') && (
    <>
      <Button size="sm" variant="ghost" onClick={() => openEditForm(customer)} title="Editar" className="h-8 w-8 xs:h-9 xs:w-9 p-0 touch-manipulation">
        <Edit className="w-4 h-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setDeletingCustomer(customer)} title="Eliminar" className="h-8 w-8 xs:h-9 xs:w-9 p-0 touch-manipulation text-red-600 hover:text-red-700 hover:bg-red-50">
        <Trash2 className="w-4 h-4" />
      </Button>
    </>
  )}
</div>
```

**Cambio:** Botones de editar y eliminar cliente solo visibles para admins. El botón "Ver detalles" permanece visible para todos.

---

## 🎯 **RESUMEN DE CAMBIOS**

| Archivo | Botones Afectados | Condición |
|---------|-------------------|-----------|
| `SalesPage.tsx` | Eliminar venta | Solo `master_admin` o `admin` |
| `AlmacenPage.tsx` | Editar/Eliminar producto | Solo `master_admin` o `admin` |
| `Users.tsx` | Editar/Eliminar usuario | Solo `master_admin` o `admin` |
| `CustomersPage.tsx` | Editar/Eliminar cliente | Solo `master_admin` o `admin` |

---

## ✅ **BENEFICIOS**

1. **Mejor UX:** Los usuarios no ven botones que no pueden usar
2. **Menos Frustración:** Evita que cashiers/managers intenten acciones que fallarán
3. **Claridad Visual:** La interfaz refleja claramente los permisos del usuario
4. **Seguridad en Capas:** Frontend oculta botones + Backend (RLS) bloquea acciones

---

## 🛡️ **NOTA DE SEGURIDAD**

**Importante:** Esta es una mejora de UX, NO una medida de seguridad. La seguridad real está en el backend (RLS). Si un usuario malicioso modifica el frontend, el backend seguirá bloqueando las acciones no autorizadas.

---

**FIN DEL RESUMEN**


