import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-06-18';
const SLUG = 'investigacion-cierres-estadisticas-2026';

export const informeInvestigacionCierresEstadisticas: PublicInforme = {
  slug: SLUG,
  titulo: 'Investigación técnica: cálculo de Cierres diarios vs Estadísticas',
  subtitulo:
    'Cómo se calculan ambas pantallas, referencias de código/SQL y explicación de la diferencia (sin login)',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'validacion',
  tags: ['cierres', 'estadísticas', 'investigación', 'cost_usd', 'sale_price_usd', 'sql', 'código'],
  relacionados: [
    INFORMES_CATALOGO_SLUG,
    'cierres-inventario-vs-estadisticas-2026',
    'inventario-estado-actual-2026-06',
  ],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Fecha informe', value: FECHA_INFORME },
    { label: 'Tipo', value: 'Investigación técnica (código + SQL)' },
    { label: 'URL pública', value: `/informe/${SLUG}` },
    { label: 'Informe complementario', value: '/informe/cierres-inventario-vs-estadisticas-2026' },
  ],
  sections: [
    { type: 'hero', badge: 'Investigación · Cierres · Estadísticas' },
    {
      type: 'text',
      title: 'Preámbulo',
      paragraphs: [
        'Este informe documenta la revisión realizada cuando los totales de Historial → Cierres diarios no coincidían con los de la pantalla Estadísticas. La consulta partió de cifras reales del 18/06/2026: USD 113.875,64 frente a USD 158.335,70, y 5.728 unidades frente a 5.611.',
        'El análisis confirma que no se trata de un error de suma ni de pérdida de datos. Cada pantalla responde a una pregunta de gestión distinta y utiliza campos del producto visibles al crear o editar un artículo: **Costo (USD)** y **Precio Venta (USD)**.',
        'A continuación se detalla el soporte técnico (SQL, base de datos y código del frontend). Los nombres en **negrita** son las etiquetas que ve el usuario; los nombres en *cursiva* son variables o campos internos del sistema.',
      ],
    },
    {
      type: 'verdict',
      titulo: 'La diferencia no es un error de cálculo',
      detalle:
        'Esas dos pantallas miden cosas distintas: Cierres diarios usa **Costo (USD)** (*cost_usd*) y una foto a las 00:00 Venezuela; Estadísticas usa **Precio Venta (USD)** (*sale_price_usd*) y el inventario en vivo al pulsar **Actualizar**.',
      ok: true,
    },
    {
      type: 'text',
      title: 'Objetivo de la investigación',
      paragraphs: [
        'Investigación de cómo se calculan los cierres diarios y las estadísticas para explicar la diferencia entre Historial → Cierres diarios y la pantalla Estadísticas.',
        'La diferencia no es un error de cálculo, sino que esas dos pantallas miden cosas distintas.',
        'Soporte técnico: la captura nocturna persiste filas en la tabla *inventory_snapshots* mediante la función *capture_inventory_snapshots*; Estadísticas recalcula en el navegador a partir de *inventories* unido a *products* (*EstadisticasPage.tsx*).',
      ],
    },
    {
      type: 'text',
      title: '1. El USD no puede coincidir: usan precios diferentes',
      paragraphs: [
        'Cierres diarios: unidades de stock (*qty*) × **Costo (USD)** (*cost_usd*) → valor de costo (patrimonio contable). En pantalla aparece como **Valor USD** (*total_value_usd*).',
        'Estadísticas: unidades de stock (*qty*) × **Precio Venta (USD)** (*sale_price_usd*) → valor de venta (precio al público). En pantalla aparece como **Valor Total del Inventario** (*inventorySummary.totalValue*).',
        'Soporte técnico: el formulario de producto (*ProductForm.tsx*) exige ambos campos — etiquetas **Costo (USD)** y **Precio Venta (USD)** (obligatorios). Almacén lista la columna **Costo** y el precio de venta sobre los mismos campos. El cierre solo multiplica por *cost_usd*; Estadísticas solo por *sale_price_usd*.',
      ],
    },
    {
      type: 'table',
      title: 'Comparación de fórmulas USD',
      headers: ['Pantalla', 'Fórmula (nombre en pantalla)', 'Qué representa'],
      rows: [
        {
          cells: [
            'Cierres diarios — **Valor USD**',
            'unidades (*qty*) × **Costo (USD)** (*cost_usd*)',
            'Valor de costo (patrimonio contable)',
          ],
        },
        {
          cells: [
            'Estadísticas — **Valor Total del Inventario**',
            'unidades (*qty*) × **Precio Venta (USD)** (*sale_price_usd*)',
            'Valor de venta (precio al público)',
          ],
        },
      ],
    },
    {
      type: 'text',
      title: 'En la base de datos, el cierre se guarda así',
      paragraphs: [
        'Archivo: *supabase/migrations/20250209180000_snapshots_by_category.sql* — líneas 48-50.',
        'Soporte técnico: el resultado se almacena en *inventory_snapshots.total_value_usd*, una fila por tienda y fecha de captura (*captured_at*). Si **Costo (USD)** (*cost_usd*) es NULL, *COALESCE* lo trata como 0 — la unidad cuenta en stock pero no suma dólares.',
      ],
    },
    {
      type: 'code',
      title: 'SQL — capture_inventory_snapshots (**Valor USD** → *total_value_usd*)',
      language: 'sql',
      code: `-- stock total (*qty*) y **Valor USD** a costo (*total_value_usd*)
SELECT
  COALESCE(SUM(i.*qty*), 0)::INTEGER,
  COALESCE(SUM(i.*qty* * COALESCE(p.*cost_usd*, 0)), 0)::NUMERIC(18,4)`,
    },
    {
      type: 'text',
      title: 'En Estadísticas, el total se calcula con **Precio Venta (USD)**',
      paragraphs: [
        'Archivo: *src/pages/EstadisticasPage.tsx* — líneas 520-526.',
        'Soporte técnico: la variable *totalValue* alimenta la tarjeta **Valor Total del Inventario**; *totalUnits* alimenta el texto «unidades en total en todo el inventario». *salePrice* lee *products.sale_price_usd* del join *inventories* → *products*.',
      ],
    },
    {
      type: 'code',
      title: 'TypeScript — EstadisticasPage.tsx (**Valor Total del Inventario** → *totalValue*)',
      language: 'typescript',
      code: `let *totalValue* = 0;        // → UI: "**Valor Total del Inventario**"
let *totalUnits* = 0;        // → UI: "unidades en total..."
*sanitizedInventory*.forEach((item: any) => {
  const *qty* = Math.max(0, item.*qty* || 0);
  const *salePrice* = item.products?.*sale_price_usd* || 0;  // **Precio Venta (USD)**
  *totalValue* += *qty* * *salePrice*;
  *totalUnits* += *qty*;
});`,
    },
    {
      type: 'table',
      title: 'Con tus números (ejemplo 18/06/2026)',
      headers: ['Concepto', 'Valor', 'Interpretación'],
      rows: [
        {
          cells: [
            'Cierres — **Valor USD** (*total_value_usd*)',
            'USD 113.875,64',
            'Costo del stock',
          ],
        },
        {
          cells: [
            'Estadísticas — **Valor Total del Inventario** (*totalValue*)',
            'USD 158.335,70',
            'Valor si vendieras todo al precio de lista',
          ],
        },
        { cells: ['Diferencia', '~USD 44.460', '~28 % de margen bruto potencial'] },
      ],
    },
    {
      type: 'text',
      paragraphs: [
        'Productos sin **Costo (USD)** (*cost_usd*) aportan 0 al USD del cierre, pero sí cuentan unidades (*qty*).',
        'Productos sin **Precio Venta (USD)** (*sale_price_usd*) aportan 0 en Estadísticas.',
        'Soporte técnico: en SQL, *COALESCE(p.cost_usd, 0)*; en *EstadisticasPage*, *sale_price_usd || 0*. Comportamiento simétrico en ambos lados.',
      ],
    },
    {
      type: 'text',
      title: '2. Las unidades tampoco coinciden porque no es el mismo momento',
      paragraphs: [
        'El texto del historial indica que **Teléfonos**, **Accesorios** y **Servicio técnico** (*qty_phones*, *qty_accessories*, *qty_services*) coinciden con Estadísticas solo si comparas el mismo instante.',
        'Archivo: *src/pages/HistorialPage.tsx* — línea 707.',
        'Soporte técnico: el cron ejecuta *capture_inventory_snapshots* a las 00:00 Venezuela (04:00 UTC) con *captured_at* = inicio del día. Estadísticas consulta *inventories* en tiempo real al pulsar **Actualizar** — no lee *inventory_snapshots* para los totales en vivo.',
      ],
    },
    {
      type: 'code',
      title: 'HistorialPage.tsx — texto UI (pestaña Cierres diarios)',
      language: 'typescript',
      code: `Unidades por categoría por tienda (coincide con Estadísticas).
Cron a 00:00 Venezuela (04:00 UTC).
// Campos del snapshot: *qty_phones* | *qty_accessories* | *qty_services*`,
    },
    {
      type: 'text',
      paragraphs: [
        'Pero estás comparando:',
        '• Cierre 18/06: foto a las 00:00 (inicio del día) → 5.728 unidades (suma de *qty_phones* + *qty_accessories* + *qty_services*)',
        '• Estadísticas (**Actualizar**): inventario en vivo ahora → 5.611 unidades (*inventorySummary.totalUnits*)',
        '• Diferencia: 117 unidades vendidas o movidas desde medianoche.',
        'Soporte técnico: cada venta descuenta *qty* en *inventories* vía *process_sale*; transferencias entre tiendas mueven *qty* entre *store_id* sin cambiar el total global, pero ventas sí reducen el total.',
      ],
    },
    {
      type: 'table',
      title: 'Desglose por tienda (cierre → ahora)',
      headers: ['Tienda', 'Cierre 18/06', 'Estadísticas ahora', 'Δ'],
      rows: [
        { cells: ['Tu Móvil Centro', '931', '941', '+10'] },
        { cells: ['Tu Móvil La Isla', '85', '80', '−5'] },
        { cells: ['Tu Móvil Marino', '311', '307', '−4'] },
        { cells: ['Tu Móvil Store', '954', '950', '−4'] },
        { cells: ['Zona Gamer Margarita', '3.447', '3.333', '−114'] },
        { cells: ['TOTAL', '5.728', '5.611', '−117'] },
      ],
    },
    {
      type: 'text',
      paragraphs: [
        'La mayor parte del movimiento fue en Zona Gamer (ventas del día).',
        'Soporte técnico: el desglose por tienda del cierre proviene de *inventory_snapshots* por *store_id*; Estadísticas agrupa *sanitizedInventory* por *store_id* y categoría (*phones*, *accessories*, *technical_service*) en *statsByStore*.',
      ],
    },
    {
      type: 'text',
      title: '3. Respuesta corta para el dueño',
      paragraphs: [
        'USD 113.875,64 (cierre — **Valor USD** / *total_value_usd*) = cuánto costó el inventario (**Costo (USD)** / *cost_usd*).',
        'USD 158.335,70 (estadísticas — **Valor Total del Inventario** / *totalValue*) = cuánto valdría venderlo todo (**Precio Venta (USD)** / *sale_price_usd*).',
        'Son dos métricas distintas; la segunda siempre será mayor si hay margen.',
        '5.728 vs 5.611 unidades: el cierre es de medianoche; Estadísticas muestra el stock ahora, después de ventas y movimientos del día.',
      ],
    },
    {
      type: 'text',
      title: '4. Mejora de UI (opcional)',
      paragraphs: [
        'Hoy el cierre muestra **Valor USD** (*total_value_usd*) sin aclarar que es costo, y el texto «coincide con Estadísticas» puede confundir en el monto en dólares. Sería más claro:',
        '• Cierres: **Valor USD (costo)** o **Patrimonio a costo** — ligado a **Costo (USD)** (*cost_usd*)',
        '• Estadísticas: **Valor USD (precio de venta)** — ligado a **Precio Venta (USD)** (*sale_price_usd*)',
        'Si se aplican esos cambios de etiquetas en *HistorialPage.tsx* y *EstadisticasPage.tsx*, se reduce la ambigüedad sin modificar las fórmulas.',
      ],
    },
    {
      type: 'text',
      title: 'Conclusión ejecutiva',
      paragraphs: [
        'La operación puede confiar en que el sistema registra el inventario de forma coherente. La aparente brecha entre USD 113.875,64 y USD 158.335,70 obedece a que el cierre valora la mercancía al **Costo (USD)** (*cost_usd*), mientras que Estadísticas la valora al **Precio Venta (USD)** (*sale_price_usd*) — dos indicadores válidos para decisiones distintas.',
        'Para patrimonio invertido en stock, utilice Historial → Cierres diarios (**Valor USD**). Para valor comercial potencial, utilice Estadísticas (**Valor Total del Inventario**). Para comparar unidades, alinee el momento: cierre de medianoche versus Estadísticas consultada a la misma hora, o acepte la variación diaria por ventas y movimientos.',
        'No se requiere corrección de datos ni ajuste contable por esta diferencia. La mejora recomendada es de claridad en etiquetas de pantalla, no de lógica de negocio.',
      ],
    },
    {
      type: 'links',
      title: 'Enlaces',
      items: [
        { label: 'Explicación en lenguaje sencillo', href: '/informe/cierres-inventario-vs-estadisticas-2026' },
        { label: 'Catálogo de informes', href: '/informes' },
        { label: 'Inventario actual (5 tiendas)', href: '/informe/inventario-estado-actual-2026-06' },
        {
          label: 'POS — Historial / Cierres',
          href: 'https://pos-tu-movil.onrender.com/historial',
          external: true,
        },
        {
          label: 'POS — Estadísticas',
          href: 'https://pos-tu-movil.onrender.com/estadisticas',
          external: true,
        },
      ],
    },
  ],
};

export const ALL_INVESTIGACION_CIERRES_INFORMES: PublicInforme[] = [informeInvestigacionCierresEstadisticas];
