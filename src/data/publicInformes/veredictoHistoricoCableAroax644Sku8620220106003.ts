import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';
import { SLUG_HISTORIAL_AROAX_644 } from './historialInventarioCableAroax644Sku8620220106003';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-10-15';
const PRODUCTO = 'cable aroax 644 super carga rapida c a c y usb a c';
const SKU = '8620220106003';
const PRODUCT_ID = '8fed62d7-0380-4993-9456-d3756dc2262d';

/** Veredicto histórico — reconstrucción desde creación hasta último movimiento. */
export const SLUG_VEREDICTO_HISTORICO_AROAX_644 =
  'veredicto-historico-cable-aroax-644-8620220106003-2026-10';

export const informeVeredictoHistoricoCableAroax644: PublicInforme = {
  slug: SLUG_VEREDICTO_HISTORICO_AROAX_644,
  titulo: 'Veredicto histórico — Cable Aroax 644',
  subtitulo:
    'TU MÓVIL POS · Auditoría de inventario. Reconstrucción desde la creación del producto hasta el último movimiento registrado.',
  fecha: FECHA_INFORME,
  estado: 'aprobado',
  categoria: 'inventario',
  tags: ['inventario', 'cable-aroax', 'veredicto', 'historico', 'conciliacion', SKU],
  relacionados: [INFORMES_CATALOGO_SLUG, SLUG_HISTORIAL_AROAX_644],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Destinatario', value: 'Gerencia / operaciones de inventario' },
    { label: 'Producto', value: PRODUCTO },
    { label: 'SKU', value: SKU },
    { label: 'Product ID', value: PRODUCT_ID },
    { label: 'Fecha', value: FECHA_INFORME },
    {
      label: 'URL',
      value: `/informe/${SLUG_VEREDICTO_HISTORICO_AROAX_644}`,
    },
  ],
  sections: [
    {
      type: 'hero',
      badge: 'TU MÓVIL POS · Auditoría de inventario · Veredicto histórico',
    },
    {
      type: 'text',
      title: 'Alcance',
      paragraphs: [
        'Con las consultas ejecutadas en Supabase, se reconstruye lo ocurrido con este producto desde su creación hasta el último movimiento registrado.',
        'No se inventan facturas individuales ni se afirma conteo físico. Las cifras provienen de `products`, `inventories`, `inventory_movements`, `inventory_transfers`, `sales` y `sale_items`.',
      ],
    },
    {
      type: 'verdict',
      titulo: 'Resultado de la investigación — Conciliación correcta',
      detalle: [
        '**Unidades incorporadas: 51** · **Unidades vendidas: 25** · **Stock actual: 26**.',
        'Las 26 unidades existentes están explicadas por el historial reconstruido. **No se encontró diferencia contable** en los datos examinados.',
        'Esto no certifica existencia física ni justifica por sí solo los aumentos manuales (harían falta justificantes y conteo físico).',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'table',
      title: '1. ¿Cuándo se creó y cuándo recibió mercancía?',
      description: 'Horario Venezuela (VE).',
      headers: ['Acontecimiento', 'Fecha y hora (Venezuela)', 'Unidades'],
      rows: [
        {
          cells: [
            'Creación del producto',
            '04/06/2026 · 3:53:52 p. m.',
            '—',
          ],
        },
        {
          cells: [
            'Primera carga, al crearlo',
            '04/06/2026 · 3:53:52 p. m.',
            '+25',
          ],
        },
        {
          cells: [
            'Segunda carga manual',
            '04/06/2026 · 3:59:19 p. m.',
            '+25',
          ],
        },
        {
          cells: [
            'Último aumento manual',
            '15/10/2026 · 4:48:51 p. m.',
            '+1',
          ],
        },
      ],
    },
    {
      type: 'text',
      paragraphs: [
        'El producto se creó el **4 de junio de 2026** con **25 unidades** iniciales. Apenas **5 minutos y 27 segundos** después se incorporaron otras **25 unidades**.',
        'Por tanto, el mismo día de creación alcanzó **50 unidades** en **Zona Gamer Margarita**.',
        'Posteriormente, el **15 de octubre**, se incorporó **una unidad adicional** mediante ajuste manual.',
      ],
    },
    {
      type: 'table',
      title: '2. ¿Cuántas veces se ha vendido?',
      description:
        'Ventas completed: 24 facturas · Mercancía vendida: 25 unidades. Primera venta completed: 18/06/2026. Última: 14/10/2026 (2 uds en Tu Móvil Store). Todas las facturas recuperadas están marcadas como completed. Listado individual de las 24 FAC: pendiente documental (no inventado).',
      headers: ['Sucursal', 'Ventas', 'Unidades'],
      rows: [
        { cells: ['Tu Móvil Marino', '18', '18'] },
        { cells: ['Zona Gamer Margarita', '5', '5'] },
        { cells: ['Tu Móvil Store', '1', '2'] },
        { cells: ['Total', '24', '25'] },
      ],
    },
    {
      type: 'table',
      title: '3. ¿Cuántas veces se ha ajustado o trasladado? (operaciones de negocio)',
      description:
        'Hay que distinguir operaciones manuales / de negocio de los registros automáticos del sistema. Los ADJUST automáticos que acompañan ventas, traslados y cancelaciones no deben sumarse como intervenciones manuales independientes.',
      headers: ['Tipo de operación', 'Cantidad', 'Unidades involucradas'],
      rows: [
        { cells: ['Carga inicial', '1', '+25'] },
        { cells: ['Aumentos manuales', '2', '+26'] },
        { cells: ['Ventas completadas', '24', '−25'] },
        { cells: ['Traslados entre sucursales', '5', '35'] },
        { cells: ['Restituciones por cancelación', '2', '+2'] },
      ],
    },
    {
      type: 'text',
      paragraphs: [
        'Los dos aumentos manuales fueron el **4 de junio (+25)** y el **15 de octubre (+1)**.',
        'Se identificaron **79 registros** en `inventory_movements`. Los **10 TRANSFER** corresponden a las dos caras de **cinco traslados reales** (salida origen + entrada destino).',
      ],
    },
    {
      type: 'table',
      title: 'Distribución de los 79 registros en inventory_movements',
      headers: ['Tipo de registro', 'Cantidad'],
      rows: [
        { cells: ['ADJUST', '43'] },
        { cells: ['OUT', '24'] },
        { cells: ['TRANSFER', '10'] },
        { cells: ['IN', '2'] },
        { cells: ['Total', '79'] },
      ],
    },
    {
      type: 'verdict',
      titulo: '4. ¿Cuál fue el último movimiento del producto?',
      detalle: [
        '**Última operación registrada:** 15 de octubre de 2026 · **5:59:24 p. m.**',
        '**Traslado de 9 unidades:** Zona Gamer **20 → 11** · La Isla **0 → 9**.',
        'Operación registrada como completada, con evidencia en `inventory_transfers` e `inventory_movements`.',
        'Ese mismo día, aproximadamente **una hora y diez minutos antes**, se había realizado el último aumento manual de **una unidad**.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'table',
      title: '5. ¿Dónde terminaron las 26 unidades?',
      headers: ['Sucursal', 'Stock actual'],
      rows: [
        { cells: ['Zona Gamer Margarita', '11'] },
        { cells: ['Tu Móvil La Isla', '9'] },
        { cells: ['Tu Móvil Marino', '6'] },
        { cells: ['Tu Móvil Store', '0'] },
        { cells: ['Tu Móvil Centro', '0'] },
        { cells: ['TOTAL', '26'] },
      ],
    },
    {
      type: 'text',
      title: 'Conclusión gerencial',
      paragraphs: [
        'Desde el **4 de junio** hasta el **15 de octubre de 2026**, el producto registra **24 ventas completadas**, **5 traslados**, **2 aumentos manuales** y **2 restituciones por cancelación**.',
        'El inventario pasó de **25 unidades iniciales** a **50** el día de su creación; posteriormente se incorporó **una unidad adicional** y se vendieron **25**, quedando **26 unidades** distribuidas entre **tres sucursales**.',
      ],
    },
    {
      type: 'verdict',
      titulo: 'Veredicto final',
      detalle: [
        '**No se identifica un faltante contable** en la reconstrucción histórica disponible.',
        'Sin embargo, esto **no certifica** que las 26 unidades existan físicamente ni explica por qué se efectuaron los aumentos manuales: para eso harían falta sus **justificantes** y un **conteo físico**.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'links',
      title: 'Informe complementario',
      items: [
        {
          label: 'Historial de inventario y conciliación (informe 1)',
          href: `/informe/${SLUG_HISTORIAL_AROAX_644}`,
        },
        { label: 'Catálogo de informes', href: '/informes' },
      ],
    },
  ],
};

export const ALL_VEREDICTO_HISTORICO_AROAX_644_INFORMES: PublicInforme[] = [
  informeVeredictoHistoricoCableAroax644,
];
