import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';
import { SLUG_GERENTE_A16_CERO_CARGA } from './respuestaGerenteGalaxyA16CeroCarga2026';
import { SLUG_A16_IMEI_EMAILS } from './gerenteA16ImeiEmailsCarga15Hasta20jul2026';
import { SLUG_A16_CARGA20_CENTRO } from './a16Carga20Centro17jul2026';
import { SLUG_A16_CALENDARIO_CARGAS } from './a16CalendarioCargas2026';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-07-25';
const PRODUCTO = 'samsung galaxy a16 128gb/4+4';
const SKU = 'RF8YA0DK6ZF';

/** Última carga según gerente vs registro POS */
export const SLUG_A16_ULTIMA_CARGA_GERENTE = 'a16-ultima-carga-gerente-vs-sistema-2026';

export const informeA16UltimaCargaGerente: PublicInforme = {
  slug: SLUG_A16_ULTIMA_CARGA_GERENTE,
  titulo: 'Galaxy A16 — Última carga del gerente vs sistema',
  subtitulo:
    'El gerente indica que el 26-jun cargó ~20 y que esa fue su última carga. El POS registra otra carga grande el 17-jul (Centro +20) con el mismo usuario Admin Tu Movil.',
  fecha: FECHA_INFORME,
  estado: 'aprobado',
  categoria: 'inventario',
  tags: ['inventario', 'galaxy-a16', 'cargas', 'gerente', SKU],
  relacionados: [
    INFORMES_CATALOGO_SLUG,
    SLUG_A16_CALENDARIO_CARGAS,
    SLUG_A16_CARGA20_CENTRO,
    SLUG_GERENTE_A16_CERO_CARGA,
    SLUG_A16_IMEI_EMAILS,
  ],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Producto', value: PRODUCTO },
    { label: 'SKU', value: SKU },
    { label: 'Usuario en POS', value: 'Admin Tu Movil' },
    { label: 'Fecha informe', value: FECHA_INFORME },
  ],
  sections: [
    {
      type: 'hero',
      badge: 'A16 · Última carga · Gerente vs POS',
    },
    {
      type: 'verdict',
      titulo: 'Veredicto',
      detalle: [
        'Lo que dice el gerente sobre el **26-jun (~20 en Zona Gamer)** **sí cuadra** con el sistema (15 + 5 = 20).',
        'Lo que **no cuadra** es que esa haya sido “la última carga de dispositivos que él hizo”: el **17-jul** hay otra carga grande (**Centro 0→20**) registrada con el **mismo usuario: Admin Tu Movil**.',
        'Conclusión: o no recuerda / no cuenta la del 17-jul, o varias personas usan la cuenta **Admin Tu Movil**, o habla de “la última carga física que yo traje” y la del 17 fue otra operación bajo el mismo login.',
      ].join('\n\n'),
      ok: false,
    },
    {
      type: 'text',
      title: 'Qué afirma el gerente',
      paragraphs: [
        'El **26 de junio** cargó alrededor de **20 dispositivos** A16.',
        'Esa fue la **última carga** de dispositivos que **él** hizo.',
      ],
    },
    {
      type: 'table',
      title: '26-jun — los 20 en Zona Gamer (cuadra)',
      description: 'Misma cuenta Admin Tu Movil. 15 + 5 = 20.',
      headers: ['Hora', 'Tienda', 'Movimiento', 'Uds', 'Quién'],
      rows: [
        { cells: ['16:46', 'Zona Gamer', '0 → 15', '+15', 'Admin Tu Movil'] },
        { cells: ['17:05', 'Zona Gamer', '5 → 10', '+5', 'Admin Tu Movil'] },
        { cells: ['TOTAL', 'Zona Gamer', 'Ese día', '+20', 'Admin Tu Movil'] },
      ],
    },
    {
      type: 'table',
      title: 'Cargas grandes desde el 26-jun (quién las registró)',
      description: 'Misma cuenta en todas. La del 17-jul es posterior a “su última”.',
      headers: ['Fecha / hora', 'Tienda', 'Estaba → Quedó', 'Uds', 'Quién'],
      rows: [
        { cells: ['26-jun 16:02', 'Marino', '0 → 5', '+5', 'Admin Tu Movil'] },
        { cells: ['26-jun 16:46', 'Zona Gamer', '0 → 15', '+15', 'Admin Tu Movil'] },
        { cells: ['26-jun 16:59', 'Centro', '0 → 5', '+5', 'Admin Tu Movil'] },
        { cells: ['26-jun 17:02', 'Marino', '4 → 9', '+5', 'Admin Tu Movil'] },
        { cells: ['26-jun 17:05', 'Zona Gamer', '5 → 10', '+5', 'Admin Tu Movil'] },
        { cells: ['17-jul 17:37', 'Centro', '0 → 20', '+20', 'Admin Tu Movil'] },
      ],
    },
    {
      type: 'text',
      title: 'Punto de fricción',
      paragraphs: [
        'Si “última carga que yo hice” = última vez que **él personalmente** operó el sistema, el POS **no puede confirmarlo**: solo ve el usuario **Admin Tu Movil**, que es el mismo el 26-jun y el 17-jul.',
        'Si “última carga” = **última entrada grande de mercancía A16 en el sistema**, entonces **no** fue el 26-jun: fue el **17-jul en Centro (+20)**.',
      ],
    },
    {
      type: 'table',
      title: 'Comparación directa',
      headers: ['Pregunta', 'Según gerente', 'Según POS'],
      rows: [
        {
          cells: [
            '¿Cargó ~20 el 26-jun en ZG?',
            'Sí',
            'Sí (15+5=20)',
          ],
        },
        {
          cells: [
            '¿Fue su última carga?',
            'Sí',
            'Hay otra el 17-jul Centro +20 con Admin Tu Movil',
          ],
        },
        {
          cells: [
            '¿Quién registró el 17-jul?',
            '—',
            'Admin Tu Movil (misma cuenta)',
          ],
        },
      ],
    },
    {
      type: 'steps',
      title: 'Cómo cerrar la duda con el gerente',
      items: [
        {
          paso: '1',
          accion: 'Mostrar la tabla del 17-jul Centro 0→20',
          resultado: 'Confirmar si la recuerda',
        },
        {
          paso: '2',
          accion: 'Preguntar si otras personas usan Admin Tu Movil',
          resultado: 'Si sí, la del 17 pudo ser otro operador',
        },
        {
          paso: '3',
          accion: 'Si él hizo las dos, aclarar que el ciclo “desde mi última carga” debe partir del 17-jul, no del 26-jun',
          resultado: 'Alcance correcto para rastrear IMEI/stock',
        },
      ],
    },
    {
      type: 'text',
      title: 'Relación con otros informes',
      paragraphs: [
        'El rastreo de ventas/IMEI del lote de **20 de Centro (17-jul)** ya está en su informe aparte. Si el gerente sostiene que su última fue el 26-jun, ese lote de Centro **igual existe** en el sistema y debe explicarse (quién lo cargó / de dónde salió).',
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
          label: 'Rastreo carga 20 Centro 17-jul',
          href: `/informe/${SLUG_A16_CARGA20_CENTRO}`,
        },
        {
          label: 'Cero + carga Zona Gamer',
          href: `/informe/${SLUG_GERENTE_A16_CERO_CARGA}`,
        },
        {
          label: 'Catálogo de informes',
          href: `/informe/${INFORMES_CATALOGO_SLUG}`,
        },
      ],
    },
  ],
};

export const ALL_A16_ULTIMA_CARGA_GERENTE_INFORMES: PublicInforme[] = [
  informeA16UltimaCargaGerente,
];
