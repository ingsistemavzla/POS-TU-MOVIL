import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';
import {
  SLUG_A16_PARTE_1,
  SLUG_A16_PARTE_2,
  SLUG_A16_PARTE_3,
} from './auditoriaStockGalaxyA16Rf8ya0dk6zf2026';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-07-15';
const PRODUCTO = 'samsung galaxy a16 128gb/4+4';
const SKU = 'RF8YA0DK6ZF';

/** Informe gerencial: responde las 3 preguntas operativas (cero → carga → facturas) */
export const SLUG_GERENTE_A16_CERO_CARGA =
  'respuesta-gerente-galaxy-a16-cero-carga-facturas-2026-07';

export const informeRespuestaGerenteGalaxyA16CeroCarga: PublicInforme = {
  slug: SLUG_GERENTE_A16_CERO_CARGA,
  titulo: 'Galaxy A16 — Respuesta al gerente: cero, carga y facturas',
  subtitulo:
    'Confirmación directa de cuándo el A16 128 estuvo en cero, cuándo se cargó inventario y desde cuándo revisar facturas.',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'inventario',
  tags: ['inventario', 'galaxy-a16', 'gerente', 'cero', 'carga', SKU],
  relacionados: [
    INFORMES_CATALOGO_SLUG,
    SLUG_A16_PARTE_1,
    SLUG_A16_PARTE_2,
    SLUG_A16_PARTE_3,
  ],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Destinatario', value: 'Gerencia / operaciones de inventario' },
    { label: 'Producto', value: PRODUCTO },
    { label: 'SKU', value: SKU },
    { label: 'Fecha', value: FECHA_INFORME },
  ],
  sections: [
    {
      type: 'hero',
      badge: 'Respuesta operativa · Preguntas del gerente · A16 128GB',
    },
    {
      type: 'verdict',
      titulo: 'Sí: la última carga grande del A16 fue porque estaba en cero',
      detalle: [
        'Se confirma la intuición del gerente. El Galaxy A16 128GB sí llegó a **cero unidades** en tiendas clave y, al día siguiente, se cargó inventario saliendo de cero — incluida la carga **0 → 15** en Zona Gamer.',
        'Esta ruta es distinta a la del Note (no era un “nuevo stock” mal cargado). Aquí primero se agotó, luego se recargó, y el seguimiento debe hacerse **desde esa fecha de carga** contando facturas una por una.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'text',
      title: 'Qué preguntó gerencia (y en qué orden se responde)',
      paragraphs: [
        '1) ¿Cuándo fue la última vez que el A16 de 128 estaba en cero?',
        '2) ¿Cuándo, estando en cero, se cargó inventario?',
        '3) ¿Qué facturas de A16 hubo desde esa última carga (o desde qué fecha buscarlas en el sistema)?',
        'Lógica a validar: si se cargaron 15 y hay 15 facturas, y el sistema aún muestra de más, hubo un error de carga / unidad fantasma. Si facturadas < cargadas y el remanente cuadra con el stock, la cuenta cierra.',
      ],
    },
    {
      type: 'timeline',
      title: 'Pregunta 1 — Última vez en CERO (por tienda)',
      items: [
        {
          fecha: '23-jun-2026 10:29',
          fase: 'Tu Móvil Marino → 0',
          resultado: 'Stock 1 → 0 (ajuste automático de auditoría / disminución).',
        },
        {
          fecha: '25-jun-2026 09:39',
          fase: 'Zona Gamer Margarita → 0',
          resultado:
            'Stock 1 → 0. Punto clave antes de la carga de 15: **Zona Gamer sí estaba en cero**.',
        },
        {
          fecha: '25-jun-2026 16:31',
          fase: 'Tu Móvil La Isla → 0',
          resultado: 'Stock 1 → 0.',
        },
        {
          fecha: '08-jul-2026 13:12',
          fase: 'Tu Móvil Centro → 0',
          resultado:
            'Cero posterior (después de haber recargado el 26-jun). No es el cero previo a la carga grande.',
        },
      ],
    },
    {
      type: 'verdict',
      titulo: 'Respuesta 1 (clara)',
      detalle:
        'Antes de la carga grande del gerente, el A16 128 **sí estaba en cero**. En Zona Gamer: **25 de junio de 2026 a las 09:39**. Marino y La Isla también habían llegado a cero en esos días.',
      ok: true,
    },
    {
      type: 'table',
      title: 'Pregunta 2 — Carga saliendo de cero (26-jun-2026)',
      description:
        'Todos son “Ajuste automático de auditoría — Aumento” registrados como Admin Tu Movil.',
      headers: ['Hora (VE)', 'Tienda', 'Antes', 'Después', 'Cargadas', 'Nota'],
      rows: [
        {
          cells: [
            '16:02',
            'Tu Móvil Marino',
            '0',
            '5',
            '+5',
            'Primera carga del día desde cero',
          ],
        },
        {
          cells: [
            '16:46',
            'Zona Gamer Margarita',
            '0',
            '15',
            '+15',
            'La carga que recuerda el gerente',
          ],
        },
        {
          cells: ['16:59', 'Tu Móvil Centro', '0', '5', '+5', 'Desde cero'],
        },
        {
          cells: ['17:02', 'Tu Móvil Marino', '4', '9', '+5', 'Aumento adicional'],
        },
        {
          cells: [
            '17:05',
            'Zona Gamer Margarita',
            '5',
            '10',
            '+5',
            'Aumento adicional (ya no partía de 0)',
          ],
        },
      ],
    },
    {
      type: 'verdict',
      titulo: 'Respuesta 2 (clara)',
      detalle: [
        'La última vez que, estando en cero, se cargó el A16 en la magnitud que describe gerencia fue el **26 de junio de 2026**.',
        'La carga “de 15” es exacta: **Zona Gamer 0 → 15 a las 16:46**. Ese mismo día también hubo cargas desde cero en Marino (+5) y Centro (+5), más +5 adicionales en Marino y Zona Gamer. Total de aumentos ese día ≈ **35 unidades**.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'text',
      title: 'Pregunta 3 — Facturas desde esa carga (fecha para buscar una por una)',
      paragraphs: [
        'Fecha de corte para buscar en el sistema: **desde el 26 de junio de 2026 a partir de las 16:02** (primera carga desde cero ese día). Si solo quiere el ciclo de la carga de 15 en Zona Gamer: **desde el 26-jun 16:46**.',
        'En el POS: filtrar ventas del producto A16 128 / SKU RF8YA0DK6ZF desde esa fecha y revisar factura por factura (tienda, cantidad, cancelaciones).',
        'Interpretación: si cargó 15 y hay 15 facturas de 1 unidad y el sistema aún muestra stock de más → hubo error (carga de más o restitución fantasma). Si hay menos facturas que lo cargado y el remanente cuadra con el físico → la cuenta de esa ronda cierra.',
        'Nota: existe un evento aparte el **18-jun-2026 11:15** (IN +1 por cancelación FAC-20260618-04485 en Zona Gamer). Eso **no es una carga nueva de mercancía**; es restitución. Explica por qué la táctica del Note no cerró sola el caso A16.',
      ],
    },
    {
      type: 'steps',
      title: 'Cómo revisar las facturas en el sistema (paso a paso)',
      items: [
        {
          paso: '1',
          accion: 'Ir a historial / ventas y filtrar por producto A16 128 o SKU RF8YA0DK6ZF',
          resultado: 'Lista solo del equipo en disputa',
        },
        {
          paso: '2',
          accion: 'Fecha desde: 26/06/2026 16:02 (o 16:46 si solo mira Zona Gamer)',
          resultado: 'Quedan fuera ventas de ciclos anteriores',
        },
        {
          paso: '3',
          accion: 'Contar unidades facturadas y compararlas con las unidades cargadas ese día',
          resultado: 'Carga ~35 uds el 26-jun; foco 15 en Zona Gamer',
        },
        {
          paso: '4',
          accion: 'Marcar cualquier factura cancelada o restitución de stock',
          resultado: 'Detecta unidades “fantasma” sin equipo físico',
        },
      ],
    },
    {
      type: 'table',
      title: 'Resumen ejecutivo para imprimir / WhatsApp',
      headers: ['#', 'Pregunta', 'Respuesta'],
      rows: [
        {
          cells: [
            '1',
            '¿Estuvo en cero antes de cargar?',
            'Sí. Zona Gamer en 0 el 25-jun-2026 09:39',
          ],
        },
        {
          cells: [
            '2',
            '¿Cuándo se cargó estando en cero?',
            '26-jun-2026: Marino 0→5 (16:02), Zona Gamer 0→15 (16:46), Centro 0→5 (16:59)',
          ],
        },
        {
          cells: [
            '3',
            '¿Desde qué fecha mirar facturas?',
            'Desde 26-jun-2026 16:02 (ciclo completo) o 16:46 (solo los 15 de Zona Gamer)',
          ],
        },
      ],
    },
    {
      type: 'links',
      title: 'Ver también (serie técnica forense)',
      items: [
        {
          label: 'Parte 1 — Detección del desfase +1',
          href: `/informe/${SLUG_A16_PARTE_1}`,
        },
        {
          label: 'Parte 2 — Análisis SQL (incluye FAC-04485)',
          href: `/informe/${SLUG_A16_PARTE_2}`,
        },
        {
          label: 'Parte 3 — Conclusión y solución',
          href: `/informe/${SLUG_A16_PARTE_3}`,
        },
        { label: 'Catálogo de informes', href: '/informes' },
      ],
    },
  ],
};
