import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-11-04';
const SKU = 'RF8Y81160QR';

/** Informe D — ventas e IMEI Galaxy A17 4+4. Certificado por sale_item_id. */
export const SLUG_PREVIEW_VENTAS_IMEI_A17_4PLUS4 = 'preview-ventas-imei-galaxy-a17-4plus4-rf8y81160qr-2026-11';

export const informePreviewVentasImeiGalaxyA174Plus4: PublicInforme = {
  slug: SLUG_PREVIEW_VENTAS_IMEI_A17_4PLUS4,
  titulo: 'Ventas e IMEI — Galaxy A17 4+4 (RF8Y81160QR)',
  subtitulo: '27 unidades · 26 facturas completed · 27 IMEI · total $5,373 USD',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'inventario',
  tags: ['inventario', 'galaxy-a17', 'ventas', 'imei', SKU],
  relacionados: [INFORMES_CATALOGO_SLUG],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Producto', value: 'Samsung Galaxy A17 128GB / 4+4' },
    { label: 'SKU', value: SKU },
    { label: 'Unidades', value: '27' },
    { label: 'Facturas', value: '26' },
    { label: 'IMEI distintos', value: '27' },
    { label: 'Total USD', value: '$5,373.00' },
    { label: 'Fecha informe', value: FECHA_INFORME },
    { label: 'URL', value: `/informe/${SLUG_PREVIEW_VENTAS_IMEI_A17_4PLUS4}` },
  ],
  sections: [
    {
      type: 'hero',
      badge: 'INFORME D · Galaxy A17 4+4 · RF8Y81160QR · Ventas con IMEI · Solo lectura',
    },
    {
      type: 'verdict',
      titulo: '27 ventas · 27 IMEI · total $5,373 — trazabilidad por sale_item_id',
      detalle: [
        'Cada fila está asociada a su **sale_item_id** exacto. FAC-20261010-07881 conserva **dos** filas con IMEI distintos.',
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
        { cells: ['Unidades (filas)', '27'] },
        { cells: ['Facturas distintas', '26'] },
        { cells: ['IMEI distintos', '27'] },
        { cells: ['Estado', 'completed'] },
        { cells: ['Período', '10/10/2026 – 03/11/2026 (VE)'] },
        { cells: ['Total precios unitarios', '$5,373.00'] },
      ],
    },
    {
      type: 'table',
      title: '2. Distribución por sucursal',
      headers: ['Sucursal', 'Unidades'],
      rows: [
        { cells: ['Zona Gamer', '13'] },
        { cells: ['Centro', '9'] },
        { cells: ['Marino', '4'] },
        { cells: ['La Isla', '1'] }
      ],
    },
    {
      type: 'table',
      title: '3. Historial — una fila por dispositivo',
      description:
        'IMEI y precio unidos por sale_item_id. FAC-20261010-07881 = 2 filas / 2 IMEI. Orden: fecha VE, luego sale_item_id.',
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
          // sale_item_id: 1fefd1eb-1620-4db9-aa69-0490eb59bfcf
          cells: [
            '1',
            '10/10/2026 12:35:03',
            'FAC-20261010-07881',
            'Centro',
            '353150401696493',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 33510f14-006e-4ae5-8b02-341fc439c689
          cells: [
            '2',
            '10/10/2026 12:35:03',
            'FAC-20261010-07881',
            'Centro',
            '353150403940725',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: ca3d1fe6-ce7d-48bb-9ca4-2cfa37a03e79
          cells: [
            '3',
            '12/10/2026 16:49:21',
            'FAC-20261012-07922',
            'Centro',
            '353150403952019',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 6ef73a7b-7418-4c2a-8f53-798b50c41240
          cells: [
            '4',
            '15/10/2026 17:11:57',
            'FAC-20261015-07976',
            'Zona Gamer',
            '353150403940527',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 41506338-6c25-45c4-950f-a3ec5ede9e47
          cells: [
            '5',
            '16/10/2026 11:05:06',
            'FAC-20261016-07994',
            'Zona Gamer',
            '353150403947795',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 8b9d017c-9184-49c2-8ddd-f278ad020eae
          cells: [
            '6',
            '16/10/2026 12:34:24',
            'FAC-20261016-08000',
            'Zona Gamer',
            '353150402953570',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 886eccf2-5db7-42ec-83b8-48884c92feab
          cells: [
            '7',
            '17/10/2026 10:13:59',
            'FAC-20261017-08037',
            'Centro',
            '353150402953059',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 00872ed9-cc79-42d7-b5a4-db1a0960c4d9
          cells: [
            '8',
            '17/10/2026 10:23:59',
            'FAC-20261017-08039',
            'Centro',
            '353150400824062',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: dc374e77-c68a-4db0-b3ee-d3e8219b65f5
          cells: [
            '9',
            '17/10/2026 14:44:10',
            'FAC-20261017-08072',
            'Zona Gamer',
            '353150402943878',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 1198324b-2e93-4771-a534-8e8578eaf591
          cells: [
            '10',
            '17/10/2026 15:36:17',
            'FAC-20261017-08080',
            'Centro',
            '353150400825366',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 3111dfc5-07d9-4fa2-8ded-0121ea387ddc
          cells: [
            '11',
            '17/10/2026 15:53:37',
            'FAC-20261017-08082',
            'Zona Gamer',
            '353150402961367',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 789be10b-18e2-463b-b8ff-984a0829d668
          cells: [
            '12',
            '20/10/2026 12:31:15',
            'FAC-20261020-08140',
            'Zona Gamer',
            '353150403947787',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: e4c72313-054b-4ce8-a160-e446a75828d3
          cells: [
            '13',
            '24/10/2026 09:44:29',
            'FAC-20261024-08220',
            'Zona Gamer',
            '353150403945948',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 9ea3e1b1-5a4b-46c7-8205-ca320867423c
          cells: [
            '14',
            '24/10/2026 12:53:53',
            'FAC-20261024-08233',
            'Zona Gamer',
            '353150403937606',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: fa15da9e-04c6-4640-94c3-9569fd78f65a
          cells: [
            '15',
            '24/10/2026 13:26:32',
            'FAC-20261024-08237',
            'Zona Gamer',
            '353150403940543',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: b93f3b15-44ad-4286-9eb9-5c469e593c5d
          cells: [
            '16',
            '24/10/2026 16:59:13',
            'FAC-20261024-08251',
            'Zona Gamer',
            '353952625279950',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: e8031c52-b48e-4615-b531-467fbed14513
          cells: [
            '17',
            '27/10/2026 14:55:31',
            'FAC-20261027-08306',
            'Marino',
            '353150402774059',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: e2d095a0-cc83-4c3d-b4e9-472280d3cb31
          cells: [
            '18',
            '29/10/2026 16:41:38',
            'FAC-20261029-08342',
            'Centro',
            '353150403126804',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 7a31b093-94d8-46a9-9ad9-caa6f11e930f
          cells: [
            '19',
            '31/10/2026 09:15:06',
            'FAC-20261031-08368',
            'Zona Gamer',
            '353150405445780',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: b8580d00-a247-48f6-8c3c-3b9000ed3e47
          cells: [
            '20',
            '31/10/2026 11:07:54',
            'FAC-20261031-08379',
            'Marino',
            '353150403940618',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 964937c3-50f3-4afd-b10c-ea3ef9f992e9
          cells: [
            '21',
            '31/10/2026 11:31:17',
            'FAC-20261031-08382',
            'Marino',
            '353150405445962',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 1ebf1e6a-650e-4efd-a805-f0fec0c4eaf2
          cells: [
            '22',
            '31/10/2026 13:30:22',
            'FAC-20261031-08396',
            'La Isla',
            '353150403937572',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 93b7c0d5-fe4e-48af-89a7-7cc4fb9ca9c5
          cells: [
            '23',
            '01/11/2026 10:18:24',
            'FAC-20261101-08420',
            'Zona Gamer',
            '353150403126648',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: de8486fb-8453-4ab8-b472-034f2743fac5
          cells: [
            '24',
            '02/11/2026 13:36:43',
            'FAC-20261102-08461',
            'Centro',
            '353150402961086',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 595b6274-cde8-4123-82a0-0d6f2acd5069
          cells: [
            '25',
            '03/11/2026 10:49:34',
            'FAC-20261103-08488',
            'Zona Gamer',
            '353150403127026',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: f0860438-21d6-4261-b977-8d3246f5e42b
          cells: [
            '26',
            '03/11/2026 15:38:08',
            'FAC-20261103-08509',
            'Marino',
            '353150405446028',
            '$199.00',
            'completed',
          ],
        },
        {
          // sale_item_id: 951e7d7d-d76c-422b-a089-f42578684888
          cells: [
            '27',
            '03/11/2026 17:49:53',
            'FAC-20261103-08523',
            'Centro',
            '353150405445921',
            '$199.00',
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
        'FAC-20261010-07881: sale_item_id 1fefd1eb… → IMEI 353150401696493; sale_item_id 33510f14… → IMEI 353150403940725.',
        'Publicación autorizada con IMEI completos visibles.',
      ],
    },
    {
      type: 'links',
      title: 'Navegación',
      items: [
        { label: 'Catálogo de informes', href: '/informes' },
        {
          label: 'Informe C — Galaxy A17 6+6',
          href: '/informe/preview-ventas-imei-galaxy-a17-6plus6-rfgya08tsly-2026-11',
        },
        {
          label: 'Informe A — Auditoría gerencial A17',
          href: '/informe/auditoria-movimientos-galaxy-a17-rfgya08tsly-rf8y81160qr-2026-11',
        },
        {
          label: 'Informe B — Trazabilidad FAC-07881',
          href: '/informe/trazabilidad-fac-20261010-07881-a17-4plus4-2026-11',
        },
      ],
    },
  ],
};

export const ALL_PREVIEW_VENTAS_IMEI_A17_4PLUS4_INFORMES: PublicInforme[] = [informePreviewVentasImeiGalaxyA174Plus4];
