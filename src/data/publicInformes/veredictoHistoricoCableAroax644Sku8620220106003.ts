import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';
import { SLUG_HISTORIAL_AROAX_644 } from './historialInventarioCableAroax644Sku8620220106003';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-10-15';
const PRODUCTO = 'cable aroax 644 super carga rapida c a c y usb a c';
const SKU = '8620220106003';
const PRODUCT_ID = '8fed62d7-0380-4993-9456-d3756dc2262d';

/**
 * Veredicto histórico — Cable Aroax 644
 * Diseño: RESULTADO → EXPLICACIÓN → EVIDENCIA → CONCLUSIÓN
 * Solo secciones nativas PublicInforme (sin tocar renderer compartido).
 * Barras de stock: caracteres Unicode proporcionales al total 26.
 */
export const SLUG_VEREDICTO_HISTORICO_AROAX_644 =
  'veredicto-historico-cable-aroax-644-8620220106003-2026-10';

/** Barra horizontal proporcional a 26 uds (1 bloque ≈ 1 unidad). */
function barraStock(uds: number): string {
  if (uds <= 0) return '·';
  return '█'.repeat(uds);
}

function pct(uds: number): string {
  return `${((uds / 26) * 100).toFixed(1)} %`;
}

export const informeVeredictoHistoricoCableAroax644: PublicInforme = {
  slug: SLUG_VEREDICTO_HISTORICO_AROAX_644,
  titulo: 'Veredicto histórico — Cable Aroax 644',
  subtitulo: 'TU MÓVIL POS · Auditoría de inventario',
  fecha: FECHA_INFORME,
  estado: 'aprobado',
  categoria: 'inventario',
  tags: ['inventario', 'cable-aroax', 'veredicto', 'historico', 'visual', SKU],
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
    // ── HERO / RESULTADO ─────────────────────────────────────────────
    {
      type: 'hero',
      badge: 'VEREDICTO HISTÓRICO · Cable Aroax 644 · TU MÓVIL POS · Auditoría de inventario',
    },
    {
      type: 'text',
      paragraphs: [
        'Con las consultas ejecutadas en Supabase, podemos reconstruir lo que ocurrió con este producto desde su creación hasta el último movimiento registrado.',
      ],
    },
    {
      type: 'verdict',
      titulo: 'CONCILIACIÓN CORRECTA',
      detalle:
        'Estado documental del historial reconstruido. **No** equivale a un conteo físico en tienda.',
      ok: true,
    },
    {
      type: 'table',
      title: 'Resultado en tres cifras',
      description: 'Lectura inmediata: incorporadas · vendidas · existencias actuales.',
      headers: ['INCORPORADAS', 'VENDIDAS', 'EXISTENCIAS'],
      rows: [
        { cells: ['**51**', '**25**', '**26**'] },
        { cells: ['unidades', 'unidades', 'unidades'] },
      ],
    },
    {
      type: 'text',
      paragraphs: [
        'Las **26** unidades actuales están explicadas por el historial reconstruido. No se identifica una diferencia contable en los datos examinados.',
        '*Conclusión documental — no certifica existencia física ni motiva por sí sola los ajustes manuales.*',
      ],
    },

    // ── 1. CREACIÓN Y CARGAS ─────────────────────────────────────────
    {
      type: 'timeline',
      title: '1. ¿Cuándo se creó y cuándo recibió mercancía?',
      items: [
        {
          fecha: '04 JUN 2026',
          fase: '15:53:52',
          resultado:
            '● PRODUCTO CREADO · Carga inicial **+25** (mismo instante). Zona Gamer Margarita.',
        },
        {
          fecha: '04 JUN 2026',
          fase: '15:59:19',
          resultado:
            '● SEGUNDA CARGA · Ajuste manual **+25**. (+5 min 27 s). Zona Gamer Margarita.',
        },
        {
          fecha: '15 OCT 2026',
          fase: '16:48:51',
          resultado: '● ÚLTIMO AUMENTO · Ajuste manual **+1**. Zona Gamer Margarita.',
        },
      ],
    },
    {
      type: 'table',
      title: 'Detalle de incorporaciones (VE)',
      headers: ['Acontecimiento', 'Fecha y hora (Venezuela)', 'Unidades'],
      rows: [
        { cells: ['Creación del producto', '04/06/2026 · 3:53:52 p. m.', '—'] },
        { cells: ['Primera carga, al crearlo', '04/06/2026 · 3:53:52 p. m.', '**+25**'] },
        { cells: ['Segunda carga manual', '04/06/2026 · 3:59:19 p. m.', '**+25**'] },
        { cells: ['Último aumento manual', '15/10/2026 · 4:48:51 p. m.', '**+1**'] },
      ],
    },
    {
      type: 'text',
      paragraphs: [
        'El producto alcanzó **50 unidades** el mismo día de su creación en Zona Gamer Margarita. El 15 de octubre se sumó **+1** adicional.',
      ],
    },

    // ── 2. VENTAS ────────────────────────────────────────────────────
    {
      type: 'table',
      title: '2. ¿Cuántas veces se ha vendido?',
      description: 'Cifras primero. Detalle de facturas individuales: no incluido (sin inventar números).',
      headers: ['VENTAS COMPLETADAS', 'UNIDADES VENDIDAS'],
      rows: [
        { cells: ['**24**', '**25**'] },
        { cells: ['facturas', 'unidades'] },
      ],
    },
    {
      type: 'table',
      title: 'Ventas por sucursal',
      headers: ['Sucursal', 'Ventas', 'Unidades'],
      rows: [
        { cells: ['Tu Móvil Marino', '18', '18'] },
        { cells: ['Zona Gamer Margarita', '5', '5'] },
        { cells: ['Tu Móvil Store', '1', '2'] },
        { cells: ['**TOTAL**', '**24**', '**25**'] },
      ],
    },
    {
      type: 'text',
      paragraphs: [
        'Primera venta completed: **18/06/2026**. Última: **14/10/2026** (2 uds en Tu Móvil Store). Todas las facturas recuperadas están en estado **completed**. No se confunden con cancelaciones.',
      ],
    },

    // ── 3. OPERACIONES (nivel 1) + LEDGER (nivel 2) ──────────────────
    {
      type: 'text',
      title: '3. ¿Cuántas veces se ha ajustado o trasladado?',
      paragraphs: [
        'Hay que distinguir las **operaciones reales de negocio** de los **registros automáticos** del sistema.',
      ],
    },
    {
      type: 'table',
      title: 'Nivel 1 — Operaciones reales',
      description:
        'Restituciones: cancelaciones con descuento previo; efecto neto documentado = 0 en la reconstrucción global.',
      headers: ['Tipo de operación', 'Cantidad', 'Unidades involucradas'],
      rows: [
        { cells: ['Carga inicial', '1', '**+25**'] },
        { cells: ['Aumentos manuales', '2', '**+26**'] },
        { cells: ['Ventas completadas', '24', '**−25**'] },
        { cells: ['Traslados entre sucursales', '5', '**35**'] },
        { cells: ['Restituciones por cancelación', '2', '**+2**'] },
      ],
    },
    {
      type: 'text',
      paragraphs: [
        'Aumentos manuales: **4 jun (+25)** y **15 oct (+1)**.',
        '*Los ajustes automáticos que acompañan ventas, traslados y cancelaciones no deben sumarse como intervenciones manuales independientes.*',
      ],
    },
    {
      type: 'table',
      title: 'Nivel 2 — 79 registros de inventory_movements (técnico)',
      description:
        'Menor protagonismo: detalle del ledger. Los 10 TRANSFER = dos caras de 5 traslados reales. Los 43 ADJUST ≠ 43 ajustes manuales.',
      headers: ['Tipo de registro', 'Cantidad'],
      rows: [
        { cells: ['ADJUST', '43'] },
        { cells: ['OUT', '24'] },
        { cells: ['TRANSFER', '10'] },
        { cells: ['IN', '2'] },
        { cells: ['**TOTAL**', '**79**'] },
      ],
    },

    // ── 4. ÚLTIMO MOVIMIENTO ─────────────────────────────────────────
    {
      type: 'verdict',
      titulo: '4. Última operación registrada · 15 OCT 2026 · 5:59:24 p. m. (VE)',
      detalle: [
        '**TRASLADO DE 9 UNIDADES** — registrado como completado (`inventory_transfers` + `inventory_movements`).',
        'Ese mismo día, ~1 h 10 min antes, hubo el último aumento manual (+1).',
        '*Último evento identificado en las evidencias revisadas — no garantiza ausencia de movimientos posteriores a la consulta.*',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'table',
      title: 'Origen → Destino',
      description: 'Lectura visual del traslado (equivalente a tarjetas origen/destino).',
      headers: ['ZONA GAMER (ORIGEN)', '→', 'TU MÓVIL LA ISLA (DESTINO)'],
      rows: [
        { cells: ['**20 → 11**', '**9 uds**', '**0 → 9**'] },
        { cells: ['unidades', 'trasladadas', 'unidades'] },
      ],
    },

    // ── 5. DISTRIBUCIÓN (barras Unicode) ──────────────────────────────
    {
      type: 'table',
      title: '5. ¿Dónde terminaron las 26 unidades?',
      description:
        'Barras proporcionales al total 26 (1 bloque ≈ 1 unidad). Sin librerías nuevas.',
      headers: ['Sucursal', 'Distribución', 'Uds', '% del total'],
      rows: [
        {
          cells: [
            'Zona Gamer Margarita',
            barraStock(11),
            '**11**',
            pct(11),
          ],
        },
        {
          cells: ['Tu Móvil La Isla', barraStock(9), '**9**', pct(9)],
        },
        {
          cells: ['Tu Móvil Marino', barraStock(6), '**6**', pct(6)],
        },
        {
          cells: ['Tu Móvil Store', barraStock(0), '0', pct(0)],
        },
        {
          cells: ['Tu Móvil Centro', barraStock(0), '0', pct(0)],
        },
        {
          cells: ['**TOTAL**', '—', '**26**', '**100 %**'],
        },
      ],
    },

    // ── CONCLUSIÓN ───────────────────────────────────────────────────
    {
      type: 'text',
      title: 'Conclusión gerencial',
      paragraphs: [
        'El historial reconstruido explica las **26** unidades registradas actualmente.',
        'Desde el 4 de junio hasta el 15 de octubre de 2026: **24** ventas completed, **5** traslados, **2** aumentos manuales y **2** restituciones por cancelación.',
        'De **25** iniciales a **50** el día de creación; luego **+1** y **−25** vendidas → **26** en tres sucursales.',
      ],
    },
    {
      type: 'table',
      title: 'Conciliación matemática',
      headers: ['Concepto', 'Unidades'],
      rows: [
        { cells: ['Incorporadas', '**51**'] },
        { cells: ['Vendidas', '**−25**'] },
        { cells: ['Existencias', '**26**'] },
        { cells: ['Diferencia contable', '**0**'] },
      ],
    },
    {
      type: 'verdict',
      titulo: 'Veredicto',
      detalle: [
        '**No se identifica un faltante contable** en la reconstrucción histórica disponible.',
        '*Esta conclusión no sustituye un conteo físico ni verifica los motivos administrativos de los ajustes manuales.*',
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
