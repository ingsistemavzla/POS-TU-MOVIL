import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';
import { SLUG_GERENTE_A16_CERO_CARGA } from './respuestaGerenteGalaxyA16CeroCarga2026';
import { SLUG_A16_IMEI_EMAILS } from './gerenteA16ImeiEmailsCarga15Hasta20jul2026';
import { SLUG_A16_CARGA20_CENTRO } from './a16Carga20Centro17jul2026';
import { SLUG_A16_CALENDARIO_CARGAS } from './a16CalendarioCargas2026';
import { SLUG_A16_ULTIMA_CARGA_GERENTE } from './a16UltimaCargaGerenteVsSistema2026';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-07-26';
const PRODUCTO = 'samsung galaxy a16 128gb/4+4';
const SKU = 'RF8YA0DK6ZF';

/** Pedido gerencia: ventas A16 25-jun → 16-jul con IMEI y factura */
export const SLUG_A16_VENTAS_25JUN_16JUL = 'a16-ventas-25jun-16jul-2026';

const VENTAS: {
  n: string;
  fecha: string;
  hora: string;
  tienda: string;
  factura: string;
  cliente: string;
  imei: string;
  nota?: string;
}[] = [
  {
    n: '1',
    fecha: '25-jun-2026',
    hora: '09:39',
    tienda: 'Zona Gamer Margarita',
    factura: 'FAC-20260625-04703',
    cliente: 'MARIANA DEL VALLE FUENTES RODRIGUEZ',
    imei: '351577550343414',
  },
  {
    n: '2',
    fecha: '25-jun-2026',
    hora: '16:31',
    tienda: 'Tu Móvil La Isla',
    factura: 'FAC-20260625-04720',
    cliente: 'JUAN FARIAS',
    imei: '350558668588109',
  },
  {
    n: '3',
    fecha: '26-jun-2026',
    hora: '16:07',
    tienda: 'Tu Móvil Marino',
    factura: 'FAC-20260626-04739',
    cliente: 'JULY MAGDALENA RIZALES MOYA',
    imei: '351577550328845',
  },
  {
    n: '4',
    fecha: '27-jun-2026',
    hora: '11:45',
    tienda: 'Tu Móvil Marino',
    factura: 'FAC-20260627-04743',
    cliente: 'MARIANGEL MARIN',
    imei: '351577550328654',
  },
  {
    n: '5',
    fecha: '27-jun-2026',
    hora: '12:12',
    tienda: 'Zona Gamer Margarita',
    factura: 'FAC-20260627-04745',
    cliente: 'CLAUDY REYES',
    imei: '351577550328969',
  },
  {
    n: '6',
    fecha: '28-jun-2026',
    hora: '11:20',
    tienda: 'Tu Móvil Centro',
    factura: 'FAC-20260628-04764',
    cliente: 'YOLY GUZMAN',
    imei: '351577550323028',
  },
  {
    n: '7',
    fecha: '01-jul-2026',
    hora: '12:19',
    tienda: 'Zona Gamer Margarita',
    factura: 'FAC-20260701-04835',
    cliente: 'JOSEVI MORENO',
    imei: '351577550327771',
  },
  {
    n: '8',
    fecha: '01-jul-2026',
    hora: '14:04',
    tienda: 'Tu Móvil Centro',
    factura: 'FAC-20260701-04844',
    cliente: 'JESUS DANIEL',
    imei: '351577550327813',
  },
  {
    n: '9',
    fecha: '02-jul-2026',
    hora: '10:56',
    tienda: 'Zona Gamer Margarita',
    factura: 'FAC-20260702-04862',
    cliente: 'DAVID JOSE VALERIO FLORES',
    imei: '351577550327821',
  },
  {
    n: '10',
    fecha: '03-jul-2026',
    hora: '12:36',
    tienda: 'Tu Móvil Centro',
    factura: 'FAC-20260703-04904',
    cliente: 'OSMAYRIN NARVAEZ',
    imei: '351577550327789',
  },
  {
    n: '11',
    fecha: '08-jul-2026',
    hora: '11:39',
    tienda: 'Tu Móvil Centro',
    factura: 'FAC-20260708-05043',
    cliente: 'SIMON JOSE ANTONIO FIGUEROA SALAZAR',
    imei: '351577550338240',
  },
  {
    n: '12',
    fecha: '08-jul-2026',
    hora: '13:12',
    tienda: 'Tu Móvil Centro',
    factura: 'FAC-20260708-05044',
    cliente: 'ANYER ADRIAN MARQUEZ ARREDONDO',
    imei: '351577550320628',
  },
  {
    n: '13',
    fecha: '08-jul-2026',
    hora: '16:37',
    tienda: 'Zona Gamer Margarita',
    factura: 'FAC-20260708-05053',
    cliente: 'YOEDYTH CAROLINA VELASQUEZ NORIEGA',
    imei: '351577550326930',
  },
  {
    n: '14',
    fecha: '09-jul-2026',
    hora: '15:27',
    tienda: 'Zona Gamer Margarita',
    factura: 'FAC-20260709-05074',
    cliente: 'JAIME RAFAEL GOMEZ MARTINEZ',
    imei: '351577550324901',
  },
  {
    n: '15',
    fecha: '09-jul-2026',
    hora: '15:33',
    tienda: 'Zona Gamer Margarita',
    factura: 'FAC-20260709-05075',
    cliente: 'DARWIN VASQUEZ',
    imei: '351577550323010',
  },
  {
    n: '16',
    fecha: '11-jul-2026',
    hora: '16:05',
    tienda: 'Zona Gamer Margarita',
    factura: 'FAC-20260711-05122',
    cliente: 'JOSE HERNANDEZ',
    imei: '351577550321287',
  },
  {
    n: '17',
    fecha: '11-jul-2026',
    hora: '16:41',
    tienda: 'Tu Móvil Marino',
    factura: 'FAC-20260711-05124',
    cliente: 'MILAGROS RODRIGUEZ',
    imei: '351577550329934',
  },
  {
    n: '18',
    fecha: '15-jul-2026',
    hora: '09:40',
    tienda: 'Tu Móvil La Isla',
    factura: 'FAC-20260715-05180',
    cliente: 'SARAY JIMENEZ',
    imei: '351577550324976',
  },
  {
    n: '19',
    fecha: '15-jul-2026',
    hora: '16:56',
    tienda: 'Tu Móvil La Isla',
    factura: 'FAC-20260715-05201',
    cliente: 'MILANYELI ROCA',
    imei: '351577550326948',
  },
  {
    n: '20',
    fecha: '16-jul-2026',
    hora: '14:03',
    tienda: 'Tu Móvil Marino',
    factura: 'FAC-20260716-05233',
    cliente: 'RAFAEL AGUILERA',
    imei: '351577550319422',
  },
  {
    n: '21',
    fecha: '16-jul-2026',
    hora: '16:33',
    tienda: 'Tu Móvil Marino',
    factura: 'FAC-20260716-05252',
    cliente: 'LORENIS AURELINA RAMOS VELASQUEZ',
    imei: '3515777550333290',
    nota: 'IMEI 16 dígitos — revisar',
  },
];

const DETALLE_ESCRITO = VENTAS.map((v) => {
  const base = `factura ${v.n}\n\nFac. ${v.factura}\nNombre: ${v.cliente}\nTienda: ${v.tienda}\nFecha: ${v.fecha}\nHora: ${v.hora}\nImei: ${v.imei}`;
  return v.nota ? `${base}\nNota: ${v.nota}` : base;
}).join('\n\n');

export const informeA16Ventas25jun16jul: PublicInforme = {
  slug: SLUG_A16_VENTAS_25JUN_16JUL,
  titulo: 'Galaxy A16 — Ventas 25-jun a 16-jul (factura + IMEI)',
  subtitulo:
    'Pedido gerencia: todas las ventas del A16 128GB con factura e IMEI, del 25/06/2026 al 16/07/2026, todas las sucursales.',
  fecha: FECHA_INFORME,
  estado: 'aprobado',
  categoria: 'inventario',
  tags: ['inventario', 'galaxy-a16', 'imei', 'ventas', SKU],
  relacionados: [
    INFORMES_CATALOGO_SLUG,
    SLUG_GERENTE_A16_CERO_CARGA,
    SLUG_A16_IMEI_EMAILS,
    SLUG_A16_CARGA20_CENTRO,
    SLUG_A16_CALENDARIO_CARGAS,
    SLUG_A16_ULTIMA_CARGA_GERENTE,
  ],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Producto', value: PRODUCTO },
    { label: 'SKU', value: SKU },
    { label: 'Ventana', value: '25-jun-2026 → 16-jul-2026 (inclusive)' },
    { label: 'Total ventas', value: '21 completed' },
    { label: 'Fecha informe', value: FECHA_INFORME },
  ],
  sections: [
    {
      type: 'hero',
      badge: 'A16 · Ventas 25-jun → 16-jul',
    },
    {
      type: 'verdict',
      titulo: 'Resumen para gerencia',
      detalle: [
        'En la ventana **25/06/2026 – 16/07/2026** hay **21 ventas completed** del A16 128GB (SKU **RF8YA0DK6ZF**), todas con factura e IMEI.',
        'Por tienda: **Zona Gamer 8** · **Centro 5** · **Marino 5** · **La Isla 3**.',
        'Atención: la venta **#21** (FAC-20260716-05252, Marino) tiene IMEI de **16 dígitos** (`3515777550333290`) — conviene revisar/corregir.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'table',
      title: 'Totales por tienda',
      headers: ['Tienda', 'Ventas', 'Uds'],
      rows: [
        { cells: ['Zona Gamer Margarita', '8', '8'] },
        { cells: ['Tu Móvil Centro', '5', '5'] },
        { cells: ['Tu Móvil Marino', '5', '5'] },
        { cells: ['Tu Móvil La Isla', '3', '3'] },
        { cells: ['TOTAL', '21', '21'] },
      ],
    },
    {
      type: 'table',
      title: 'Listado completo (21)',
      description: 'Todas completed. Una línea = una unidad.',
      headers: ['#', 'Fecha', 'Hora', 'Tienda', 'Factura', 'Cliente', 'IMEI'],
      rows: VENTAS.map((v) => ({
        cells: [
          v.n,
          v.fecha,
          v.hora,
          v.tienda,
          v.factura,
          v.cliente,
          v.nota ? `${v.imei} ⚠` : v.imei,
        ],
      })),
    },
    {
      type: 'code',
      title: 'Detalle escrito (factura 1 a 21)',
      language: 'text',
      code: DETALLE_ESCRITO,
    },
    {
      type: 'text',
      title: 'Nota de alcance',
      paragraphs: [
        'Ventana pedida por gerencia: **desde 25/06 hasta 16/07**. No incluye la carga de 20 en Centro del **17-jul** ni ventas posteriores.',
        'La venta #1 (25-jun 09:39 Zona Gamer) es la que deja el stock de ZG en **cero** justo antes del ciclo de cargas del 26-jun.',
      ],
    },
    {
      type: 'links',
      title: 'Relacionados',
      items: [
        {
          label: 'Calendario de cargas A16',
          href: `/informe/${SLUG_A16_CALENDARIO_CARGAS}`,
        },
        {
          label: 'Cero + carga 15 Zona Gamer',
          href: `/informe/${SLUG_GERENTE_A16_CERO_CARGA}`,
        },
        {
          label: 'Rastreo carga 20 Centro 17-jul',
          href: `/informe/${SLUG_A16_CARGA20_CENTRO}`,
        },
        {
          label: 'Catálogo de informes',
          href: `/informe/${INFORMES_CATALOGO_SLUG}`,
        },
      ],
    },
  ],
};

export const ALL_A16_VENTAS_25JUN_16JUL_INFORMES: PublicInforme[] = [
  informeA16Ventas25jun16jul,
];
