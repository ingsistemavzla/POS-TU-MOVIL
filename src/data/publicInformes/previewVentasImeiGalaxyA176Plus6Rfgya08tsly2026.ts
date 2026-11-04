import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-11-04';
const SKU = 'RFGYA08TSLY';

/** Informe C — ventas e IMEI Galaxy A17 6+6. Certificado por sale_item_id. */
export const SLUG_PREVIEW_VENTAS_IMEI_A17_6PLUS6 = 'preview-ventas-imei-galaxy-a17-6plus6-rfgya08tsly-2026-11';

export const informePreviewVentasImeiGalaxyA176Plus6: PublicInforme = {
  slug: SLUG_PREVIEW_VENTAS_IMEI_A17_6PLUS6,
  titulo: 'Ventas e IMEI — Galaxy A17 6+6 (RFGYA08TSLY)',
  subtitulo: '11 unidades · 11 facturas completed · 11 IMEI · total $2,481 USD',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'inventario',
  tags: ['inventario', 'galaxy-a17', 'ventas', 'imei', SKU],
  relacionados: [INFORMES_CATALOGO_SLUG],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Producto', value: 'Samsung Galaxy A17 128GB / 6+6' },
    { label: 'SKU', value: SKU },
    { label: 'Unidades', value: '11' },
    { label: 'Facturas', value: '11' },
    { label: 'IMEI distintos', value: '11' },
    { label: 'Total USD', value: '$2,481.00' },
    { label: 'Fecha informe', value: FECHA_INFORME },
    { label: 'URL', value: `/informe/${SLUG_PREVIEW_VENTAS_IMEI_A17_6PLUS6}` },
  ],
  sections: [
    {
      type: 'hero',
      badge: 'INFORME C · Galaxy A17 6+6 · RFGYA08TSLY · Ventas con IMEI · Solo lectura',
    },
    {
      type: 'verdict',
      titulo: '11 ventas · 11 IMEI · total $2,481 — trazabilidad por sale_item_id',
      detalle: [
        'Cada fila está asociada a su **sale_item_id** exacto. IMEI de 15 dígitos y precio unitario certificados desde `sale_items` / `sales` (status completed).',
        'Documento público de referencia operativa. Sin datos de clientes.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'table',
      title: '1. Resumen comercial',
      headers: ['Métrica', 'Valor'],
      rows: [
        { cells: ['SKU', SKU] },
        { cells: ['Unidades (filas)', '11'] },
        { cells: ['Facturas distintas', '11'] },
        { cells: ['IMEI distintos', '11'] },
        { cells: ['Estado', 'completed'] },
        { cells: ['Período', '05/10/2026 – 02/11/2026 (VE)'] },
        { cells: ['Total precios unitarios', '$2,481.00'] },
      ],
    },
    {
      type: 'table',
      title: '2. Distribución por sucursal',
      headers: ['Sucursal', 'Unidades'],
      rows: [
        { cells: ['Centro', '5'] },
        { cells: ['La Isla', '3'] },
        { cells: ['Marino', '2'] },
        { cells: ['Zona Gamer', '1'] }
      ],
    },
    {
      type: 'table',
      title: '3. Historial — una fila por dispositivo',
      description:
        'IMEI y precio unidos por sale_item_id. Orden: fecha VE, luego sale_item_id.',
      headers: [
        '#',
        'Fecha y hora (VE)',
        'Factura',
        'Sucursal',
        'IMEI',
        'Precio USD',
        'Status',
      ],
      rows: [
        {
          // sale_item_id: eed16a73-ebe4-4e21-a2df-1b3e9bc8328e
          cells: [
            '1',
            '05/10/2026 14:52:50',
            'FAC-20261005-07769',
            'Marino',
            '353952625283481',
            '$216.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 7e3a1637-3844-487b-ab96-e9e621028370
          cells: [
            '2',
            '05/10/2026 16:19:22',
            'FAC-20261005-07777',
            'Zona Gamer',
            '353952625289892',
            '$216.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 40d5fef6-4da8-46bb-b12f-390777a98177
          cells: [
            '3',
            '05/10/2026 17:40:40',
            'FAC-20261005-07786',
            'La Isla',
            '353952625283127',
            '$216.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 36a3805c-b253-4516-a18d-1bd71defd7b1
          cells: [
            '4',
            '06/10/2026 10:51:52',
            'FAC-20261006-07795',
            'Centro',
            '353952625283390',
            '$216.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 041a50cb-80de-45aa-bf96-0da5d7705cee
          cells: [
            '5',
            '06/10/2026 11:41:51',
            'FAC-20261006-07798',
            'Centro',
            '353952625283234',
            '$216.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 8f6f7619-7058-40b3-9ba2-443841792522
          cells: [
            '6',
            '07/10/2026 09:37:17',
            'FAC-20261007-07819',
            'La Isla',
            '353952625283168',
            '$216.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 86c7431a-3266-44bb-8341-d3f7a9f92ca5
          cells: [
            '7',
            '16/10/2026 09:12:57',
            'FAC-20261016-07984',
            'Centro',
            '353952625285130',
            '$237.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 4f5045bb-852c-4548-b123-5a448c10e020
          cells: [
            '8',
            '16/10/2026 14:05:37',
            'FAC-20261016-08004',
            'Centro',
            '353952625289710',
            '$237.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 4357fbc2-56e2-4a9a-8cef-b2c573b9689b
          cells: [
            '9',
            '26/10/2026 12:01:21',
            'FAC-20261026-08275',
            'Marino',
            '353952625347393',
            '$237.00',
            'completed',
          ],
        },
        {
          // sale_item_id: d29d1782-288b-4356-bde9-de931bd4870a
          cells: [
            '10',
            '27/10/2026 10:13:39',
            'FAC-20261027-08295',
            'La Isla',
            '353952625281642',
            '$237.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 1a200ced-b6e3-4a0d-ba28-a691de76808d
          cells: [
            '11',
            '02/11/2026 17:43:50',
            'FAC-20261102-08483',
            'Centro',
            '353952625346429',
            '$237.00',
            'completed',
          ],
        },
      ],
    },
    {
      type: 'text',
      title: '4. Observaciones',
      paragraphs: [
        'Fuente: SELECT a sale_items + sales (status completed) filtrado por SKU y facturas del libro OUT.',
        'Asociación por sale_item_id — no por posición de fila.',
        'Publicación autorizada con IMEI completos visibles.',
      ],
    },
    {
      type: 'links',
      title: 'Navegación',
      items: [
        { label: 'Catálogo de informes', href: '/informes' },
        {
          label: 'Informe D — Galaxy A17 4+4',
          href: '/informe/preview-ventas-imei-galaxy-a17-4plus4-rf8y81160qr-2026-11',
        },
        {
          label: 'Informe A — Auditoría gerencial A17',
          href: '/informe/auditoria-movimientos-galaxy-a17-rfgya08tsly-rf8y81160qr-2026-11',
        },
      ],
    },
  ],
};

export const ALL_PREVIEW_VENTAS_IMEI_A17_6PLUS6_INFORMES: PublicInforme[] = [informePreviewVentasImeiGalaxyA176Plus6];
