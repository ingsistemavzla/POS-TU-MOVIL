import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-10-16';
const PRODUCTO = 'router mercusys mr30g ac1200 4 antenas';
const SKU = '2259';
const PRODUCT_ID = '10cde05e-198e-40c2-a1ac-658086a453e3';

const SLUG_VEREDICTO =
  'veredicto-historico-router-mercusys-mr30g-2259-2026-10';

/**
 * Auditoría histórica técnica — Router Mercusys MR30G.
 * Evidencia SQL certificada. Borrador: NO en registry.ts.
 */
export const SLUG_AUDITORIA_HISTORICA_MR30G =
  'auditoria-historica-router-mercusys-mr30g-2259-2026-10';

export const informeAuditoriaHistoricaRouterMercusysMr30g: PublicInforme = {
  slug: SLUG_AUDITORIA_HISTORICA_MR30G,
  titulo: 'Router Mercusys MR30G — Auditoría histórica de inventario',
  subtitulo:
    'Evidencia documental completa (America/Caracas): cargas, 8 facturas, 2 traslados, cronología ZG, conciliación y discrepancia física informada.',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'inventario',
  tags: ['inventario', 'mercusys', 'mr30g', 'auditoria', 'tecnica', SKU],
  relacionados: [INFORMES_CATALOGO_SLUG, SLUG_VEREDICTO],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Destinatario', value: 'Gerencia / operaciones de inventario' },
    { label: 'Producto', value: PRODUCTO },
    { label: 'SKU', value: SKU },
    { label: 'Product ID', value: PRODUCT_ID },
    { label: 'Creación (VE)', value: '20/05/2026 07:00:58' },
    { label: 'Fecha informe', value: FECHA_INFORME },
    { label: 'Estado', value: 'Borrador — no publicado' },
  ],
  sections: [
    {
      type: 'hero',
      badge: 'Auditoría técnica · Evidencia SQL · Router Mercusys MR30G',
    },
    {
      type: 'verdict',
      titulo: 'Dictamen: contable 0 · discrepancia física informada 15 (Zona Gamer)',
      detalle: [
        'El historial del Router Mercusys MR30G explica las **24** unidades registradas en TU MÓVIL POS: **21** en Zona Gamer Margarita y **3** en Tu Móvil Centro.',
        'La conciliación contable reconstruida presenta una diferencia de **cero** unidades.',
        'Sin embargo, el conteo físico informado para Zona Gamer Margarita es de **6** unidades frente a las **21** registradas, generando una discrepancia aparente de **15** unidades cuya causa no está determinada.',
        'El aumento manual de **26** unidades del **3 de septiembre de 2026** es el evento de mayor impacto en el historial, pero no existe evidencia suficiente para afirmar que haya sido incorrecto o que explique por sí solo la discrepancia física.',
      ].join('\n\n'),
      ok: false,
    },

    // 1. Identificación
    {
      type: 'table',
      title: '1. Identificación del producto',
      headers: ['Campo', 'Valor'],
      rows: [
        { cells: ['Producto', 'Router Mercusys MR30G AC1200, 4 antenas'] },
        { cells: ['SKU', SKU] },
        { cells: ['Product ID', PRODUCT_ID] },
        {
          cells: ['Creación (America/Caracas)', '20/05/2026 07:00:58'],
        },
        {
          cells: [
            'Precio catálogo (products)',
            'USD 32 — no equivale a precio histórico de todas las operaciones',
          ],
        },
        {
          cells: [
            'Costo registrado (products)',
            'USD 27 — no equivale a costo histórico temporal sin evidencia',
          ],
        },
      ],
    },

    // 2. Fuentes
    {
      type: 'text',
      title: '2. Fuentes y alcance',
      paragraphs: [
        'Fuentes: `products`, `inventories`, `inventory_movements`, `inventory_transfers`, `sales`, `sale_items`.',
        'Zona horaria: **America/Caracas** (UTC−4). Sin datos personales de clientes.',
        'Sin escritura en base de datos. Sin conteo físico certificado por SQL.',
      ],
    },

    // 3–4. Cargas
    {
      type: 'table',
      title: '3–4. Carga inicial y aumentos manuales',
      description:
        'Registros automáticos asociados a aumentos manuales NO se cuentan como incorporaciones independientes. El +26 no demuestra por sí solo recepción física de 26 routers.',
      headers: [
        'Fecha',
        'Hora (VE)',
        'Operación',
        'Sucursal',
        'Δ',
        'Antes → Después',
        'Movimiento',
      ],
      rows: [
        {
          cells: [
            '20/05/2026',
            '07:00:58',
            'Carga inicial al crear producto',
            'Zona Gamer Margarita',
            '+5',
            '0 → 5',
            '23247662-757e-463f-9c3e-5f490c64609f',
          ],
        },
        {
          cells: [
            '22/08/2026',
            '11:35:49',
            'Aumento manual',
            'Zona Gamer Margarita',
            '+1',
            '0 → 1',
            'b8068d54-b5b7-4cda-9d24-487f501031ff',
          ],
        },
        {
          cells: [
            '03/09/2026',
            '21:16:32',
            'Aumento manual',
            'Zona Gamer Margarita',
            '+26',
            '0 → 26',
            '5418a0ee-9f5c-443c-a244-9d094f617e74',
          ],
        },
        {
          cells: [
            'TOTAL',
            '—',
            '1 carga + 2 aumentos',
            '—',
            '**+32**',
            '5 + 27',
            '—',
          ],
        },
      ],
    },
    {
      type: 'table',
      title: 'Diagrama — aumento 03/09/2026',
      headers: ['Antes', 'Operación', 'Después'],
      rows: [{ cells: ['**0**', '**+26**', '**26**'] }],
    },

    // 5. Ventas
    {
      type: 'table',
      title: '5. Ocho ventas completed — detalle individual',
      description:
        'Sucursal conforme a evidencia SQL validada. Coinciden con 8 OUT. USD = subtotal de línea, no utilidad.',
      headers: [
        'Fecha',
        'Hora (VE)',
        'Factura',
        'Sucursal',
        'Uds',
        'USD',
        'Estado',
      ],
      rows: [
        {
          cells: [
            '28/05/2026',
            '12:56:30',
            'FAC-20260528-03972',
            'Zona Gamer Margarita',
            '1',
            '32',
            'completed',
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
            'completed',
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
            'completed',
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
            'completed',
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
            'completed',
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
            'completed',
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
            'completed',
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
            'completed',
          ],
        },
        {
          cells: [
            '**TOTAL**',
            '—',
            '**8 facturas**',
            'ZG 7 · Centro 1',
            '**8**',
            '**256**',
            'completed',
          ],
        },
      ],
    },

    // 6. Traslados
    {
      type: 'table',
      title: '6. Dos traslados confirmados',
      description:
        'No sumar dos veces entradas/salidas/ADJUST automáticos del ledger.',
      headers: [
        'Fecha',
        'Hora (VE)',
        'Origen → Destino',
        'Uds',
        'Stock origen',
        'Stock destino',
        'Transfer ID',
        'Estado',
      ],
      rows: [
        {
          cells: [
            '20/05/2026',
            '11:21:24',
            'Zona Gamer → Centro',
            '2',
            '5 → 3',
            '0 → 2',
            'e3ada9a0-9b8e-45dd-aae7-13470ec5a501',
            'completed',
          ],
        },
        {
          cells: [
            '26/09/2026',
            '09:34:33',
            'Zona Gamer → Centro',
            '2',
            '24 → 22',
            '1 → 3',
            '4dc66b47-a9f4-4336-9983-5dadb09f92e1',
            'completed',
          ],
        },
        {
          cells: [
            'TOTAL',
            '—',
            '2 traslados',
            '**4**',
            '—',
            '—',
            '—',
            'completed',
          ],
        },
      ],
    },

    // 7. Cronología ZG
    {
      type: 'table',
      title: '7. Cronología completa Zona Gamer — 12 operaciones reales',
      description: 'America/Caracas. Sin registros automáticos como ops independientes.',
      headers: [
        'Fecha y hora (VE)',
        'Operación',
        'Factura / ref.',
        'Δ',
        'Saldo ZG',
      ],
      rows: [
        {
          cells: [
            '20/05/2026 07:00:58',
            'Carga inicial',
            'stock inicial',
            '+5',
            '5',
          ],
        },
        {
          cells: [
            '20/05/2026 11:21:24',
            'Traslado a Centro',
            'e3ada9a0-…',
            '-2',
            '3',
          ],
        },
        {
          cells: [
            '28/05/2026 12:56:30',
            'Venta',
            'FAC-20260528-03972',
            '-1',
            '2',
          ],
        },
        {
          cells: [
            '25/07/2026 15:20:29',
            'Venta',
            'FAC-20260725-05660',
            '-1',
            '1',
          ],
        },
        {
          cells: [
            '21/08/2026 10:14:41',
            'Venta',
            'FAC-20260821-06474',
            '-1',
            '0',
          ],
        },
        {
          cells: [
            '22/08/2026 11:35:49',
            'Aumento manual',
            'b8068d54-…',
            '+1',
            '1',
          ],
        },
        {
          cells: [
            '22/08/2026 11:40:18',
            'Venta',
            'FAC-20260822-06513',
            '-1',
            '0',
          ],
        },
        {
          cells: [
            '03/09/2026 21:16:32',
            'Aumento manual',
            '5418a0ee-…',
            '+26',
            '26',
          ],
        },
        {
          cells: [
            '04/09/2026 10:09:59',
            'Venta',
            'FAC-20260904-06835',
            '-1',
            '25',
          ],
        },
        {
          cells: [
            '24/09/2026 15:21:18',
            'Venta',
            'FAC-20260924-07412',
            '-1',
            '24',
          ],
        },
        {
          cells: [
            '26/09/2026 09:34:33',
            'Traslado a Centro',
            '4dc66b47-…',
            '-2',
            '22',
          ],
        },
        {
          cells: [
            '16/10/2026 16:00:32',
            'Venta',
            'FAC-20261016-08016',
            '-1',
            '21',
          ],
        },
      ],
    },

    // 8. Ledger
    {
      type: 'text',
      title: '8. Distinción: operaciones reales vs registros técnicos',
      paragraphs: [
        '**Operaciones reales de negocio:** 1 carga inicial, 2 aumentos manuales, 8 ventas, 2 traslados.',
        '**Registros técnicos:** 29 registros identificados en la consulta histórica de `inventory_movements`.',
        '**Desglose por tipo:** pendiente de verificación documental. Un desglose previo (15 ADJUST + 8 OUT + 4 TRANSFER = 27) **no cuadra con 29** y **no** se usa como hecho certificado. No se inventan los dos registros faltantes.',
        'Los OUT corresponden a ventas; los TRANSFER cubren lados de traslados; los ADJUST incluyen cargas y auditorías automáticas. Los automáticos **no** son operaciones manuales adicionales.',
        'La conciliación **32 − 8 = 24** no depende de inventar ese desglose.',
      ],
    },

    // 9. Conciliación
    {
      type: 'table',
      title: '9. Conciliación por sucursal',
      headers: ['Ámbito', 'Fórmula', 'Calculado', 'Registrado', 'Diff contable'],
      rows: [
        {
          cells: [
            'Zona Gamer Margarita',
            '+5 +1 +26 −7 ventas −4 traslados',
            '21',
            '21',
            '**0**',
          ],
        },
        {
          cells: [
            'Tu Móvil Centro',
            '+4 recibidas −1 venta',
            '3',
            '3',
            '**0**',
          ],
        },
        {
          cells: [
            'Global',
            '32 incorporadas − 8 vendidas',
            '24',
            '24',
            '**0**',
          ],
        },
      ],
    },
    {
      type: 'table',
      title: 'Existencias sistema',
      headers: ['Sucursal', 'Stock'],
      rows: [
        { cells: ['Zona Gamer Margarita', '21'] },
        { cells: ['Tu Móvil Centro', '3'] },
        { cells: ['Tu Móvil La Isla', '0'] },
        { cells: ['Tu Móvil Marino', '0'] },
        { cells: ['Tu Móvil Store', '0'] },
        { cells: ['**TOTAL**', '**24**'] },
      ],
    },

    // 10. Último movimiento
    {
      type: 'verdict',
      titulo: '10. Último movimiento del conjunto examinado',
      detalle: [
        '**16/10/2026 16:00:32** · Venta completed · **FAC-20261016-08016**',
        'Zona Gamer Margarita · 1 unidad · stock **22 → 21**.',
        '*Último movimiento del conjunto de datos examinado.*',
      ].join('\n\n'),
      ok: true,
    },

    // 11. Físico
    {
      type: 'table',
      title: '11. Discrepancia física informada — Zona Gamer',
      description:
        'Conteo informado por el usuario; no certificado por SQL. No se afirma robo, extravío demostrado, error de digitación ni que el +26 sea incorrecto.',
      headers: ['EN SISTEMA', 'CONTEO INFORMADO', 'DIFERENCIA'],
      rows: [
        { cells: ['**21**', '**6**', '**15**'] },
        { cells: ['unidades', 'unidades', 'unidades'] },
      ],
    },

    // 12. Limitaciones
    {
      type: 'text',
      title: '12. Limitaciones probatorias',
      paragraphs: [
        'El +26 del 03/09 es evento documental importante, no explicación causal demostrada de la brecha física.',
        'No se atribuyen automáticamente las 15 unidades al aumento de 26.',
        'Desglose por tipo de los 29 registros del ledger: pendiente de verificación (no inventado).',
        'USD 256 = suma de líneas facturadas, no margen.',
      ],
    },

    // 13. Dictamen
    {
      type: 'verdict',
      titulo: '13. Dictamen técnico / veredicto documental',
      detalle: [
        'El historial del Router Mercusys MR30G explica las **24** unidades registradas en TU MÓVIL POS: **21** en Zona Gamer Margarita y **3** en Tu Móvil Centro.',
        'La conciliación contable reconstruida presenta una diferencia de **cero** unidades.',
        'Sin embargo, el conteo físico informado para Zona Gamer Margarita es de **6** unidades frente a las **21** registradas, generando una discrepancia aparente de **15** unidades cuya causa no está determinada.',
        'El aumento manual de **26** unidades del **3 de septiembre de 2026** es el evento de mayor impacto en el historial, pero no existe evidencia suficiente para afirmar que haya sido incorrecto o que explique por sí solo la discrepancia física.',
      ].join('\n\n'),
      ok: false,
    },
    {
      type: 'code',
      title: 'Identificadores confirmados',
      language: 'text',
      code: [
        `SKU ${SKU} · ${PRODUCT_ID}`,
        'Carga: 23247662-757e-463f-9c3e-5f490c64609f',
        '+1: b8068d54-b5b7-4cda-9d24-487f501031ff',
        '+26: 5418a0ee-9f5c-443c-a244-9d094f617e74',
        'T1: e3ada9a0-9b8e-45dd-aae7-13470ec5a501',
        'T2: 4dc66b47-a9f4-4336-9983-5dadb09f92e1',
        'Última FAC: FAC-20261016-08016',
        'Ledger: 29 filas — desglose por tipo pendiente',
      ].join('\n'),
    },
    {
      type: 'links',
      title: 'Misma investigación — formato gerencial',
      items: [
        {
          label: 'Veredicto histórico visual MR30G',
          href: `/informe/${SLUG_VEREDICTO}`,
        },
        { label: 'Catálogo de informes', href: '/informes' },
      ],
    },
  ],
};

export const ALL_AUDITORIA_HISTORICA_MR30G_INFORMES: PublicInforme[] = [
  informeAuditoriaHistoricaRouterMercusysMr30g,
];
