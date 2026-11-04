import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-11-04';

/** Informe A — auditoría gerencial A17 (6+6 y 4+4). */
export const SLUG_AUDITORIA_MOVIMIENTOS_A17 =
  'auditoria-movimientos-galaxy-a17-rfgya08tsly-rf8y81160qr-2026-11';

const SLUG_TRAZABILIDAD_FAC_07881 =
  'trazabilidad-fac-20261010-07881-a17-4plus4-2026-11';

/**
 * Snapshot documental de movimientos/ventas A17 (ventana ~30 días).
 * Stocks 15 / 3 = verificación previa; no lectura Live al abrir la URL.
 * OUT cruzados con sales.status = completed (SELECT Supabase).
 */
export const informeAuditoriaMovimientosGalaxyA17: PublicInforme = {
  slug: SLUG_AUDITORIA_MOVIMIENTOS_A17,
  titulo: 'Auditoría gerencial — Samsung Galaxy A17 (6+6 y 4+4)',
  subtitulo:
    'Movimientos, ventas completed y stocks verificados · últimos ~30 días (corte documental 4 nov 2026).',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'inventario',
  tags: [
    'inventario',
    'galaxy-a17',
    'auditoria',
    'movimientos',
    'RFGYA08TSLY',
    'RF8Y81160QR',
  ],
  relacionados: [INFORMES_CATALOGO_SLUG, SLUG_TRAZABILIDAD_FAC_07881],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Destinatario', value: 'Gerencia / operaciones de inventario' },
    { label: 'SKU 6+6', value: 'RFGYA08TSLY' },
    { label: 'SKU 4+4', value: 'RF8Y81160QR' },
    { label: 'Fecha informe', value: FECHA_INFORME },
    {
      label: 'URL',
      value: `/informe/${SLUG_AUDITORIA_MOVIMIENTOS_A17}`,
    },
  ],
  sections: [
    {
      type: 'hero',
      badge:
        'INFORME A · Auditoría gerencial · Galaxy A17 · TU MÓVIL POS · Solo lectura',
    },
    {
      type: 'verdict',
      titulo:
        '38 OUT · 37 facturas completed · stocks verificados 15 (6+6) y 3 (4+4)',
      detalle: [
        'Validación comercial: los movimientos OUT de la ventana están respaldados por facturas en estado **completed** (SELECT en Supabase).',
        'Esto **no** sustituye una **conciliación histórica integral** del inventario: el stock inicial del período **no está certificado** (no hay snapshot independiente de apertura).',
        'Stocks globales **15** y **3** corresponden a una verificación previa documentada; este informe es un **snapshot** y no consulta existencias en vivo al abrirse.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'table',
      title: '1. Resumen consolidado',
      headers: ['Métrica', '6+6 RFGYA08TSLY', '4+4 RF8Y81160QR', 'Total'],
      rows: [
        { cells: ['Aumentos manuales', '+20', '+30', '+50'] },
        { cells: ['Unidades OUT', '11', '27', '38'] },
        { cells: ['Facturas distintas', '11', '26', '37'] },
        { cells: ['Estado facturas (cruce OUT)', '100% completed', '100% completed', '100% completed'] },
        { cells: ['Transferencias (neto global)', '0', '0', '0'] },
        { cells: ['Ud movidas en traslados', '15', '17', '—'] },
        { cells: ['Restituciones IN (anulaciones)', '0', '2', '2'] },
        { cells: ['Stock verificado (previo)', '15', '3', '18'] },
        { cells: ['Stock inicial del período', 'No certificado', 'No certificado', '—'] },
      ],
    },
    {
      type: 'text',
      title: '2. Reglas de lectura',
      paragraphs: [
        'No se suman los registros **ADJUST automático de auditoría** junto con OUT / IN / TRANSFER / aumento manual del mismo cambio físico.',
        'Los traslados entre sucursales **no** modifican el stock global.',
        '**Validación comercial** = OUT vigentes + factura completed. **Conciliación integral** = requeriría además apertura certificada y existencias por sucursal al corte.',
      ],
    },
    {
      type: 'table',
      title: '3. Galaxy A17 6+6 — RFGYA08TSLY',
      headers: ['Concepto', 'Detalle'],
      rows: [
        { cells: ['Producto', 'Samsung Galaxy A17 128GB / 6+6'] },
        { cells: ['Aumentos manuales', '08/10 +10 ZG · 24/10 +10 ZG · Total +20'] },
        { cells: ['OUT / facturas completed', '11 unidades · 11 facturas'] },
        {
          cells: [
            'OUT por sucursal',
            'Centro 5 · La Isla 3 · Marino 2 · Zona Gamer 1',
          ],
        },
        {
          cells: [
            'Transferencias',
            '15 ud movidas (ZG→otras); neto global 0',
          ],
        },
        { cells: ['Restituciones', 'Ninguna en el extracto'] },
        { cells: ['Stock verificado', '15 (global, verificación previa)'] },
        {
          cells: [
            'Nota apertura',
            'Hubo ventas 5–7/10 antes de la carga del 8/10 → existía stock previo; inicial no certificado',
          ],
        },
      ],
    },
    {
      type: 'table',
      title: '4. Galaxy A17 4+4 — RF8Y81160QR',
      headers: ['Concepto', 'Detalle'],
      rows: [
        { cells: ['Producto', 'Samsung Galaxy A17 128GB / 4+4'] },
        { cells: ['Aumentos manuales', '08/10 +20 ZG · 24/10 +10 ZG · Total +30'] },
        { cells: ['OUT / facturas completed', '27 unidades · 26 facturas'] },
        {
          cells: [
            'OUT por sucursal',
            'Centro 9 · La Isla 1 · Marino 4 · Zona Gamer 13',
          ],
        },
        {
          cells: [
            'FAC-20261010-07881',
            '2 ud en Centro (dos líneas); factura completed — ver Informe B',
          ],
        },
        {
          cells: [
            'Transferencias',
            '17 ud movidas (ZG→otras); neto global 0',
          ],
        },
        {
          cells: [
            'Restituciones IN',
            'FAC-20261017-08038 (Centro) · FAC-20261102-08456 (Zona Gamer). OUT de esas ventas ya no figuran en el historial OUT consultado',
          ],
        },
        { cells: ['Stock verificado', '3 (global, verificación previa)'] },
        {
          cells: [
            'Control aritmético',
            '+30 cargas − 27 OUT = 3 (coincide con stock verificado). Ilustrativo; no certifica apertura',
          ],
        },
      ],
    },
    {
      type: 'timeline',
      title: '5. Hitos relevantes',
      items: [
        {
          fecha: '05–07/10',
          fase: '6+6',
          resultado: 'Ventas antes de la primera carga manual del 8/10 (stock previo).',
        },
        {
          fecha: '08/10',
          fase: 'Cargas ZG',
          resultado: '+20 (4+4) y +10 (6+6) aumentos manuales.',
        },
        {
          fecha: '09–12/10',
          fase: 'Traslados',
          resultado: 'Distribución desde Zona Gamer hacia Centro, Isla y otras.',
        },
        {
          fecha: '10/10',
          fase: 'FAC-07881',
          resultado: '2 ud 4+4 en Centro (completed). Detalle técnico en Informe B.',
        },
        {
          fecha: '17/10 y 02/11',
          fase: 'Anulaciones 4+4',
          resultado: 'Restituciones IN; OUT eliminados del historial OUT.',
        },
        {
          fecha: '24/10',
          fase: 'Cargas ZG',
          resultado: '+10 en cada SKU (aumentos manuales).',
        },
        {
          fecha: 'Corte',
          fase: 'Verificación',
          resultado: 'Stocks documentados 15 (6+6) y 3 (4+4).',
        },
      ],
    },
    {
      type: 'text',
      title: '6. Conclusiones',
      paragraphs: [
        '**38** unidades OUT y **37** facturas distintas, todas **completed** en el cruce verificado.',
        'Operación coherente: cargas en Zona Gamer, traslados sin efecto neto global, ventas documentadas.',
        'El modelo 4+4 conserva **dos restituciones** por anulaciones cuyos OUT ya no aparecen.',
        'La particularidad del ADJUST 3→2 en FAC-07881 se documenta en el **Informe B**; no se interpreta aquí como pérdida.',
      ],
    },
    {
      type: 'links',
      title: 'Documentos relacionados',
      items: [
        {
          label: 'Informe B — Trazabilidad FAC-20261010-07881',
          href: `/informe/${SLUG_TRAZABILIDAD_FAC_07881}`,
        },
        { label: 'Catálogo de informes', href: '/informes' },
      ],
    },
  ],
};

export const ALL_AUDITORIA_MOVIMIENTOS_A17_INFORMES: PublicInforme[] = [
  informeAuditoriaMovimientosGalaxyA17,
];
