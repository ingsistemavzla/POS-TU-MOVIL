# Auditoría Automática del Dashboard de Inventario

## Prerrequisitos

- Node y npm instalados.
- Dependencias del proyecto instaladas (`npm install`).

## Comandos clave

```bash
npm run test        # Ejecuta Vitest en modo watch (útil durante desarrollo)
npm run test:run    # Corre todas las pruebas una vez (modo CI)
npm run test:coverage  # Corre las pruebas y genera reporte de cobertura
```

## Fixtures Disponibles

Ubicados en `src/tests/fixtures/inventory.ts`:

- `storesFixture`: listado de tiendas activas.
- `inventoryFixture`: inventario completo usado para probar la vista global.
- `inventoryManagerFixture`: subconjunto para escenarios de gerente con una sola tienda.

## Lógica cubierta por pruebas

1. `groupProductsBySku`
   - Agrupa productos por SKU.
   - Inserta tiendas con inventario cero.
   - Marca bandera `hasLowStock`.

2. `sortInventoryItems`
   - Ordena por nombre, SKU, cantidad, precio, categoría o tienda.
   - Respeta orden asc/desc.

3. `getStoreStockVisuals`
   - Clasifica entre `Sin stock`, `Stock bajo` o `Normal`.

4. `calculateFilteredStats` / `getCategoryStats`
   - Recalcula KPIs globales según tienda seleccionada.
   - Genera totales por categoría (valor, unidades, productos únicos).

## Flujo sugerido antes de release

1. `npm run test:run`
2. Revisar que todas las pruebas pasen.
3. (Opcional) `npm run test:coverage` para ver la cobertura.
4. Documentar cualquier fixture nuevo añadido para cubrir nuevos escenarios.

