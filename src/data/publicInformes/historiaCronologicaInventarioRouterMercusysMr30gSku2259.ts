import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-10-16';
const PRODUCTO = 'router mercusys mr30g ac1200 4 antenas';
const SKU = '2259';
const PRODUCT_ID = '10cde05e-198e-40c2-a1ac-658086a453e3';

const SLUG_AUDITORIA =
  'auditoria-historica-router-mercusys-mr30g-2259-2026-10';
const SLUG_VEREDICTO =
  'veredicto-historico-router-mercusys-mr30g-2259-2026-10';

/**
 * Tercer informe Mercusys — historia narrativa operación por operación.
 * No modifica los otros dos informes. Borrador local vía registry.
 */
export const SLUG_HISTORIA_CRONOLOGICA_MR30G =
  'historia-cronologica-inventario-router-mercusys-mr30g-2259-2026-10';

/** Evolución saldo ZG (máx 26) — 1 bloque ≈ 1 unidad. */
function barraSaldo(uds: number): string {
  if (uds <= 0) return '·';
  return '█'.repeat(Math.min(uds, 26));
}

export const informeHistoriaCronologicaInventarioRouterMercusysMr30g: PublicInforme =
  {
    slug: SLUG_HISTORIA_CRONOLOGICA_MR30G,
    titulo: 'Historia cronológica del inventario — Router Mercusys MR30G',
    subtitulo:
      'Libro de movimientos: cómo evolucionó el stock operación por operación (SKU 2259).',
    fecha: FECHA_INFORME,
    estado: 'referencia',
    categoria: 'inventario',
    tags: [
      'inventario',
      'mercusys',
      'mr30g',
      'historia',
      'cronologia',
      'narrativa',
      SKU,
    ],
    relacionados: [INFORMES_CATALOGO_SLUG, SLUG_AUDITORIA, SLUG_VEREDICTO],
    meta: [
      { label: 'Empresa', value: COMPANY },
      { label: 'Destinatario', value: 'Gerencia / operaciones de inventario' },
      { label: 'Producto', value: PRODUCTO },
      { label: 'SKU', value: SKU },
      { label: 'Product ID', value: PRODUCT_ID },
      { label: 'Enfoque', value: 'Zona Gamer (12 ops) + Centro (3 ops)' },
      { label: 'Fecha informe', value: FECHA_INFORME },
    ],
    sections: [
      {
        type: 'hero',
        badge:
          'HISTORIA DEL INVENTARIO · Router Mercusys MR30G · SKU 2259 · Lectura gerencial',
      },
      {
        type: 'verdict',
        titulo: 'Saldo final en Zona Gamer: 21 unidades',
        detalle: [
          '**12 operaciones** reconstruidas en Zona Gamer Margarita, desde la carga inicial hasta la última venta identificada.',
          'Tu Móvil Centro: **3 operaciones** de negocio → saldo final **3**. Total sistema: **24** (diff contable **0**).',
        ].join('\n\n'),
        ok: true,
      },
      {
        type: 'table',
        title: 'Cierre contable (misma investigación)',
        headers: ['Concepto', 'Unidades'],
        rows: [
          { cells: ['Incorporadas', '**32**'] },
          { cells: ['Vendidas', '**8**'] },
          { cells: ['Zona Gamer (sistema)', '**21**'] },
          { cells: ['Centro (sistema)', '**3**'] },
          { cells: ['Total sistema', '**24**'] },
          { cells: ['Diff contable', '**0**'] },
          {
            cells: [
              'Conteo físico informado ZG',
              '6 → diff aparente 15 (no certificada)',
            ],
          },
        ],
      },
      {
        type: 'text',
        title: 'Cómo leer este informe',
        paragraphs: [
          'Cada bloque cuenta **qué pasó**, **cuándo** (hora Venezuela), **cuántas unidades**, el **saldo antes y después**, y la **factura o transferencia**.',
          'Los registros automáticos del ledger no se narran como operaciones independientes.',
          'El aumento **+26** es un registro documental; no afirma por sí solo recepción física de 26 routers.',
        ],
      },

      // ── Resumen narrativo continuo ──
      {
        type: 'text',
        title: 'La historia en una sola lectura',
        paragraphs: [
          'El **20 de mayo de 2026** se registraron inicialmente **5** unidades en Zona Gamer. Ese mismo día se trasladaron **2** a Tu Móvil Centro, por lo que quedaron **3** disponibles. El **28 de mayo** se vendió 1 unidad (FAC-20260528-03972) y el saldo bajó de 3 a 2. El **25 de julio** otra venta (FAC-20260725-05660) dejó el saldo en 1. El **21 de agosto** (FAC-20260821-06474) se vendió la última unidad y el inventario **llegó a cero**.',
          'El **22 de agosto** se registró un aumento manual de **+1** y, minutos después, esa unidad se vendió (FAC-20260822-06513): otra vez **agotado**. El **3 de septiembre** se incorporaron **26** unidades (0 → 26). Luego hubo ventas el 4 y el 24 de septiembre, un traslado de 2 a Centro el 26 de septiembre, y la última venta el **16 de octubre** (FAC-20261016-08016), dejando **21** en Zona Gamer.',
          'En **Centro**, el 20 de mayo se recibieron 2; el 1 de septiembre se vendió 1 (FAC-20260901-06756); el 26 de septiembre llegaron otras 2. **Saldo final Centro: 3**.',
        ],
      },

      // ── ZONA GAMER — timeline narrativo ──
      {
        type: 'timeline',
        title: 'Zona Gamer Margarita — 12 operaciones (libro de movimientos)',
        items: [
          {
            fecha: '20 MAY 2026 · 07:00:58',
            fase: 'Carga inicial · +5',
            resultado:
              'Se registraron 5 unidades al crear el producto. Saldo: **0 → 5**.',
          },
          {
            fecha: '20 MAY 2026 · 11:21:24',
            fase: 'Traslado a Centro · −2',
            resultado:
              'Se enviaron 2 unidades a Tu Móvil Centro (transf. e3ada9a0…). Saldo: **5 → 3**.',
          },
          {
            fecha: '28 MAY 2026 · 12:56:30',
            fase: 'Venta · −1',
            resultado:
              'Factura FAC-20260528-03972. Se vendió 1 unidad. Saldo: **3 → 2**.',
          },
          {
            fecha: '25 JUL 2026 · 15:20:29',
            fase: 'Venta · −1',
            resultado:
              'Factura FAC-20260725-05660. Se vendió 1 unidad. Saldo: **2 → 1**.',
          },
          {
            fecha: '21 AGO 2026 · 10:14:41',
            fase: 'Venta — AGOTADO · −1',
            resultado:
              'Factura FAC-20260821-06474. Se vendió la última unidad disponible. Saldo: **1 → 0**. ★ Inventario agotado.',
          },
          {
            fecha: '22 AGO 2026 · 11:35:49',
            fase: 'Aumento manual · +1',
            resultado:
              'Se registró 1 unidad adicional (reposición documentada). Saldo: **0 → 1**.',
          },
          {
            fecha: '22 AGO 2026 · 11:40:18',
            fase: 'Venta — AGOTADO · −1',
            resultado:
              'Factura FAC-20260822-06513. Se vendió la unidad recién registrada. Saldo: **1 → 0**. ★ Inventario agotado otra vez.',
          },
          {
            fecha: '03 SEP 2026 · 21:16:32',
            fase: 'Aumento manual · +26',
            resultado:
              'Se registraron 26 unidades adicionales (evento de mayor impacto). Saldo: **0 → 26**. No afirma recepción física demostrada.',
          },
          {
            fecha: '04 SEP 2026 · 10:09:59',
            fase: 'Venta · −1',
            resultado:
              'Factura FAC-20260904-06835. Se vendió 1 unidad. Saldo: **26 → 25**.',
          },
          {
            fecha: '24 SEP 2026 · 15:21:18',
            fase: 'Venta · −1',
            resultado:
              'Factura FAC-20260924-07412. Se vendió 1 unidad. Saldo: **25 → 24**.',
          },
          {
            fecha: '26 SEP 2026 · 09:34:33',
            fase: 'Traslado a Centro · −2',
            resultado:
              'Se enviaron 2 unidades a Tu Móvil Centro (transf. 4dc66b47…). Saldo: **24 → 22**.',
          },
          {
            fecha: '16 OCT 2026 · 16:00:32',
            fase: 'Venta · −1',
            resultado:
              'Factura FAC-20261016-08016. Última operación identificada. Saldo: **22 → 21**.',
          },
        ],
      },
      {
        type: 'table',
        title: 'Zona Gamer — detalle saldos (antes → después)',
        headers: [
          'Fecha y hora (VE)',
          'Operación',
          'Δ',
          'Antes',
          'Después',
          'Evolución',
        ],
        rows: [
          {
            cells: [
              '20/05/2026 07:00:58',
              'Carga inicial',
              '+5',
              '0',
              '5',
              barraSaldo(5),
            ],
          },
          {
            cells: [
              '20/05/2026 11:21:24',
              'Traslado a Centro',
              '-2',
              '5',
              '3',
              barraSaldo(3),
            ],
          },
          {
            cells: [
              '28/05/2026 12:56:30',
              'Venta FAC-20260528-03972',
              '-1',
              '3',
              '2',
              barraSaldo(2),
            ],
          },
          {
            cells: [
              '25/07/2026 15:20:29',
              'Venta FAC-20260725-05660',
              '-1',
              '2',
              '1',
              barraSaldo(1),
            ],
          },
          {
            cells: [
              '21/08/2026 10:14:41',
              'Venta FAC-20260821-06474 ★ AGOTADO',
              '-1',
              '1',
              '0',
              '·',
            ],
          },
          {
            cells: [
              '22/08/2026 11:35:49',
              'Aumento manual',
              '+1',
              '0',
              '1',
              barraSaldo(1),
            ],
          },
          {
            cells: [
              '22/08/2026 11:40:18',
              'Venta FAC-20260822-06513 ★ AGOTADO',
              '-1',
              '1',
              '0',
              '·',
            ],
          },
          {
            cells: [
              '03/09/2026 21:16:32',
              'Aumento manual',
              '+26',
              '0',
              '26',
              barraSaldo(26),
            ],
          },
          {
            cells: [
              '04/09/2026 10:09:59',
              'Venta FAC-20260904-06835',
              '-1',
              '26',
              '25',
              barraSaldo(25),
            ],
          },
          {
            cells: [
              '24/09/2026 15:21:18',
              'Venta FAC-20260924-07412',
              '-1',
              '25',
              '24',
              barraSaldo(24),
            ],
          },
          {
            cells: [
              '26/09/2026 09:34:33',
              'Traslado a Centro',
              '-2',
              '24',
              '22',
              barraSaldo(22),
            ],
          },
          {
            cells: [
              '16/10/2026 16:00:32',
              'Venta FAC-20261016-08016',
              '-1',
              '22',
              '21',
              barraSaldo(21),
            ],
          },
        ],
      },
      {
        type: 'verdict',
        titulo: 'Agotamientos y reposiciones en Zona Gamer',
        detalle: [
          '★ **21/08/2026 10:14:41** — saldo **0** (última unidad vendida).',
          '★ **22/08/2026 11:40:18** — saldo **0** otra vez (vendida la unidad del +1).',
          'Reposiciones documentadas: **22/08 +1** y **03/09 +26**.',
        ].join('\n\n'),
        ok: false,
      },

      // ── CENTRO — 3 ops ──
      {
        type: 'timeline',
        title: 'Tu Móvil Centro — 3 operaciones de negocio',
        items: [
          {
            fecha: '20 MAY 2026 · 11:21:24',
            fase: 'Entrada por traslado · +2',
            resultado:
              'Recibe 2 unidades desde Zona Gamer (transf. e3ada9a0…). Saldo: **0 → 2**.',
          },
          {
            fecha: '01 SEP 2026 · 12:45:54',
            fase: 'Venta · −1',
            resultado:
              'Factura FAC-20260901-06756. Se vendió 1 unidad. Saldo: **2 → 1**.',
          },
          {
            fecha: '26 SEP 2026 · 09:34:33',
            fase: 'Entrada por traslado · +2',
            resultado:
              'Recibe otras 2 unidades desde Zona Gamer (transf. 4dc66b47…). Saldo: **1 → 3**.',
          },
        ],
      },
      {
        type: 'table',
        title: 'Centro — saldos',
        headers: ['Fecha y hora (VE)', 'Operación', 'Δ', 'Antes', 'Después'],
        rows: [
          {
            cells: [
              '20/05/2026 11:21:24',
              'Recibe traslado (e3ada9a0…)',
              '+2',
              '0',
              '2',
            ],
          },
          {
            cells: [
              '01/09/2026 12:45:54',
              'Venta FAC-20260901-06756',
              '-1',
              '2',
              '1',
            ],
          },
          {
            cells: [
              '26/09/2026 09:34:33',
              'Recibe traslado (4dc66b47…)',
              '+2',
              '1',
              '3',
            ],
          },
        ],
      },
      {
        type: 'text',
        paragraphs: [
          'Resultado final Centro: **3 unidades**. Son **tres** operaciones de negocio (no cuatro). Los traslados no se cuentan dos veces en la conciliación global.',
        ],
      },

      // ── Tabla global (sin doble contar traslado) ──
      {
        type: 'table',
        title: 'Cronología global (ambas sucursales — un traslado = un evento)',
        description:
          'Ordenada por fecha. En traslados se indica efecto ZG y Centro en la misma fila.',
        headers: ['Fecha y hora (VE)', 'Sucursal / efecto', 'Operación', 'Δ'],
        rows: [
          {
            cells: [
              '20/05/2026 07:00:58',
              'Zona Gamer',
              'Carga inicial',
              '+5',
            ],
          },
          {
            cells: [
              '20/05/2026 11:21:24',
              'ZG −2 · Centro +2',
              'Traslado ZG → Centro',
              '2 uds',
            ],
          },
          {
            cells: [
              '28/05/2026 12:56:30',
              'Zona Gamer',
              'FAC-20260528-03972',
              '-1',
            ],
          },
          {
            cells: [
              '25/07/2026 15:20:29',
              'Zona Gamer',
              'FAC-20260725-05660',
              '-1',
            ],
          },
          {
            cells: [
              '21/08/2026 10:14:41',
              'Zona Gamer',
              'FAC-20260821-06474 (agotado)',
              '-1',
            ],
          },
          {
            cells: [
              '22/08/2026 11:35:49',
              'Zona Gamer',
              'Aumento manual',
              '+1',
            ],
          },
          {
            cells: [
              '22/08/2026 11:40:18',
              'Zona Gamer',
              'FAC-20260822-06513 (agotado)',
              '-1',
            ],
          },
          {
            cells: [
              '01/09/2026 12:45:54',
              'Centro',
              'FAC-20260901-06756',
              '-1',
            ],
          },
          {
            cells: [
              '03/09/2026 21:16:32',
              'Zona Gamer',
              'Aumento manual',
              '+26',
            ],
          },
          {
            cells: [
              '04/09/2026 10:09:59',
              'Zona Gamer',
              'FAC-20260904-06835',
              '-1',
            ],
          },
          {
            cells: [
              '24/09/2026 15:21:18',
              'Zona Gamer',
              'FAC-20260924-07412',
              '-1',
            ],
          },
          {
            cells: [
              '26/09/2026 09:34:33',
              'ZG −2 · Centro +2',
              'Traslado ZG → Centro',
              '2 uds',
            ],
          },
          {
            cells: [
              '16/10/2026 16:00:32',
              'Zona Gamer',
              'FAC-20261016-08016',
              '-1',
            ],
          },
        ],
      },

      // ── Gráfico evolución ZG ──
      {
        type: 'table',
        title: 'Evolución del saldo Zona Gamer (después de cada operación)',
        headers: ['Paso', 'Saldo', 'Barra'],
        rows: [
          { cells: ['Tras carga inicial', '5', barraSaldo(5)] },
          { cells: ['Tras 1.er traslado', '3', barraSaldo(3)] },
          { cells: ['Tras venta 28/05', '2', barraSaldo(2)] },
          { cells: ['Tras venta 25/07', '1', barraSaldo(1)] },
          { cells: ['Tras venta 21/08', '0 ★', '·'] },
          { cells: ['Tras +1 (22/08)', '1', barraSaldo(1)] },
          { cells: ['Tras venta 22/08', '0 ★', '·'] },
          { cells: ['Tras +26 (03/09)', '26', barraSaldo(26)] },
          { cells: ['Tras venta 04/09', '25', barraSaldo(25)] },
          { cells: ['Tras venta 24/09', '24', barraSaldo(24)] },
          { cells: ['Tras 2.º traslado', '22', barraSaldo(22)] },
          { cells: ['Tras venta 16/10 (final)', '**21**', barraSaldo(21)] },
        ],
      },

      {
        type: 'verdict',
        titulo: 'Conciliación final',
        detalle: [
          'Zona Gamer **21** · Centro **3** · Total sistema **24**. Incorporadas **32** · Vendidas **8** · Diff contable **0**.',
          'Conteo físico informado en Zona Gamer: **6** → diferencia aparente **15**. No se presenta como robo, pérdida comprobada ni error demostrado.',
          'Los aumentos manuales no prueban por sí solos una recepción física.',
        ].join('\n\n'),
        ok: true,
      },
      {
        type: 'links',
        title: 'Misma investigación — otros formatos',
        items: [
          {
            label: 'Auditoría histórica técnica',
            href: `/informe/${SLUG_AUDITORIA}`,
          },
          {
            label: 'Veredicto histórico gerencial',
            href: `/informe/${SLUG_VEREDICTO}`,
          },
          { label: 'Catálogo de informes', href: '/informes' },
        ],
      },
    ],
  };

export const ALL_HISTORIA_CRONOLOGICA_MR30G_INFORMES: PublicInforme[] = [
  informeHistoriaCronologicaInventarioRouterMercusysMr30g,
];
