import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-11-04';
const SKU = 'RF8Y81160QR';
const FACTURA = 'FAC-20261010-07881';

/** Informe B — trazabilidad técnica FAC-07881 (A17 4+4). */
export const SLUG_TRAZABILIDAD_FAC_07881_A17 =
  'trazabilidad-fac-20261010-07881-a17-4plus4-2026-11';

const SLUG_AUDITORIA_MOVIMIENTOS_A17 =
  'auditoria-movimientos-galaxy-a17-rfgya08tsly-rf8y81160qr-2026-11';

/**
 * Nota técnica: discontinuidad de traza ADJUST en venta multi-línea.
 * No publica IMEI ni datos personales del cliente.
 * Código inspeccionado en migraciones del repo; config Live del trigger = no re-verificada en prod en esta nota.
 */
export const informeTrazabilidadFac07881A17: PublicInforme = {
  slug: SLUG_TRAZABILIDAD_FAC_07881_A17,
  titulo: 'Trazabilidad técnica — FAC-20261010-07881 (Galaxy A17 4+4)',
  subtitulo:
    'Dos OUT comerciales · un ADJUST 3→2 · explicación por deduplicación de 1 s en audit_inventory_change',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'inventario',
  tags: [
    'inventario',
    'galaxy-a17',
    'trazabilidad',
    'fac-07881',
    SKU,
    'adjust',
  ],
  relacionados: [INFORMES_CATALOGO_SLUG, SLUG_AUDITORIA_MOVIMIENTOS_A17],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Destinatario', value: 'Gerencia / soporte técnico inventario' },
    { label: 'Factura', value: FACTURA },
    { label: 'Fecha factura', value: '2026-10-10' },
    { label: 'Sucursal', value: 'Tu Móvil Centro' },
    { label: 'SKU', value: SKU },
    { label: 'Producto', value: 'Samsung Galaxy A17 128GB / 4+4' },
    { label: 'Estado factura', value: 'completed' },
    {
      label: 'URL',
      value: `/informe/${SLUG_TRAZABILIDAD_FAC_07881_A17}`,
    },
  ],
  sections: [
    {
      type: 'hero',
      badge:
        'INFORME B · Trazabilidad · FAC-20261010-07881 · Solo lectura · Sin datos personales',
    },
    {
      type: 'verdict',
      titulo:
        'Discontinuidad de traza ADJUST — sin pérdida de mercancía demostrada',
      detalle: [
        'La factura **completed** registra **dos unidades** del mismo SKU (dos líneas). Hay **dos movimientos OUT (−1)** y, en el mismo instante, **un ADJUST automático 3→2**.',
        'No aparece un ADJUST explícito **2→1**. Una transferencia posterior (12/10) en Centro registra **1→6**, compatible con stock **1** tras descontar las dos unidades.',
        '**No** se afirma venta duplicada, pérdida de mercancía ni falla confirmada de descuento. El stock operativo es `inventories.qty`; los OUT documentan la venta.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'table',
      title: '1. Evidencia documental (sin IMEI ni datos personales)',
      headers: ['Elemento', 'Valor'],
      rows: [
        { cells: ['Factura', FACTURA] },
        { cells: ['Estado', 'completed'] },
        { cells: ['Sucursal', 'Tu Móvil Centro'] },
        { cells: ['SKU', SKU] },
        { cells: ['Líneas del mismo producto', '2 (una unidad por línea)'] },
        { cells: ['Precio unitario (documentado)', 'USD 199 c/u · total USD 398'] },
        { cells: ['Movimientos OUT', '2 × (−1)'] },
        { cells: ['ADJUST automático visible', 'old_qty 3 → new_qty 2'] },
        {
          cells: [
            'Posterior (12/10)',
            'Transferencia a Centro con traza automática 1 → 6 (+5)',
          ],
        },
      ],
    },
    {
      type: 'timeline',
      title: '2. Reconstrucción cronológica (Centro)',
      items: [
        {
          fecha: 't0',
          fase: 'Antes de la venta',
          resultado:
            'Compatible con stock Centro = 3 (inferido del ADJUST 3→2).',
        },
        {
          fecha: 't1',
          fase: 'Primera línea',
          resultado:
            'UPDATE inventories −1 → stock 2; posible ADJUST 3→2; OUT −1.',
        },
        {
          fecha: 't2',
          fase: 'Segunda línea',
          resultado:
            'UPDATE inventories −1 → stock 1; OUT −1; ADJUST 2→1 omitido por dedupe.',
        },
        {
          fecha: 't3',
          fase: 'Post-venta',
          resultado: 'Stock Centro esperado = 1.',
        },
        {
          fecha: '12/10',
          fase: 'Transferencia +5',
          resultado: 'Traza automática 1→6 — refuerza stock previo = 1.',
        },
      ],
    },
    {
      type: 'text',
      title: '3. Mecanismo en código (inspeccionado en el repositorio)',
      paragraphs: [
        'La RPC `process_sale` recorre **cada ítem** del carrito. En teléfonos exige **qty = 1** e IMEI por línea; por cada línea hace `UPDATE inventories` (−1) e inserta un movimiento **OUT**.',
        'El trigger `trg_audit_inventory_change` / función `audit_inventory_change()` inserta un **ADJUST** con `old_qty` / `new_qty` tras cada cambio de `qty`.',
        'La misma función **omite** el ADJUST si ya existe un movimiento del mismo producto/tienda en el **último segundo** (`created_at > now() - interval \'1 second\'`).',
        'En una factura multi-línea del mismo SKU en el mismo segundo: el primer UPDATE suele dejar ADJUST 3→2; el segundo UPDATE baja a 1 pero **no** deja ADJUST 2→1; sí se insertan **dos OUT**.',
        'Referencias en repo: `supabase/migrations/20260602120000_require_phone_imei_process_sale.sql` (loop de ítems + OUT); `supabase/migrations/20250209160000_trigger_audit_inventory_changes.sql` y `20250209200000_adjust_reason_aumento_disminucion.sql` (dedupe 1 s).',
      ],
    },
    {
      type: 'table',
      title: '4. Qué está demostrado y qué no',
      headers: ['Afirmación', 'Estado'],
      rows: [
        {
          cells: [
            'Dos unidades facturadas (completed) con dos OUT',
            'Verificado en evidencia de auditoría',
          ],
        },
        {
          cells: [
            'ADJUST 3→2 en el mismo instante',
            'Verificado en historial consultado',
          ],
        },
        {
          cells: [
            'Stock Centro 1 antes del traslado 12/10',
            'Compatible / reforzado por ADJUST 1→6',
          ],
        },
        {
          cells: [
            'Explicación por filtro 1 s en audit_inventory_change',
            'Confirmado en código del repositorio',
          ],
        },
        {
          cells: [
            'Que el trigger Live sea idéntico al de esas migraciones',
            'No re-verificado en producción en esta nota',
          ],
        },
        { cells: ['Pérdida de mercancía', 'No demostrada'] },
        { cells: ['Venta duplicada / descuento incorrecto', 'No demostrado'] },
        {
          cells: [
            'Integridad completa de la cadena ADJUST (3→2→1)',
            'No certificada — falta el escalón 2→1 en traza automática',
          ],
        },
      ],
    },
    {
      type: 'text',
      title: '5. Conclusión',
      paragraphs: [
        'Se documenta una **discontinuidad de trazabilidad del registro automático ADJUST**, explicable por el **filtro de deduplicación de un segundo** en `audit_inventory_change`, **sin impacto negativo de inventario demostrado**.',
        'Para conciliar ventas multi-línea conviene apoyarse en **sale_items / OUT / factura**, no solo en la secuencia `old_qty`→`new_qty` de ADJUST.',
        'Cualquier cambio futuro del trigger queda **fuera de este informe** y requeriría autorización, migración y pruebas aparte.',
      ],
    },
    {
      type: 'links',
      title: 'Documentos relacionados',
      items: [
        {
          label: 'Informe A — Auditoría gerencial Galaxy A17',
          href: `/informe/${SLUG_AUDITORIA_MOVIMIENTOS_A17}`,
        },
        { label: 'Catálogo de informes', href: '/informes' },
      ],
    },
  ],
};

export const ALL_TRAZABILIDAD_FAC_07881_A17_INFORMES: PublicInforme[] = [
  informeTrazabilidadFac07881A17,
];
