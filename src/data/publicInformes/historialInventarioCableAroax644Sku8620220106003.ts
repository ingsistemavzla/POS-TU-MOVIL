import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-10-15';
const PRODUCTO = 'cable aroax 644 super carga rapida c a c y usb a c';
const SKU = '8620220106003';
const PRODUCT_ID = '8fed62d7-0380-4993-9456-d3756dc2262d';

/**
 * Historial gerencial — inventario Cable Aroax 644.
 * Complemento: veredicto-historico-cable-aroax-644-8620220106003-2026-10
 */
export const SLUG_HISTORIAL_AROAX_644 =
  'historial-inventario-cable-aroax-644-8620220106003-2026-10';

export const informeHistorialInventarioCableAroax644: PublicInforme = {
  slug: SLUG_HISTORIAL_AROAX_644,
  titulo: 'Cable Aroax 644 — Historial de inventario y conciliación',
  subtitulo:
    'Respuesta a gerencia: incorporaciones, ventas, traslados, ajustes, cancelaciones y existencias actuales (SKU 8620220106003).',
  fecha: FECHA_INFORME,
  estado: 'aprobado',
  categoria: 'inventario',
  tags: ['inventario', 'cable-aroax', 'gerente', 'historial', 'conciliacion', SKU],
  relacionados: [
    INFORMES_CATALOGO_SLUG,
    'veredicto-historico-cable-aroax-644-8620220106003-2026-10',
  ],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Destinatario', value: 'Gerencia / operaciones de inventario' },
    { label: 'Producto', value: PRODUCTO },
    { label: 'SKU', value: SKU },
    { label: 'Product ID', value: PRODUCT_ID },
    { label: 'Fecha', value: FECHA_INFORME },
    {
      label: 'URL',
      value: `/informe/${SLUG_HISTORIAL_AROAX_644}`,
    },
  ],
  sections: [
    {
      type: 'hero',
      badge: 'Respuesta operativa · Historial de inventario · Cable Aroax 644',
    },
    {
      type: 'verdict',
      titulo: 'Veredicto: la cuenta de sistema cierra en 26 unidades (diferencia 0)',
      detalle: [
        'Con la evidencia verificable disponible, el producto **Cable Aroax 644** (SKU **8620220106003**) muestra **26 unidades** en inventario de sistema, repartidas en cinco sucursales.',
        'Reconstrucción global: **+25** stock inicial + **+25** aumento manual + **+1** aumento manual − **25** unidades en ventas *completed* = **26**. Diferencia contable reconstruida: **0**.',
        'Esto **no** sustituye un conteo físico en tienda. Tampoco se afirma pérdida, fraude ni irregularidad: solo se reporta lo que el POS registra y permite conciliar.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'text',
      title: 'Resumen ejecutivo — qué preguntó gerencia',
      paragraphs: [
        '1) ¿Cuántas unidades ingresaron al inventario, cuándo y dónde?',
        '2) ¿Cuántas se vendieron y qué facturas lo respaldan?',
        '3) ¿Qué traslados y ajustes manuales hubo?',
        '4) ¿Qué ventas se cancelaron y cómo afectó el stock?',
        '5) ¿Dónde están las existencias actuales y hay diferencia contable?',
        'Alcance: se usan solo hechos confirmados en esta investigación. No se listan aquí los 79 movimientos del ledger uno por uno ni el detalle completo de las 24 facturas (números individuales no aportados al borrador). Las cifras agregadas sí están validadas.',
      ],
    },
    {
      type: 'table',
      title: 'Respuestas directas (para gerencia)',
      headers: ['#', 'Pregunta', 'Respuesta'],
      rows: [
        {
          cells: [
            '1',
            '¿Cuántas unidades ingresaron?',
            '51 uds incorporadas en total (25 inicial + 25 aumento + 1 aumento)',
          ],
        },
        {
          cells: [
            '2',
            '¿Cuándo y dónde ingresaron?',
            '04-jun-2026 Zona Gamer (+25 y +25); 15-oct-2026 Zona Gamer (+1)',
          ],
        },
        {
          cells: [
            '3',
            '¿Cuántas se vendieron?',
            '25 uds en 24 facturas completed (Marino 18, Zona Gamer 5, Store 2)',
          ],
        },
        {
          cells: [
            '4',
            '¿Traslados?',
            '5 operaciones; 35 uds movidas entre sucursales (no son entradas globales ni ventas)',
          ],
        },
        {
          cells: [
            '5',
            '¿Cancelaciones?',
            '2 restituciones +1 (FAC-20260608-04237 y FAC-20260717-05318); efecto neto 0 en la reconstrucción',
          ],
        },
        {
          cells: [
            '6',
            '¿Stock actual y diferencia?',
            '26 uds en sistema; diferencia contable reconstruida = 0 (sin conteo físico)',
          ],
        },
      ],
    },
    {
      type: 'table',
      title: 'Existencias actuales por sucursal (sistema verificado)',
      description:
        'Fuente: inventories / UI contrastada. No es verificación física de mercancía.',
      headers: ['Sucursal', 'Stock sistema (uds)'],
      rows: [
        { cells: ['Zona Gamer Margarita', '11'] },
        { cells: ['Tu Móvil La Isla', '9'] },
        { cells: ['Tu Móvil Marino', '6'] },
        { cells: ['Tu Móvil Store', '0'] },
        { cells: ['Tu Móvil Centro', '0'] },
        { cells: ['TOTAL', '26'] },
      ],
    },
    {
      type: 'table',
      title: 'Historial de incorporaciones (entradas reales de mercancía)',
      description:
        'No se incluyen traslados ni ecos ADJUST de ventas. Horario Venezuela (VE).',
      headers: ['Fecha/hora (VE)', 'Sucursal', 'Tipo', 'Unidades', 'Nota'],
      rows: [
        {
          cells: [
            '04-jun-2026 15:53:52',
            'Zona Gamer Margarita',
            'Stock inicial',
            '+25',
            'Primera incorporación documentada',
          ],
        },
        {
          cells: [
            '04-jun-2026 15:59:19',
            'Zona Gamer Margarita',
            'Aumento manual',
            '+25',
            'Segunda incorporación el mismo día',
          ],
        },
        {
          cells: [
            '15-oct-2026 16:48:51',
            'Zona Gamer Margarita',
            'Aumento manual',
            '+1',
            'Incorporación posterior',
          ],
        },
        {
          cells: ['—', '—', 'TOTAL INCORPORADO', '51', 'Suma de entradas globales'],
        },
      ],
    },
    {
      type: 'table',
      title: 'Ventas completed — distribución por sucursal',
      description:
        'Fuente: sales + sale_items, contrastada con movimientos OUT. Importe = suma de líneas facturadas del producto (USD 59.75); no es utilidad ni ganancia. Detalle de cada factura no listado en este borrador (alcance agregado).',
      headers: ['Sucursal', 'Unidades', 'Facturas', 'Nota'],
      rows: [
        { cells: ['Tu Móvil Marino', '18', '18', '1 ud por factura (agregado)'] },
        { cells: ['Zona Gamer Margarita', '5', '5', '1 ud por factura (agregado)'] },
        { cells: ['Tu Móvil Store', '2', '1', '2 uds en una factura'] },
        { cells: ['TOTAL', '25', '24', 'Estado completed'] },
      ],
    },
    {
      type: 'verdict',
      titulo: 'Ventas: 25 unidades respaldadas por 24 facturas completed',
      detalle:
        'Las ventas del cable se concentran en **Marino (18)**, luego **Zona Gamer (5)** y **Store (2)**. El importe de líneas facturadas del producto es **USD 59.75** (referencia de facturación de línea, no margen). No se exponen datos personales de clientes.',
      ok: true,
    },
    {
      type: 'table',
      title: 'Traslados entre sucursales (no son entradas nuevas ni ventas)',
      description:
        'Fuente: operaciones de traslado confirmadas. Total 5 operaciones / 35 unidades movidas. Un traslado redistribuye stock; no aumenta el total de la empresa.',
      headers: ['Fecha/hora (VE)', 'Origen', 'Destino', 'Unidades'],
      rows: [
        {
          cells: [
            '09-jun-2026 09:52:19',
            'Zona Gamer Margarita',
            'Tu Móvil Marino',
            '10',
          ],
        },
        {
          cells: [
            '09-jun-2026 09:52:28',
            'Zona Gamer Margarita',
            'Tu Móvil Marino',
            '10',
          ],
        },
        {
          cells: [
            '08-ago-2026 11:06:58',
            'Zona Gamer Margarita',
            'Tu Móvil Marino',
            '4',
          ],
        },
        {
          cells: [
            '14-oct-2026 16:58:52',
            'Zona Gamer Margarita',
            'Tu Móvil Store',
            '2',
          ],
        },
        {
          cells: [
            '15-oct-2026 17:59:24',
            'Zona Gamer Margarita',
            'Tu Móvil La Isla',
            '9',
          ],
        },
        {
          cells: ['—', '—', 'TOTAL TRASLADADO', '35'],
        },
      ],
    },
    {
      type: 'text',
      title: 'Ajustes manuales (alcance confirmado)',
      paragraphs: [
        'Los aumentos manuales que **sí** entran a la conciliación global como incorporaciones son: **+25** (04-jun-2026 15:59:19 VE, Zona Gamer) y **+1** (15-oct-2026 16:48:51 VE, Zona Gamer), además del stock inicial **+25**.',
        'En el ledger pueden aparecer filas ADJUST adicionales generadas automáticamente por ventas o traslados (eco de auditoría). **No se cuentan** aquí como operaciones independientes ni como mercancía nueva.',
        'Los usuarios que aparecen en bitácora (p. ej. cuentas administrativas del POS) se reportan solo como **usuario registrado en el sistema**, no como responsable físico verificado de cada movimiento.',
      ],
    },
    {
      type: 'table',
      title: 'Cancelaciones y restituciones identificables',
      description:
        'Ambas dejan descuento previo y restitución posterior; efecto neto cero en la reconstrucción global usada en este informe. Sin datos personales de clientes.',
      headers: ['Fecha', 'Documento', 'Efecto en stock', 'Nota'],
      rows: [
        {
          cells: [
            '08-jun-2026',
            'FAC-20260608-04237',
            'Restitución +1',
            'Neto 0 en reconstrucción',
          ],
        },
        {
          cells: [
            '17-jul-2026',
            'FAC-20260717-05318',
            'Restitución +1',
            'Neto 0 en reconstrucción',
          ],
        },
      ],
    },
    {
      type: 'table',
      title: 'Conciliación histórica global (sistema)',
      description:
        'Fórmula usada: incorporaciones − ventas completed = stock actual. Traslados = 0 en el total empresa. Cancelaciones con neto 0 no alteran el cierre.',
      headers: ['Concepto', 'Unidades', 'Efecto'],
      rows: [
        { cells: ['Stock inicial (04-jun-2026)', '+25', 'Entrada'] },
        { cells: ['Aumento manual (04-jun-2026)', '+25', 'Entrada'] },
        { cells: ['Aumento manual (15-oct-2026)', '+1', 'Entrada'] },
        { cells: ['Ventas completed', '−25', 'Salida'] },
        { cells: ['Traslados (35 uds movidas)', '0', 'Redistribución'] },
        { cells: ['Cancelaciones (neto reconstrucción)', '0', 'Sin efecto neto'] },
        { cells: ['STOCK SISTEMA RESULTANTE', '26', 'Cuadra'] },
        { cells: ['Diferencia contable', '0', 'Sin hueco en esta fórmula'] },
      ],
    },
    {
      type: 'table',
      title: 'Lectura por sucursal (existencias actuales)',
      description:
        'Dónde quedó el stock tras traslados y ventas. No se afirma conteo físico por tienda.',
      headers: ['Sucursal', 'Stock actual', 'Lectura operativa'],
      rows: [
        {
          cells: [
            'Zona Gamer Margarita',
            '11',
            'Origen de incorporaciones y de la mayoría de traslados salientes',
          ],
        },
        {
          cells: [
            'Tu Móvil La Isla',
            '9',
            'Recibió traslado de 9 uds (15-oct-2026)',
          ],
        },
        {
          cells: [
            'Tu Móvil Marino',
            '6',
            'Mayor volumen de ventas (18) y receptor de traslados desde Zona Gamer',
          ],
        },
        {
          cells: [
            'Tu Móvil Store',
            '0',
            'Recibió 2 uds (14-oct) y vendió 2 uds (1 factura)',
          ],
        },
        {
          cells: ['Tu Móvil Centro', '0', 'Sin stock actual de este SKU'],
        },
      ],
    },
    {
      type: 'timeline',
      title: 'Cronología de eventos principales (VE)',
      items: [
        {
          fecha: '04-jun-2026 15:53',
          fase: 'Incorporación',
          resultado: 'Stock inicial +25 en Zona Gamer Margarita.',
        },
        {
          fecha: '04-jun-2026 15:59',
          fase: 'Incorporación',
          resultado: 'Aumento manual +25 en Zona Gamer Margarita.',
        },
        {
          fecha: '08-jun-2026',
          fase: 'Cancelación',
          resultado: 'FAC-20260608-04237 — restitución +1 (neto 0 en reconstrucción).',
        },
        {
          fecha: '09-jun-2026 09:52',
          fase: 'Traslados',
          resultado: 'Zona Gamer → Marino: 10 uds y 10 uds (dos operaciones registradas).',
        },
        {
          fecha: '17-jul-2026',
          fase: 'Cancelación',
          resultado: 'FAC-20260717-05318 — restitución +1 (neto 0 en reconstrucción).',
        },
        {
          fecha: '08-ago-2026 11:06',
          fase: 'Traslado',
          resultado: 'Zona Gamer → Marino: 4 uds.',
        },
        {
          fecha: '14-oct-2026 16:58',
          fase: 'Traslado',
          resultado: 'Zona Gamer → Store: 2 uds.',
        },
        {
          fecha: '15-oct-2026 16:48',
          fase: 'Incorporación',
          resultado: 'Aumento manual +1 en Zona Gamer Margarita.',
        },
        {
          fecha: '15-oct-2026 17:59',
          fase: 'Traslado',
          resultado: 'Zona Gamer → La Isla: 9 uds.',
        },
        {
          fecha: '15-oct-2026',
          fase: 'Cierre de lectura',
          resultado: 'Stock sistema total = 26 uds (diferencia contable 0).',
        },
      ],
    },
    {
      type: 'text',
      title: 'Conclusión gerencial',
      paragraphs: [
        'El historial del Cable Aroax 644, con la evidencia confirmada, **explica el stock de 26 unidades** sin diferencia contable en la fórmula de incorporaciones menos ventas completed.',
        'Las **51 unidades incorporadas** (todas registradas en Zona Gamer) sostienen el ciclo. De ellas, **25 se vendieron** en 24 facturas completed; el resto permanece en sucursales tras una red de **traslados (35 uds movidas)** que no crea mercancía nueva.',
        'Hubo **dos cancelaciones** con restitución documentada; en la reconstrucción usada tienen **efecto neto cero**.',
        'Recomendación operativa: si gerencia requiere certeza física, hacer **conteo por sucursal** (Zona Gamer 11, La Isla 9, Marino 6, Store 0, Centro 0) y contrastar solo esas cifras. El sistema, por sí solo, ya cuadra en 26.',
      ],
    },
    {
      type: 'text',
      title: 'Fuentes de evidencia y limitaciones',
      paragraphs: [
        'Fuentes: `products`, `inventories`, `inventory_movements`, `inventory_transfers`, `sales`, `sale_items`. Script de evidencias: `sql/evidencias_informe_sku_8620220106003_aroax644.sql`. Estándar documental: `PublicInforme` (serie Galaxy A16 / respuesta al gerente).',
        'Limitaciones: (1) no se adjunta el listado completo de 79 movimientos ni el detalle de las 24 facturas en este borrador; (2) no se realizó conteo físico; (3) posibles filas ADJUST automáticas del ledger no se tratan como operaciones de negocio independientes; (4) los dos traslados de 10 uds el 09-jun-2026 (segundos aparte) se reportan como operaciones registradas según la evidencia confirmada — no se reinterpretan aquí; (5) usuarios del POS = registro digital, no atribución física verificada.',
        'Pendiente documental: listado individual de las **24 facturas** completed (no inventado en este informe).',
      ],
    },
    {
      type: 'code',
      title: 'Identificadores de control',
      language: 'text',
      code: [
        `Producto: ${PRODUCTO}`,
        `SKU: ${SKU}`,
        `Product ID: ${PRODUCT_ID}`,
        `Slug: ${SLUG_HISTORIAL_AROAX_644}`,
        'Conciliación: 25 + 25 + 1 - 25 = 26',
      ].join('\n'),
    },
    {
      type: 'links',
      title: 'Ver también',
      items: [
        {
          label: 'Veredicto histórico — Cable Aroax 644',
          href: '/informe/veredicto-historico-cable-aroax-644-8620220106003-2026-10',
        },
        {
          label: 'Catálogo de informes',
          href: '/informes',
        },
        {
          label: 'Antecedente — Galaxy A16 respuesta al gerente',
          href: '/informe/respuesta-gerente-galaxy-a16-cero-carga-facturas-2026-07',
        },
      ],
    },
  ],
};

export const ALL_HISTORIAL_AROAX_644_INFORMES: PublicInforme[] = [
  informeHistorialInventarioCableAroax644,
];
