import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';
import { SLUG_AUDITORIA_HISTORICA_MR30G } from './auditoriaHistoricaRouterMercusysMr30gSku2259';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-10-16';
const PRODUCTO = 'router mercusys mr30g ac1200 4 antenas';
const SKU = '2259';
const PRODUCT_ID = '10cde05e-198e-40c2-a1ac-658086a453e3';

/**
 * Veredicto histórico gerencial — Router Mercusys MR30G.
 * Misma evidencia completa que la auditoría técnica; presentación visual.
 * Borrador: NO en registry.ts.
 */
export const SLUG_VEREDICTO_HISTORICO_MR30G =
  'veredicto-historico-router-mercusys-mr30g-2259-2026-10';

function barraStock(uds: number): string {
  if (uds <= 0) return '·';
  return '█'.repeat(uds);
}

function pct(uds: number): string {
  return `${((uds / 24) * 100).toFixed(1)} %`;
}

export const informeVeredictoHistoricoRouterMercusysMr30g: PublicInforme = {
  slug: SLUG_VEREDICTO_HISTORICO_MR30G,
  titulo: 'Veredicto histórico — Router Mercusys MR30G',
  subtitulo: 'TU MÓVIL POS · Auditoría de inventario',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'inventario',
  tags: ['inventario', 'mercusys', 'mr30g', 'veredicto', 'visual', SKU],
  relacionados: [INFORMES_CATALOGO_SLUG, SLUG_AUDITORIA_HISTORICA_MR30G],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Destinatario', value: 'Gerencia / operaciones de inventario' },
    { label: 'Producto', value: PRODUCTO },
    { label: 'SKU', value: SKU },
    { label: 'Product ID', value: PRODUCT_ID },
    { label: 'Creación (VE)', value: '20/05/2026 07:00:58' },
    { label: 'Catálogo products', value: 'USD 32 precio · USD 27 costo' },
    { label: 'Fecha informe', value: FECHA_INFORME },
    { label: 'Estado', value: 'Borrador — no publicado' },
  ],
  sections: [
    {
      type: 'hero',
      badge:
        'VEREDICTO HISTÓRICO · Router Mercusys MR30G · Misma investigación completa · Lectura gerencial',
    },

    // HERO métricas
    {
      type: 'table',
      title: 'Resultado en tres cifras',
      headers: ['INCORPORADAS', 'VENDIDAS', 'EN SISTEMA'],
      rows: [
        { cells: ['**32**', '**8**', '**24**'] },
        { cells: ['unidades', 'unidades', 'unidades'] },
      ],
    },
    {
      type: 'verdict',
      titulo: 'Conciliación contable: 0',
      detalle:
        '**32** − **8** = **24** (21 Zona Gamer + 3 Centro). Cuadra el sistema. **No** es certificación física.',
      ok: true,
    },

    // Cargas
    {
      type: 'timeline',
      title: 'Cargas y aumentos (America/Caracas)',
      items: [
        {
          fecha: '20/05/2026',
          fase: '07:00:58',
          resultado:
            'Carga inicial **+5** · ZG 0 → 5 · `23247662-757e-463f-9c3e-5f490c64609f`',
        },
        {
          fecha: '22/08/2026',
          fase: '11:35:49',
          resultado:
            'Aumento manual **+1** · ZG 0 → 1 · `b8068d54-b5b7-4cda-9d24-487f501031ff` *(eco ADJUST no sumar)*',
        },
        {
          fecha: '03/09/2026',
          fase: '21:16:32',
          resultado:
            'Aumento manual **+26** · ZG 0 → 26 · `5418a0ee-9f5c-443c-a244-9d094f617e74` *(eco ADJUST no sumar)*',
        },
      ],
    },
    {
      type: 'table',
      title: 'Diagrama destacado — 03/09/2026',
      description:
        'No afirma recepción física demostrada de 26 routers; solo el registro documental.',
      headers: ['Antes', '→', 'Después'],
      rows: [{ cells: ['**0**', '**+26**', '**26**'] }],
    },

    // Ventas 8/8
    {
      type: 'table',
      title: 'Ventas — 8 facturas / 8 unidades / USD 256 líneas',
      description: 'USD de línea ≠ utilidad. Sucursal según evidencia SQL.',
      headers: ['Fecha', 'Hora (VE)', 'Factura', 'Sucursal', 'Uds', 'USD'],
      rows: [
        {
          cells: [
            '28/05/2026',
            '12:56:30',
            'FAC-20260528-03972',
            'Zona Gamer Margarita',
            '1',
            '32',
          ],
        },
        {
          cells: [
            '25/07/2026',
            '15:20:29',
            'FAC-20260725-05660',
            'Zona Gamer Margarita',
            '1',
            '32',
          ],
        },
        {
          cells: [
            '21/08/2026',
            '10:14:41',
            'FAC-20260821-06474',
            'Zona Gamer Margarita',
            '1',
            '32',
          ],
        },
        {
          cells: [
            '22/08/2026',
            '11:40:18',
            'FAC-20260822-06513',
            'Zona Gamer Margarita',
            '1',
            '32',
          ],
        },
        {
          cells: [
            '01/09/2026',
            '12:45:54',
            'FAC-20260901-06756',
            'Tu Móvil Centro',
            '1',
            '32',
          ],
        },
        {
          cells: [
            '04/09/2026',
            '10:09:59',
            'FAC-20260904-06835',
            'Zona Gamer Margarita',
            '1',
            '32',
          ],
        },
        {
          cells: [
            '24/09/2026',
            '15:21:18',
            'FAC-20260924-07412',
            'Zona Gamer Margarita',
            '1',
            '32',
          ],
        },
        {
          cells: [
            '16/10/2026',
            '16:00:32',
            'FAC-20261016-08016',
            'Zona Gamer Margarita',
            '1',
            '32',
          ],
        },
        {
          cells: [
            '**TOTAL**',
            '—',
            '**8 FAC**',
            'ZG 7 · Centro 1',
            '**8**',
            '**256**',
          ],
        },
      ],
    },

    // Traslados
    {
      type: 'table',
      title: 'Traslados confirmados',
      headers: [
        'Fecha',
        'Hora (VE)',
        'Origen',
        'Destino',
        'Uds',
        'Stocks',
        'Transfer ID',
      ],
      rows: [
        {
          cells: [
            '20/05/2026',
            '11:21:24',
            'Zona Gamer',
            'Centro',
            '2',
            'ZG 5→3 · C 0→2',
            'e3ada9a0-9b8e-45dd-aae7-13470ec5a501',
          ],
        },
        {
          cells: [
            '26/09/2026',
            '09:34:33',
            'Zona Gamer',
            'Centro',
            '2',
            'ZG 24→22 · C 1→3',
            '4dc66b47-a9f4-4336-9983-5dadb09f92e1',
          ],
        },
      ],
    },

    // Cronología 12 — timeline + tabla (no omitir)
    {
      type: 'timeline',
      title: 'Cronología Zona Gamer — 12 operaciones',
      items: [
        {
          fecha: '20/05 07:00:58',
          fase: '+5',
          resultado: 'Carga inicial → saldo **5**',
        },
        {
          fecha: '20/05 11:21:24',
          fase: '−2',
          resultado: 'Traslado a Centro → saldo **3**',
        },
        {
          fecha: '28/05 12:56:30',
          fase: '−1',
          resultado: 'FAC-20260528-03972 → saldo **2**',
        },
        {
          fecha: '25/07 15:20:29',
          fase: '−1',
          resultado: 'FAC-20260725-05660 → saldo **1**',
        },
        {
          fecha: '21/08 10:14:41',
          fase: '−1',
          resultado: 'FAC-20260821-06474 → saldo **0**',
        },
        {
          fecha: '22/08 11:35:49',
          fase: '+1',
          resultado: 'Aumento manual → saldo **1**',
        },
        {
          fecha: '22/08 11:40:18',
          fase: '−1',
          resultado: 'FAC-20260822-06513 → saldo **0**',
        },
        {
          fecha: '03/09 21:16:32',
          fase: '+26',
          resultado: 'Aumento manual → saldo **26**',
        },
        {
          fecha: '04/09 10:09:59',
          fase: '−1',
          resultado: 'FAC-20260904-06835 → saldo **25**',
        },
        {
          fecha: '24/09 15:21:18',
          fase: '−1',
          resultado: 'FAC-20260924-07412 → saldo **24**',
        },
        {
          fecha: '26/09 09:34:33',
          fase: '−2',
          resultado: 'Traslado a Centro → saldo **22**',
        },
        {
          fecha: '16/10 16:00:32',
          fase: '−1',
          resultado: 'FAC-20261016-08016 → saldo **21**',
        },
      ],
    },
    {
      type: 'table',
      title: 'Misma cronología — tabla completa (12/12)',
      headers: ['Fecha y hora (VE)', 'Operación', 'Δ', 'Saldo'],
      rows: [
        { cells: ['20/05/2026 07:00:58', 'Carga inicial', '+5', '5'] },
        { cells: ['20/05/2026 11:21:24', 'Traslado a Centro', '-2', '3'] },
        {
          cells: [
            '28/05/2026 12:56:30',
            'Venta FAC-20260528-03972',
            '-1',
            '2',
          ],
        },
        {
          cells: [
            '25/07/2026 15:20:29',
            'Venta FAC-20260725-05660',
            '-1',
            '1',
          ],
        },
        {
          cells: [
            '21/08/2026 10:14:41',
            'Venta FAC-20260821-06474',
            '-1',
            '0',
          ],
        },
        {
          cells: [
            '22/08/2026 11:35:49',
            'Aumento manual',
            '+1',
            '1',
          ],
        },
        {
          cells: [
            '22/08/2026 11:40:18',
            'Venta FAC-20260822-06513',
            '-1',
            '0',
          ],
        },
        {
          cells: [
            '03/09/2026 21:16:32',
            'Aumento manual',
            '+26',
            '26',
          ],
        },
        {
          cells: [
            '04/09/2026 10:09:59',
            'Venta FAC-20260904-06835',
            '-1',
            '25',
          ],
        },
        {
          cells: [
            '24/09/2026 15:21:18',
            'Venta FAC-20260924-07412',
            '-1',
            '24',
          ],
        },
        {
          cells: [
            '26/09/2026 09:34:33',
            'Traslado a Centro',
            '-2',
            '22',
          ],
        },
        {
          cells: [
            '16/10/2026 16:00:32',
            'Venta FAC-20261016-08016',
            '-1',
            '21',
          ],
        },
      ],
    },

    // Ledger nota
    {
      type: 'text',
      title: 'Registros técnicos (sencillo)',
      paragraphs: [
        '**29** registros identificados en la consulta histórica de `inventory_movements`.',
        '*Desglose por tipo pendiente de verificación documental* (un conteo previo 15+8+4=27 no cuadra con 29 y no se usa).',
        'Operaciones reales: carga, aumentos, ventas y traslados. Los ecos automáticos no se suman como mercancía nueva.',
      ],
    },

    // Distribución
    {
      type: 'table',
      title: 'Distribución del inventario (24)',
      headers: ['Sucursal', 'Barra', 'Uds', '%'],
      rows: [
        {
          cells: ['Zona Gamer Margarita', barraStock(21), '**21**', pct(21)],
        },
        { cells: ['Tu Móvil Centro', barraStock(3), '**3**', pct(3)] },
        { cells: ['Otras (Isla / Marino / Store)', '·', '0', '0.0 %'] },
        { cells: ['**TOTAL**', '—', '**24**', '**100 %**'] },
      ],
    },

    // Conciliación
    {
      type: 'table',
      title: 'Conciliación contable',
      headers: ['Ámbito', 'Resultado', 'Diff'],
      rows: [
        { cells: ['Zona Gamer (+5+1+26−7−4)', '21 = 21', '**0**'] },
        { cells: ['Centro (+4−1)', '3 = 3', '**0**'] },
        { cells: ['Global (32−8)', '24 = 24', '**0**'] },
      ],
    },

    // Último movimiento
    {
      type: 'verdict',
      titulo: 'Último movimiento · 16/10/2026 16:00:32',
      detalle: [
        '**VENTA** · FAC-20261016-08016 · Zona Gamer · 1 ud · **22 → 21**.',
        '*Último movimiento del conjunto de datos examinado.*',
      ].join('\n\n'),
      ok: true,
    },

    // Físico
    {
      type: 'table',
      title: 'Discrepancia física informada — Zona Gamer',
      description: 'No certificada por SQL. No se afirma robo ni error demostrado.',
      headers: ['21 SISTEMA', '6 CONTEO INFORMADO', '15 DIFERENCIA'],
      rows: [
        { cells: ['**21**', '**6**', '**15**'] },
        { cells: ['unidades', 'unidades', 'unidades'] },
      ],
    },

    // Conclusión
    {
      type: 'verdict',
      titulo: 'Conclusión gerencial',
      detalle: [
        'El historial del Router Mercusys MR30G explica las **24** unidades registradas en TU MÓVIL POS: **21** en Zona Gamer Margarita y **3** en Tu Móvil Centro.',
        'La conciliación contable reconstruida presenta una diferencia de **cero** unidades.',
        'Sin embargo, el conteo físico informado para Zona Gamer Margarita es de **6** unidades frente a las **21** registradas, generando una discrepancia aparente de **15** unidades cuya causa no está determinada.',
        'El aumento manual de **26** unidades del **3 de septiembre de 2026** es el evento de mayor impacto en el historial, pero no existe evidencia suficiente para afirmar que haya sido incorrecto o que explique por sí solo la discrepancia física.',
      ].join('\n\n'),
      ok: false,
    },
    {
      type: 'links',
      title: 'Misma investigación — formato técnico',
      items: [
        {
          label: 'Auditoría histórica técnica (IDs y fuentes)',
          href: `/informe/${SLUG_AUDITORIA_HISTORICA_MR30G}`,
        },
        { label: 'Catálogo de informes', href: '/informes' },
      ],
    },
  ],
};

export const ALL_VEREDICTO_HISTORICO_MR30G_INFORMES: PublicInforme[] = [
  informeVeredictoHistoricoRouterMercusysMr30g,
];
