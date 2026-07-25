import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';
import { SLUG_GERENTE_A16_CERO_CARGA } from './respuestaGerenteGalaxyA16CeroCarga2026';
import {
  SLUG_A16_PARTE_1,
  SLUG_A16_PARTE_2,
  SLUG_A16_PARTE_3,
} from './auditoriaStockGalaxyA16Rf8ya0dk6zf2026';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-07-25';
const PRODUCTO = 'samsung galaxy a16 128gb/4+4';
const SKU = 'RF8YA0DK6ZF';

/** Ciclo Zona Gamer: cero → 15 → ventas/IMEI (slug corto público) */
export const SLUG_A16_IMEI_EMAILS = 'a16-imei-carga15-20jul-2026';

/** Ventas A16 en Zona Gamer desde carga 0→15 (26-jun 16:46) — datos consulta 23-jul */
const ZG_IMEI_ROWS: {
  n: string;
  imei: string;
  factura: string;
  fecha: string;
}[] = [
  { n: '1', imei: '351577550328969', factura: 'FAC-20260627-04745', fecha: '27-jun 12:12' },
  { n: '2', imei: '351577550327771', factura: 'FAC-20260701-04835', fecha: '01-jul 12:19' },
  { n: '3', imei: '351577550327821', factura: 'FAC-20260702-04862', fecha: '02-jul 10:56' },
  { n: '4', imei: '351577550326930', factura: 'FAC-20260708-05053', fecha: '08-jul 16:37' },
  { n: '5', imei: '351577550324901', factura: 'FAC-20260709-05074', fecha: '09-jul 15:27' },
  { n: '6', imei: '351577550323010', factura: 'FAC-20260709-05075', fecha: '09-jul 15:33' },
  { n: '7', imei: '351577550321287', factura: 'FAC-20260711-05122', fecha: '11-jul 16:05' },
];

export const informeGerenteA16ImeiEmails: PublicInforme = {
  slug: SLUG_A16_IMEI_EMAILS,
  titulo: 'Galaxy A16 — IMEI del ciclo Zona Gamer (cero → 15 → ventas)',
  subtitulo:
    'Aclara el alcance: no son 27 de todas las tiendas. Son los IMEI del ciclo de la carga de 15 en Zona Gamer, y si un reverso coincide con uno de ellos.',
  fecha: FECHA_INFORME,
  estado: 'aprobado',
  categoria: 'inventario',
  tags: ['inventario', 'galaxy-a16', 'imei', 'zona-gamer', SKU],
  relacionados: [
    INFORMES_CATALOGO_SLUG,
    SLUG_GERENTE_A16_CERO_CARGA,
    SLUG_A16_PARTE_1,
    SLUG_A16_PARTE_2,
    SLUG_A16_PARTE_3,
  ],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Producto', value: PRODUCTO },
    { label: 'SKU', value: SKU },
    { label: 'Tienda del ciclo', value: 'Zona Gamer Margarita' },
    { label: 'Cero previo', value: '25-jun-2026 09:39' },
    { label: 'Carga 15', value: '26-jun-2026 16:46 (0→15)' },
    { label: 'Fecha informe', value: FECHA_INFORME },
  ],
  sections: [
    {
      type: 'hero',
      badge: 'A16 128GB · Ciclo Zona Gamer · IMEI',
    },
    {
      type: 'verdict',
      titulo: 'Por qué salían 27 (y qué se pide en realidad)',
      detalle: [
        'El listado de **27** mezclaba **todas las tiendas** hasta el 20-jul. Eso no responde al ciclo de la carga de 15.',
        'Lo que se necesita: los **IMEI** del ciclo **Zona Gamer** — estaba en **cero** → se cargaron **15** → ver cuáles se vendieron (y si un **reverso** coincide con uno de esos IMEI).',
        'En Zona Gamer, desde la carga 0→15, el POS muestra por ahora **7 ventas completed con IMEI** (tabla abajo). No son 15 facturas en esa tienda: el resto pudo salir por **transferencia** a otras sucursales o aún no haberse agotado solo por venta local.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'text',
      title: 'Qué se pidió (síntesis)',
      paragraphs: [
        'Tras confirmar cero (25-jun) y la carga de 15 (26-jun 16:46), se pidió el listado de **IMEI** de ese lote: desde que el stock estuvo en cero y se cargaron los 15, hasta que ese ciclo se vendió / bajó, para comprobar si esos equipos salieron en factura y si el que se **reversó** es uno de esos IMEI.',
      ],
    },
    {
      type: 'timeline',
      title: 'Marco del ciclo (ya confirmado)',
      items: [
        {
          fecha: '25-jun-2026 09:39',
          fase: 'Zona Gamer en cero',
          resultado: 'Stock A16 128 quedó en 0.',
        },
        {
          fecha: '26-jun-2026 16:46',
          fase: 'Carga de 15',
          resultado: 'Zona Gamer 0 → 15 (última carga grande de ese momento).',
        },
        {
          fecha: '26-jun 16:02 / 16:59…',
          fase: 'Otras tiendas el mismo día',
          resultado: 'También hubo cargas en Marino y Centro (por eso un filtro “todas las tiendas” infla a 27).',
        },
      ],
    },
    {
      type: 'table',
      title: 'IMEI vendidos en Zona Gamer desde la carga de 15 (7)',
      description:
        'Solo tienda Zona Gamer Margarita, ventas completed con IMEI después del 26-jun 16:46. Fuente consulta POS 23-jul-2026.',
      headers: ['#', 'IMEI', 'Factura', 'Fecha (VE)'],
      rows: ZG_IMEI_ROWS.map((r) => ({
        cells: [r.n, r.imei, r.factura, r.fecha],
      })),
    },
    {
      type: 'table',
      title: 'Lectura rápida vs los 15',
      headers: ['Concepto', 'Valor', 'Nota'],
      rows: [
        { cells: ['Cargados en Zona Gamer', '15', '0→15 el 26-jun 16:46'] },
        { cells: ['Vendidos en Zona Gamer (con IMEI)', '7', 'Facturas completed en esa tienda'] },
        { cells: ['Diferencia', '8', 'Transferencias / stock aún en tienda / otras salidas — revisar movimientos'] },
        { cells: ['Reversos en este listado ZG', '0*', 'Ninguno en las 7 filas; buscar FAC anulada aparte si existe'] },
      ],
    },
    {
      type: 'text',
      title: 'Respuesta directa',
      paragraphs: [
        '**¿Todos los 15 se vendieron en Zona Gamer?** — Con lo que hay en factura local: **no**. Solo hay **7 IMEI** vendidos en Zona Gamer desde esa carga. Para cerrar los 15 hay que ver **transferencias** y stock restante (SQL de ciclo en el repo).',
        '**¿El reverso coincide con uno vendido?** — En estas 7 facturas **no** aparece anulación. Si hay un reverso, hay que dar el número **FAC-…** y se compara el IMEI de esa factura con esta lista (o con el ciclo ampliado).',
        '**Sobre “emails”** — En este cierre el dato operativo del POS es el **IMEI** ligado a la factura. Eso es lo que se usa para cruzar el reverso.',
      ],
    },
    {
      type: 'steps',
      title: 'Qué hacer ahora',
      items: [
        {
          paso: '1',
          accion: 'Correr en Supabase el SQL del ciclo Zona Gamer (cero → 15 → cero)',
          resultado: 'Confirma cuándo volvió a 0 y si hay más IMEI / transferencias',
        },
        {
          paso: '2',
          accion: 'Si hay factura reversada, enviar el número FAC-…',
          resultado: 'Se verifica si su IMEI está en la lista del ciclo',
        },
        {
          paso: '3',
          accion: 'Usar los 7 IMEI de Zona Gamer como núcleo del lote local',
          resultado: 'Base para cruzar el reverso',
        },
      ],
    },
    {
      type: 'text',
      title: 'SQL',
      paragraphs: [
        '`sql/a16_ciclo_zona_gamer_cero_carga15_cero_imei.sql` — bloques 2–6 (movimientos, ventas ZG, resumen vs 15, reversos, transferencias).',
        'Informe previo del cero/carga: `/informe/respuesta-gerente-galaxy-a16-cero-carga-facturas-2026-07`.',
      ],
    },
    {
      type: 'links',
      title: 'Relacionados',
      items: [
        {
          label: 'Confirmación cero + carga 15',
          href: `/informe/${SLUG_GERENTE_A16_CERO_CARGA}`,
        },
        {
          label: 'Auditoría A16 — Parte 1',
          href: `/informe/${SLUG_A16_PARTE_1}`,
        },
        {
          label: 'Auditoría A16 — Parte 2',
          href: `/informe/${SLUG_A16_PARTE_2}`,
        },
        {
          label: 'Auditoría A16 — Parte 3',
          href: `/informe/${SLUG_A16_PARTE_3}`,
        },
        {
          label: 'Catálogo de informes',
          href: `/informe/${INFORMES_CATALOGO_SLUG}`,
        },
      ],
    },
  ],
};

export const ALL_GERENTE_A16_IMEI_INFORMES: PublicInforme[] = [informeGerenteA16ImeiEmails];
