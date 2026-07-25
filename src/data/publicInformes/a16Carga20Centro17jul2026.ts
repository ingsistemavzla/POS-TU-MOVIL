import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';
import { SLUG_GERENTE_A16_CERO_CARGA } from './respuestaGerenteGalaxyA16CeroCarga2026';
import { SLUG_A16_IMEI_EMAILS } from './gerenteA16ImeiEmailsCarga15Hasta20jul2026';
import {
  SLUG_A16_PARTE_1,
  SLUG_A16_PARTE_2,
  SLUG_A16_PARTE_3,
} from './auditoriaStockGalaxyA16Rf8ya0dk6zf2026';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-07-25';
const PRODUCTO = 'samsung galaxy a16 128gb/4+4';
const SKU = 'RF8YA0DK6ZF';

/** Rastreo carga 20 Centro 17-jul */
export const SLUG_A16_CARGA20_CENTRO = 'a16-carga20-centro-17jul-2026';

const CENTRO_VENTAS: {
  n: string;
  factura: string;
  nombre: string;
  fecha: string;
  hora: string;
  imei: string;
}[] = [
  {
    n: '1',
    factura: 'FAC-20260717-05340',
    nombre: 'YENIFER MARIA RIVAS BARRIOS',
    fecha: '17-jul-2026',
    hora: '17:41',
    imei: '351577551841325',
  },
  {
    n: '2',
    factura: 'FAC-20260718-05376',
    nombre: 'EDWIN ALEXANDER ROSAS RAMOS',
    fecha: '18-jul-2026',
    hora: '12:03',
    imei: '351577551817325',
  },
  {
    n: '3',
    factura: 'FAC-20260718-05380',
    nombre: 'ANYOLIS CECILIA ORDAZ SALAZAR',
    fecha: '18-jul-2026',
    hora: '12:22',
    imei: '351577551837497',
  },
  {
    n: '4',
    factura: 'FAC-20260718-05380',
    nombre: 'ANYOLIS CECILIA ORDAZ SALAZAR',
    fecha: '18-jul-2026',
    hora: '12:22',
    imei: '351577551830013',
  },
  {
    n: '5',
    factura: 'FAC-20260718-05420',
    nombre: 'YAJARI JOSEFINA EURREST DIAZ',
    fecha: '18-jul-2026',
    hora: '15:56',
    imei: '351577551835079',
  },
  {
    n: '6',
    factura: 'FAC-20260720-05491',
    nombre: 'MARIANGEL JOSE ZAMBRANO FARIAS',
    fecha: '20-jul-2026',
    hora: '13:19',
    imei: '351577551822481',
  },
  {
    n: '7',
    factura: 'FAC-20260720-05497',
    nombre: 'SINXMARY DANIELA LACHEA ARIAS',
    fecha: '20-jul-2026',
    hora: '13:37',
    imei: '351577551826771',
  },
  {
    n: '8',
    factura: 'FAC-20260720-05512',
    nombre: 'YOHNNY DEL VALLE ROJAS SUAREZ',
    fecha: '20-jul-2026',
    hora: '16:41',
    imei: '351577551835087',
  },
  {
    n: '9',
    factura: 'FAC-20260720-05523',
    nombre: 'MARIANGELIS PEREZ',
    fecha: '20-jul-2026',
    hora: '18:17',
    imei: '351577551817853',
  },
  {
    n: '10',
    factura: 'FAC-20260721-05539',
    nombre: 'MARYETZY VASQUEZ',
    fecha: '21-jul-2026',
    hora: '14:31',
    imei: '351577551763321',
  },
  {
    n: '11',
    factura: 'FAC-20260723-05572',
    nombre: 'EUDORINA JOSEFINA ORTIZ LOZADA',
    fecha: '23-jul-2026',
    hora: '10:01',
    imei: '351577551835012',
  },
  {
    n: '12',
    factura: 'FAC-20260723-05582',
    nombre: 'SOLANGE DEL VALLE MILLAN',
    fecha: '23-jul-2026',
    hora: '12:56',
    imei: '351577551835491',
  },
];

const DETALLE_ESCRITO = CENTRO_VENTAS.map(
  (v) =>
    `factura ${v.n}\n\nFac. ${v.factura}\nNombre: ${v.nombre}\nFecha: ${v.fecha}\nHora: ${v.hora}\nImei: ${v.imei}`,
).join('\n\n');

export const informeA16Carga20Centro17jul: PublicInforme = {
  slug: SLUG_A16_CARGA20_CENTRO,
  titulo: 'Galaxy A16 — Rastreo carga de 20 en Centro (17-jul)',
  subtitulo:
    'Desde 0→20 en Tu Móvil Centro: qué se vendió (factura + nombre + IMEI), qué quedó en stock y el traslado a Zona Gamer.',
  fecha: FECHA_INFORME,
  estado: 'aprobado',
  categoria: 'inventario',
  tags: ['inventario', 'galaxy-a16', 'imei', 'centro', 'carga-20', SKU],
  relacionados: [
    INFORMES_CATALOGO_SLUG,
    SLUG_GERENTE_A16_CERO_CARGA,
    SLUG_A16_IMEI_EMAILS,
    SLUG_A16_PARTE_1,
    SLUG_A16_PARTE_2,
    SLUG_A16_PARTE_3,
  ],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Producto', value: PRODUCTO },
    { label: 'SKU', value: SKU },
    { label: 'Carga', value: 'Centro 0→20 · 17-jul-2026 17:37' },
    { label: 'Consulta', value: '25-jul-2026' },
    { label: 'Fecha informe', value: FECHA_INFORME },
  ],
  sections: [
    {
      type: 'hero',
      badge: 'A16 128GB · Carga 20 · Centro',
    },
    {
      type: 'verdict',
      titulo: 'Veredicto del lote de 20',
      detalle: [
        'El **17-jul-2026 a las 17:37** se cargaron **20** A16 en **Tu Móvil Centro** (0→20). SKU **RF8YA0DK6ZF**.',
        'De ese lote: **12 vendidos en Centro** (todos con IMEI), **1 transferido** a Zona Gamer el 22-jul (sigue en stock), **7 aún en Centro**. Suma: **12 + 1 + 7 = 20**. Cuadra. Stock sistema esperado: **8**.',
        'Desde esa carga **no hubo otra carga nueva** de A16 (solo el traslado de 1 a Zona Gamer).',
        'La factura **FAC-20260721-05544** (Zona Gamer, 21-jul) **no es de este lote**: stock previo de ZG.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'timeline',
      title: 'Línea del lote',
      items: [
        {
          fecha: '17-jul-2026 17:37',
          fase: 'Carga',
          resultado: 'Tu Móvil Centro 0 → 20.',
        },
        {
          fecha: '17-jul → 23-jul',
          fase: 'Ventas Centro',
          resultado: '12 unidades facturadas con IMEI (detalle abajo).',
        },
        {
          fecha: '22-jul-2026 17:53',
          fase: 'Transferencia',
          resultado: '1 unidad Centro → Zona Gamer (stock ZG queda en 1).',
        },
        {
          fecha: '25-jul-2026',
          fase: 'Stock actual del lote',
          resultado: 'Centro 7 + Zona Gamer 1 = 8 sin vender del lote.',
        },
      ],
    },
    {
      type: 'table',
      title: 'Balance del lote de 20',
      headers: ['Concepto', 'Uds', 'Nota'],
      rows: [
        { cells: ['Cargados en Centro', '20', '17-jul 17:37'] },
        { cells: ['Vendidos en Centro (con IMEI)', '12', 'Todas completed'] },
        { cells: ['Transferidos a Zona Gamer', '1', '22-jul; aún en stock ZG'] },
        { cells: ['Quedan en Centro', '7', 'Stock actual Centro'] },
        { cells: ['Total', '20', '12 + 1 + 7 = 20'] },
      ],
    },
    {
      type: 'table',
      title: 'Facturas del lote (12 · Centro)',
      description:
        'Ventas completed en Tu Móvil Centro desde la carga 0→20. factura 3 y 4 son la misma FAC-05380 (2 equipos).',
      headers: ['#', 'Factura', 'Nombre', 'Fecha', 'Hora', 'IMEI'],
      rows: CENTRO_VENTAS.map((v) => ({
        cells: [v.n, v.factura, v.nombre, v.fecha, v.hora, v.imei],
      })),
    },
    {
      type: 'code',
      title: 'Detalle escrito (factura 1 a 12)',
      language: 'text',
      code: DETALLE_ESCRITO,
    },
    {
      type: 'text',
      title: 'Fuera del lote (no contar como de los 20)',
      paragraphs: [
        '**FAC-20260721-05544** · Zona Gamer · 21-jul 17:14 · IMEI **351577551837455**. Stock previo de Zona Gamer (ZG pasó 1→0). El traslado desde Centro fue al día siguiente (22-jul).',
      ],
    },
    {
      type: 'text',
      title: 'Respuesta al admin',
      paragraphs: [
        '**¿Se vendieron los 20?** — No todos. Se vendieron **12** en Centro; **1** está en Zona Gamer por transferencia; **7** siguen en Centro. El lote **cuadra** (deben haber **8** en sistema).',
        '**¿Hay IMEI?** — Sí, las 12 ventas del lote tienen IMEI válido.',
        '**¿Hubo más cargas después?** — No. Solo el traslado de 1 a Zona Gamer.',
      ],
    },
    {
      type: 'steps',
      title: 'Cómo se obtuvo',
      items: [
        {
          paso: '1',
          accion: 'Confirmar movimiento 0→20 en Centro (17-jul 17:37)',
          resultado: 'Carga identificada',
        },
        {
          paso: '2',
          accion: 'Revisar movimientos posteriores (ventas + transferencia)',
          resultado: 'Reparto del lote',
        },
        {
          paso: '3',
          accion: 'Listar sales A16 desde esa fecha con IMEI y cliente',
          resultado: '12 del lote + 1 fuera (ZG)',
        },
      ],
    },
    {
      type: 'text',
      title: 'SQL',
      paragraphs: ['`sql/a16_rastreo_carga20_centro_17jul.sql`'],
    },
    {
      type: 'links',
      title: 'Relacionados',
      items: [
        {
          label: 'Cero + carga 15 Zona Gamer',
          href: `/informe/${SLUG_GERENTE_A16_CERO_CARGA}`,
        },
        {
          label: 'IMEI ciclo carga 15 Zona Gamer',
          href: `/informe/${SLUG_A16_IMEI_EMAILS}`,
        },
        {
          label: 'Catálogo de informes',
          href: `/informe/${INFORMES_CATALOGO_SLUG}`,
        },
      ],
    },
  ],
};

export const ALL_A16_CARGA20_CENTRO_INFORMES: PublicInforme[] = [
  informeA16Carga20Centro17jul,
];
