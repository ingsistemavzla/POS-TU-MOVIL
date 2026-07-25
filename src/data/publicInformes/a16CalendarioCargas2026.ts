import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';
import { SLUG_GERENTE_A16_CERO_CARGA } from './respuestaGerenteGalaxyA16CeroCarga2026';
import { SLUG_A16_IMEI_EMAILS } from './gerenteA16ImeiEmailsCarga15Hasta20jul2026';
import { SLUG_A16_CARGA20_CENTRO } from './a16Carga20Centro17jul2026';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-07-25';
const PRODUCTO = 'samsung galaxy a16 128gb/4+4';
const SKU = 'RF8YA0DK6ZF';

/** Calendario de cargas A16 hasta 25-jul-2026 */
export const SLUG_A16_CALENDARIO_CARGAS = 'a16-calendario-cargas-2026';

export const informeA16CalendarioCargas: PublicInforme = {
  slug: SLUG_A16_CALENDARIO_CARGAS,
  titulo: 'Galaxy A16 — Calendario de cargas 2026',
  subtitulo:
    'Qué se cargó, en qué tienda y qué significa cada número. Incluye la explicación del 26-jun: por qué se habla de 15 y también de 35.',
  fecha: FECHA_INFORME,
  estado: 'aprobado',
  categoria: 'inventario',
  tags: ['inventario', 'galaxy-a16', 'cargas', SKU],
  relacionados: [
    INFORMES_CATALOGO_SLUG,
    SLUG_GERENTE_A16_CERO_CARGA,
    SLUG_A16_IMEI_EMAILS,
    SLUG_A16_CARGA20_CENTRO,
  ],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Producto', value: PRODUCTO },
    { label: 'SKU', value: SKU },
    { label: 'Alcance', value: 'Todas las tiendas · feb–jul 2026' },
    { label: 'Fecha informe', value: FECHA_INFORME },
  ],
  sections: [
    {
      type: 'hero',
      badge: 'A16 128GB · Calendario de cargas',
    },
    {
      type: 'verdict',
      titulo: 'Cómo leer este informe',
      detalle: [
        'Hay **dos formas** de mirar las cargas y no hay que mezclarlas:',
        '1) **Por tienda:** ejemplo “Zona Gamer **0→15**” = en esa tienda estaba en 0 y quedó en 15 (se cargaron 15 ahí).',
        '2) **Por día (todas las tiendas):** ejemplo “**26-jun +35**” = ese día, sumando **todas** las sucursales, entraron 35 unidades al sistema.',
        'En el **26-jun** conviven tres números: **20** (Zona Gamer: 15+5), **15** (solo el primer movimiento) y **35** (total del día en todas las tiendas).',
        'Atención: el gerente dice que el 26 fue **su última carga**, pero el POS registra **17-jul Centro +20** con el mismo usuario **Admin Tu Movil**. Ver informe “Última carga gerente vs sistema”.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'text',
      title: 'El caso del 26-jun: ¿15, 20 o 35?',
      paragraphs: [
        'El gerente dice que el **26 cargó 20 dispositivos**. En el sistema eso **sí cuadra** si miramos **solo Zona Gamer ese día**:',
        'Primero entraron **15** (0→15 a las 16:46) y minutos después otros **5** (5→10 a las 17:05). **15 + 5 = 20** en Zona Gamer.',
        'El “0→15” solo describe el **primer** movimiento. No es el total de lo que entró a Zona Gamer ese día.',
        'El **+35** es otra cosa: es la suma de **todas las tiendas** el 26-jun (Zona Gamer + Marino + Centro). No contradice los 20 del gerente.',
      ],
    },
    {
      type: 'table',
      title: '26-jun — los 20 del gerente (solo Zona Gamer)',
      description: 'Lo que entró a Zona Gamer ese día = 20. Coincide con lo que dice el gerente.',
      headers: ['Hora', 'Tienda', 'Movimiento', 'Uds'],
      rows: [
        { cells: ['16:46', 'Zona Gamer', '0 → 15', '+15'] },
        { cells: ['17:05', 'Zona Gamer', '5 → 10', '+5'] },
        { cells: ['TOTAL ZONA GAMER', 'Zona Gamer', 'Ese día en esa tienda', '+20 ← gerente'] },
      ],
    },
    {
      type: 'table',
      title: '26-jun — por qué el total del día es 35 (todas las tiendas)',
      description: 'Además de los 20 de Zona Gamer, ese día también entró stock en Marino y Centro. 20 (ZG) + 5 + 5 + 5 = 35.',
      headers: ['Hora', 'Tienda', 'Movimiento', 'Uds'],
      rows: [
        { cells: ['16:02', 'Marino', '0 → 5', '+5'] },
        { cells: ['16:46', 'Zona Gamer', '0 → 15', '+15'] },
        { cells: ['16:59', 'Centro', '0 → 5', '+5'] },
        { cells: ['17:02', 'Marino', '4 → 9', '+5'] },
        { cells: ['17:05', 'Zona Gamer', '5 → 10', '+5'] },
        { cells: ['TOTAL DEL DÍA', 'Todas', 'Suma', '+35'] },
      ],
    },
    {
      type: 'text',
      title: 'Respuesta corta 26-jun',
      paragraphs: [
        '**¿El gerente cargó 20?** — **Sí**, en **Zona Gamer**: +15 a las 16:46 y +5 a las 17:05.',
        '**¿Por qué a veces se dice 15?** — Porque el primer movimiento fue **0→15**. Falta sumar el +5 de las 17:05.',
        '**¿Y el 35?** — Total del **26-jun en todas las tiendas** (los 20 de ZG + 15 en Marino/Centro). No es que los 20 estén mal.',
      ],
    },
    {
      type: 'table',
      title: 'Días clave — total del día (todas las tiendas)',
      description:
        'Cada fila es la SUMA de lo cargado ese día en todas las sucursales. Si quieres “qué pasó en una tienda”, mira la columna explicación o el desglose de abajo.',
      headers: ['Día', 'Total del día', 'Explicación clara'],
      rows: [
        {
          cells: [
            '28-feb',
            '+20',
            'Una sola carga: Zona Gamer 3→23 (+20). No es salida de cero.',
          ],
        },
        {
          cells: [
            '24-abr',
            '+15',
            'Una sola carga: Zona Gamer 0→15. Aquí sí el total del día = la carga de la tienda.',
          ],
        },
        {
          cells: [
            '07-may',
            '+15',
            'Una sola carga: Zona Gamer 0→15. Total del día = 15.',
          ],
        },
        {
          cells: [
            '08-may',
            '+10',
            'Zona Gamer 11→21 (+10). Refuerzo; no partía de cero.',
          ],
        },
        {
          cells: [
            '29-may',
            '+10',
            'Zona Gamer 9→19 (+10). Refuerzo.',
          ],
        },
        {
          cells: [
            '06-jun',
            '+10',
            'Zona Gamer 11→21 (+10). Refuerzo.',
          ],
        },
        {
          cells: [
            '26-jun',
            '+35',
            'Total todas las tiendas. En Zona Gamer solo: 15+5=20 (lo del gerente). Ver desglose.',
          ],
        },
        {
          cells: [
            '17-jul',
            '+20',
            'Una sola carga: Tu Móvil Centro 0→20. Última carga grande.',
          ],
        },
        {
          cells: [
            '22-jul',
            '+1*',
            'NO es carga nueva. Se movió 1 de Centro a Zona Gamer (transferencia).',
          ],
        },
      ],
    },
    {
      type: 'table',
      title: 'Glosario rápido',
      headers: ['Término', 'Significado'],
      rows: [
        {
          cells: [
            '0 → 15',
            'En ESA tienda el stock estaba en 0 y quedó en 15 (cargaron 15 ahí).',
          ],
        },
        {
          cells: [
            '+15 / +20 / +10',
            'Cuántas unidades se sumaron en ese movimiento (o en el total del día si se dice “día +35”).',
          ],
        },
        {
          cells: [
            'Refuerzo (ej. 11→21)',
            'La tienda NO estaba en cero; se le agregó stock encima del que ya tenía.',
          ],
        },
        {
          cells: [
            'Total del día',
            'Suma de todas las tiendas ese día. Puede ser mayor que la carga de una sola tienda.',
          ],
        },
        {
          cells: [
            'Transferencia',
            'Se mueve stock entre tiendas. No entra mercancía nueva al negocio.',
          ],
        },
      ],
    },
    {
      type: 'table',
      title: 'Cargas grandes — detalle tienda por tienda',
      description: 'Cada fila = un movimiento en una tienda. Aquí se ve el “estaba → quedó”.',
      headers: ['Fecha / hora', 'Tienda', 'Estaba', 'Quedó', 'Se cargaron'],
      rows: [
        { cells: ['28-feb 17:17', 'Zona Gamer', '3', '23', '20'] },
        { cells: ['24-abr 15:51', 'Zona Gamer', '0', '15', '15'] },
        { cells: ['07-may 11:02', 'Zona Gamer', '0', '15', '15'] },
        { cells: ['08-may 17:53', 'Zona Gamer', '11', '21', '10'] },
        { cells: ['29-may 17:50', 'Zona Gamer', '9', '19', '10'] },
        { cells: ['06-jun 05:13', 'Zona Gamer', '11', '21', '10'] },
        { cells: ['26-jun 16:02', 'Marino', '0', '5', '5'] },
        { cells: ['26-jun 16:46', 'Zona Gamer', '0', '15', '15'] },
        { cells: ['26-jun 16:59', 'Centro', '0', '5', '5'] },
        { cells: ['26-jun 17:02', 'Marino', '4', '9', '5'] },
        { cells: ['26-jun 17:05', 'Zona Gamer', '5', '10', '5'] },
        { cells: ['17-jul 17:37', 'Centro', '0', '20', '20'] },
      ],
    },
    {
      type: 'timeline',
      title: 'Hitos (en orden)',
      items: [
        {
          fecha: '28-feb',
          fase: 'Primera carga grande',
          resultado: 'Zona Gamer +20 (tenía 3; quedó en 23).',
        },
        {
          fecha: '24-abr y 07-may',
          fase: 'Dos ciclos 0→15 en Zona Gamer',
          resultado: 'En esos días el total del día = 15 porque solo hubo esa carga.',
        },
        {
          fecha: '26-jun',
          fase: 'Gerente: 20 en Zona Gamer',
          resultado: 'ZG +15 y luego +5 (=20). Marino/Centro suman el resto → total día 35.',
        },
        {
          fecha: '17-jul',
          fase: 'Última carga grande',
          resultado: 'Centro 0→20. Después no hubo carga nueva de mercancía.',
        },
        {
          fecha: '22-jul',
          fase: 'Traslado',
          resultado: '1 unidad Centro → Zona Gamer. Stock ZG actual = 1.',
        },
      ],
    },
    {
      type: 'text',
      title: 'Notas finales',
      paragraphs: [
        '**SKU:** RF8YA0DK6ZF · samsung galaxy a16 128gb/4+4.',
        '**Última carga grande desde cero:** 17-jul Centro **0→20**. Ventas e IMEI: informe de rastreo Centro.',
        '**Stock al 25-jul:** Centro 7 · Zona Gamer 1 · resto 0 · total **8**.',
      ],
    },
    {
      type: 'text',
      title: 'SQL',
      paragraphs: ['`sql/a16_todas_las_cargas_hasta_ahora.sql`'],
    },
    {
      type: 'links',
      title: 'Relacionados',
      items: [
        {
          label: 'Última carga gerente vs sistema',
          href: '/informe/a16-ultima-carga-gerente-vs-sistema-2026',
        },
        {
          label: 'Rastreo carga 20 Centro (facturas + IMEI)',
          href: `/informe/${SLUG_A16_CARGA20_CENTRO}`,
        },
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

export const ALL_A16_CALENDARIO_CARGAS_INFORMES: PublicInforme[] = [
  informeA16CalendarioCargas,
];
