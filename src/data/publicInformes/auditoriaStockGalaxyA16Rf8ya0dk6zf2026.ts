import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-07-14';
const SLUG = 'auditoria-stock-galaxy-a16-rf8ya0dk6zf-2026-07';

export const informeAuditoriaStockGalaxyA16: PublicInforme = {
  slug: SLUG,
  titulo: 'Auditoría de stock — Samsung Galaxy A16 128GB/4+4',
  subtitulo:
    'Desfase de +1 unidad en sistema vs físico. SKU RF8YA0DK6ZF. Causa probable: restitución por cancelación FAC-20260618-04485 en Zona Gamer Margarita.',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'validacion',
  tags: [
    'inventario',
    'auditoría',
    'galaxy-a16',
    'RF8YA0DK6ZF',
    'cancelación',
    'stock',
    'zona-gamer',
  ],
  relacionados: [
    INFORMES_CATALOGO_SLUG,
    'auditoria-imei-variantes-128-256-2026',
    'inventario-estado-actual-2026-06',
  ],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Fecha informe', value: FECHA_INFORME },
    { label: 'Producto', value: 'samsung galaxy a16 128gb/4+4' },
    { label: 'SKU', value: 'RF8YA0DK6ZF' },
    { label: 'Factura pivote', value: 'FAC-20260618-04485' },
    { label: 'SQL respaldo', value: 'sql/auditoria_sku_RF8YA0DK6ZF.sql' },
    { label: 'URL pública', value: `/informe/${SLUG}` },
  ],
  sections: [
    { type: 'hero', badge: 'Auditoría · Inventario · SKU RF8YA0DK6ZF' },
    {
      type: 'verdict',
      titulo: 'Causa más probable identificada — no es venta sin factura',
      detalle:
        'Ventas facturadas = salidas OUT (149 = 149). El +1 frente al físico encaja con la restitución IN por cancelación de FAC-20260618-04485 el 18-jun-2026 11:15 en Zona Gamer Margarita: la factura ya no existe en sales, pero el sistema sí sumó 1 al inventario. Si el equipo no volvió al estante, el sistema queda con 1 de más.',
      ok: false,
    },
    {
      type: 'text',
      title: 'Contexto del caso',
      paragraphs: [
        'Se reportó que el sistema muestra **1 dispositivo de más** respecto al conteo físico para el Galaxy A16 128GB/4+4 (SKU RF8YA0DK6ZF).',
        'Objetivo de la auditoría: determinar si el desfase viene de una venta no facturada, un ajuste manual, una transferencia incompleta, o una cancelación que restituyó stock sin retorno físico.',
        'Fuentes: consultas a `inventories`, `inventory_movements`, `sales` y `sale_items` en Supabase (julio 2026), más el detalle de pantalla de Artículos.',
      ],
    },
    {
      type: 'table',
      title: 'Veredicto — hallazgos cerrados',
      headers: ['Hallazgo', 'Resultado'],
      rows: [
        {
          cells: [
            'Stock BD vs pantalla',
            'Coincide — total 5 (La Isla 2, Marino 2, Zona Gamer 1, Centro 0, Store 0)',
          ],
        },
        {
          cells: [
            'Ventas vs salidas OUT',
            '149 = 149 → no hay venta sin facturar',
          ],
        },
        {
          cells: [
            'FAC-20260618-04485 en sales',
            '0 filas → factura cancelada / eliminada',
          ],
        },
        {
          cells: [
            'Origen del +1',
            'No fue ajuste manual reciente raro ni transferencia perdida',
          ],
        },
        {
          cells: [
            'Causa más probable',
            'Restitución IN por cancelación FAC-04485 (Zona Gamer, 18-jun-2026 11:15)',
          ],
        },
      ],
    },
    {
      type: 'table',
      title: 'Stock actual por tienda (sistema)',
      description: 'Validado en UI de Artículos y en SQL de inventories (2026-07-14).',
      headers: ['Tienda', 'Stock sistema', 'Última actualización (VE)'],
      rows: [
        { cells: ['Tu Móvil Centro', '0', '2026-07-08 13:12:55'] },
        { cells: ['Tu Móvil La Isla', '2', '2026-07-01 19:50:42'] },
        { cells: ['Tu Móvil Marino', '2', '2026-07-11 16:41:04'] },
        { cells: ['Tu Móvil Store', '0', '2026-06-26 16:46:21'] },
        { cells: ['Zona Gamer Margarita', '1', '2026-07-11 16:05:04'] },
        { cells: ['TOTAL', '5', '—'] },
      ],
    },
    {
      type: 'table',
      title: 'Evento confirmado de restitución (+1)',
      description: 'Consulta: inventory_movements WHERE reason ILIKE %04485%.',
      headers: ['Campo', 'Valor'],
      rows: [
        { cells: ['Fecha', '2026-06-18 11:15:43 (America/Caracas)'] },
        { cells: ['Tipo', 'IN (entrada al inventario)'] },
        { cells: ['Cantidad', '+1.00'] },
        {
          cells: [
            'Motivo',
            'Restitución por cancelación de venta - Factura: FAC-20260618-04485 - Cliente: 95dee478-1ac4-4c15-9eea-759af84b1e40',
          ],
        },
        { cells: ['Tienda', 'Zona Gamer Margarita'] },
        {
          cells: [
            'Estado de la factura en sales',
            'No existe (0 filas) — cancelada/eliminada, pero la devolución de stock sí quedó',
          ],
        },
      ],
    },
    {
      type: 'timeline',
      title: 'Secuencia del 18-jun-2026 (Zona Gamer)',
      items: [
        {
          fecha: '2026-06-18 11:12',
          fase: 'Ajuste huérfano −1',
          resultado: 'Stock Zona Gamer 6 → 5. ADJUST solo (sin OUT/IN/TRANSFER en el mismo segundo). Compatible con inicio de venta FAC-04485.',
        },
        {
          fecha: '2026-06-18 11:15',
          fase: 'Restitución +1',
          resultado:
            'IN +1 por cancelación FAC-20260618-04485. Sistema vuelve a sumar la unidad. Si el físico no regresó al estante, nace el desfase +1.',
        },
      ],
    },
    {
      type: 'table',
      title: 'Otros ADJUST huérfanos relevantes (contexto)',
      description:
        'Los +10/+15/+20 del historial son entradas manuales reales (compras), no el error. Solo estos −1 aislados aportan señal.',
      headers: ['Fecha', 'Tienda', 'Delta', 'Interpretación'],
      rows: [
        {
          cells: [
            '2026-06-18 11:12',
            'Zona Gamer',
            '6 → 5 (−1)',
            'Intento de venta previo a cancelación FAC-04485',
          ],
        },
        {
          cells: [
            '2026-06-18 11:15',
            'Zona Gamer',
            '+1 (IN restitución)',
            'Candidato #1 del desfase físico vs sistema',
          ],
        },
        {
          cells: [
            '2026-06-09 12:44',
            'Zona Gamer',
            '15 → 14 (−1)',
            'Intento fallido; luego venta completed FAC-20260609-04260',
          ],
        },
      ],
    },
    {
      type: 'text',
      title: 'Cómo leer inventory_movements (importante)',
      paragraphs: [
        'Cada venta suele generar **dos filas**: `OUT` (venta / process_sale) + `ADJUST` ("Ajuste automático de auditoría"). **No sumar ambas** como dos bajas; el ADJUST es eco del trigger sobre `inventories`.',
        'Las transferencias también generan pares `TRANSFER` + `ADJUST`. Las entradas reales aparecen como "Aumento manual de stock (...)" y/o ADJUST con old_qty/new_qty.',
        'Para saber si se vendió de verdad: priorizar `sale_items` / facturas `completed`, no solo la lista de ADJUST.',
      ],
    },
    {
      type: 'table',
      title: 'Interpretación de las pruebas SQL ejecutadas',
      headers: ['Prueba', 'Resultado', 'Qué demuestra'],
      rows: [
        {
          cells: [
            'SQL stock por tienda',
            'Coincide con UI (total 5)',
            'La BD está alineada con la pantalla; el problema es físico vs sistema',
          ],
        },
        {
          cells: [
            'SQL FAC-04485 en sales',
            '0 filas',
            'Factura eliminada/cancelada; ya no hay registro contable de la venta',
          ],
        },
        {
          cells: [
            'SQL ADJUST huérfanos',
            'Entradas grandes = compras; −1 aislados = intentos/cancelación',
            'Descarta “ajuste raro reciente” como causa principal',
          ],
        },
        {
          cells: [
            'SQL ventas facturadas (sale_items)',
            'Todas completed en la muestra',
            'Historial comercial coherente',
          ],
        },
        {
          cells: [
            'SQL conciliación facturado vs OUT',
            '149 = 149; diferencia 0',
            'Descarta “se vendió y no se facturó”',
          ],
        },
        {
          cells: [
            'SQL reason %04485%',
            '1 fila IN +1 Zona Gamer',
            'Prueba directa de la restitución que explica el +1',
          ],
        },
      ],
    },
    {
      type: 'text',
      title: 'Qué NO parece ser',
      paragraphs: [
        '**No** parece una venta fantasma sin factura: `unidades_facturadas` = `unidades_OUT`.',
        '**No** parece un traslado entre tiendas incompleto como causa principal del +1 global.',
        '**No** parece un aumento manual reciente espurio: los aumentos grandes del historial tienen motivo de entrada de mercancía.',
      ],
    },
    {
      type: 'steps',
      title: 'Plan de acción operativo',
      items: [
        {
          paso: '1',
          accion: 'Conteo físico del SKU RF8YA0DK6ZF por tienda (prioridad Zona Gamer, luego La Isla y Marino)',
          resultado: 'Saber en qué sucursal el sistema tiene 1 de más vs el estante',
        },
        {
          paso: '2',
          accion:
            'Si Zona Gamer físico = 0 y sistema = 1 → bajar 1 unidad en Almacén/Artículos',
          resultado: 'Eliminar el fantasma de la restitución FAC-04485',
        },
        {
          paso: '3',
          accion:
            'Si Zona Gamer físico = 1 y sistema = 1 → buscar el faltante en La Isla (2) o Marino (2)',
          resultado: 'El fantasma ya no está en Zona Gamer; el faltante está en otra sucursal',
        },
        {
          paso: '4',
          accion:
            'Registrar ajuste con motivo: Conciliación física - cancelación FAC-20260618-04485 sin retorno físico / SKU RF8YA0DK6ZF',
          resultado: 'Trazabilidad forense en inventory_movements',
        },
      ],
    },
    {
      type: 'table',
      title: 'Plantilla de conteo físico',
      headers: ['Tienda', 'Sistema', 'Físico (llenar)', 'Diferencia'],
      rows: [
        { cells: ['Zona Gamer Margarita', '1', '', ''] },
        { cells: ['Tu Móvil La Isla', '2', '', ''] },
        { cells: ['Tu Móvil Marino', '2', '', ''] },
        { cells: ['Tu Móvil Centro', '0', '', ''] },
        { cells: ['Tu Móvil Store', '0', '', ''] },
        { cells: ['TOTAL', '5', '', ''] },
      ],
    },
    {
      type: 'code',
      title: 'SQL — evidencia de restitución FAC-04485',
      language: 'sql',
      code: `SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha,
  im.type, im.old_qty, im.new_qty, im.qty, im.reason,
  COALESCE(sf.name, st.name) AS tienda
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND im.reason ILIKE '%04485%';`,
    },
    {
      type: 'code',
      title: 'SQL — stock actual por tienda',
      language: 'sql',
      code: `SELECT
  s.name AS tienda,
  i.qty AS stock_sistema,
  i.updated_at AT TIME ZONE 'America/Caracas' AS ultima_actualizacion
FROM public.inventories i
JOIN public.products p ON p.id = i.product_id
JOIN public.stores s ON s.id = i.store_id
WHERE p.sku = 'RF8YA0DK6ZF'
ORDER BY s.name;`,
    },
    {
      type: 'links',
      title: 'Referencias',
      items: [
        { label: 'Catálogo de informes', href: '/informes' },
        {
          label: 'SQL auditoría completa del SKU',
          href: '/informe/auditoria-stock-galaxy-a16-rf8ya0dk6zf-2026-07',
        },
        {
          label: 'Auditoría IMEI / variantes',
          href: '/informe/auditoria-imei-variantes-128-256-2026',
        },
      ],
    },
  ],
};

export const ALL_AUDITORIA_STOCK_A16_INFORMES: PublicInforme[] = [
  informeAuditoriaStockGalaxyA16,
];
