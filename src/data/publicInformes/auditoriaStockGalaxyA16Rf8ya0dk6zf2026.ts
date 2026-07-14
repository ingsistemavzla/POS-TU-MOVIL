import type { InformeSection, PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-07-14';
const PRODUCTO = 'samsung galaxy a16 128gb/4+4';
const SKU = 'RF8YA0DK6ZF';

export const SLUG_A16_PARTE_1 = 'auditoria-galaxy-a16-parte-1-deteccion-2026-07';
export const SLUG_A16_PARTE_2 = 'auditoria-galaxy-a16-parte-2-analisis-sql-2026-07';
export const SLUG_A16_PARTE_3 = 'auditoria-galaxy-a16-parte-3-conclusion-2026-07';
/** Alias histórico del informe único (ahora redirige conceptualmente a la parte 3) */
export const SLUG_A16_LEGACY = 'auditoria-stock-galaxy-a16-rf8ya0dk6zf-2026-07';

const SERIE = [SLUG_A16_PARTE_1, SLUG_A16_PARTE_2, SLUG_A16_PARTE_3] as const;

function navInicioParte1(): InformeSection {
  return {
    type: 'links',
    title: 'Estás en la Parte 1 de 3 — Detección',
    items: [
      {
        label: '→ Continuar a la Parte 2: Análisis SQL',
        href: `/informe/${SLUG_A16_PARTE_2}`,
      },
    ],
  };
}

function navFinParte1(): InformeSection {
  return {
    type: 'links',
    title: 'Fin de la Parte 1 — Continúa la investigación',
    items: [
      {
        label: '→ Continuar a la Parte 2: Análisis SQL',
        href: `/informe/${SLUG_A16_PARTE_2}`,
      },
      { label: 'Parte 3: Conclusión y solución', href: `/informe/${SLUG_A16_PARTE_3}` },
      { label: 'Catálogo de informes', href: '/informes' },
    ],
  };
}

function navInicioParte2(): InformeSection {
  return {
    type: 'links',
    title: 'Estás en la Parte 2 de 3 — Análisis SQL',
    items: [
      {
        label: '→ Continuar a la Parte 3: Conclusión y solución',
        href: `/informe/${SLUG_A16_PARTE_3}`,
      },
      { label: '← Volver a la Parte 1: Detección', href: `/informe/${SLUG_A16_PARTE_1}` },
    ],
  };
}

function navFinParte2(): InformeSection {
  return {
    type: 'links',
    title: 'Fin de la Parte 2 — Continúa hacia la conclusión',
    items: [
      {
        label: '→ Continuar a la Parte 3: Conclusión y solución',
        href: `/informe/${SLUG_A16_PARTE_3}`,
      },
      { label: '← Volver a la Parte 1: Detección', href: `/informe/${SLUG_A16_PARTE_1}` },
      { label: 'Catálogo de informes', href: '/informes' },
    ],
  };
}

function navInicioParte3(): InformeSection {
  return {
    type: 'links',
    title: 'Estás en la Parte 3 de 3 — Conclusión y solución',
    items: [
      { label: '← Volver a la Parte 2: Análisis SQL', href: `/informe/${SLUG_A16_PARTE_2}` },
      { label: '← Ir a la Parte 1: Detección', href: `/informe/${SLUG_A16_PARTE_1}` },
    ],
  };
}

function navFinParte3(): InformeSection {
  return {
    type: 'links',
    title: 'Fin de la serie — Releer o volver al catálogo',
    items: [
      { label: '← Volver a la Parte 2: Análisis SQL', href: `/informe/${SLUG_A16_PARTE_2}` },
      { label: '← Ir a la Parte 1: Detección', href: `/informe/${SLUG_A16_PARTE_1}` },
      { label: 'Catálogo de informes', href: '/informes' },
    ],
  };
}

export const informeGalaxyA16Parte1: PublicInforme = {
  slug: SLUG_A16_PARTE_1,
  titulo: 'Galaxy A16 — Parte 1: Detección del desfase',
  subtitulo:
    'Serie 1/3. Cómo detectamos que el sistema tenía 1 unidad de más frente al físico (SKU RF8YA0DK6ZF).',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'validacion',
  tags: ['inventario', 'galaxy-a16', 'parte-1', 'detección', SKU],
  relacionados: [INFORMES_CATALOGO_SLUG, ...SERIE, SLUG_A16_LEGACY],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Serie', value: 'Parte 1 de 3 — Detección' },
    { label: 'Producto', value: PRODUCTO },
    { label: 'SKU', value: SKU },
    { label: 'Fecha', value: FECHA_INFORME },
    { label: 'Siguiente', value: `/informe/${SLUG_A16_PARTE_2}` },
  ],
  sections: [
    { type: 'hero', badge: 'Serie forense · Parte 1/3 · Detección' },
    navInicioParte1(),
    {
      type: 'verdict',
      titulo: 'Parte 1 — Se confirma un desfase de +1 en el sistema',
      detalle: [
        'El producto **samsung galaxy a16 128gb/4+4** (SKU **RF8YA0DK6ZF**) aparece en el sistema con inventario que no cuadra con el conteo físico: **hay 1 dispositivo de más en pantalla** respecto a lo que se encuentra en tienda.',
        'Al abrir Artículos, el stock por tienda ya mostraba un mapa claro. Misma lectura en base de datos. Eso descartó un bug de visualización: **la BD y la UI coinciden**; el problema no es “la pantalla miente”, sino **físico vs registro**.',
        'En esta primera etapa **no se sabe aún** si la causa fue una venta sin factura, un ajuste manual, un traslado incompleto o una cancelación. Solo se fija el hecho: **sistema total = 5; físico reportado = 4 (falta 1)**.',
      ].join('\n\n'),
      ok: false,
    },
    {
      type: 'text',
      title: 'Qué se reportó al inicio',
      paragraphs: [
        'Operación indicó que el A16 **RF8YA0DK6ZF** “está dando 1 de más en el sistema” y no se encuentra en físico. La pregunta de negocio fue: ¿se vendió sin facturar?, ¿se bajó mal a mano?, ¿hubo otro movimiento?',
        'Se decidió una auditoría forense sobre `inventories`, `inventory_movements`, `sales` y `sale_items`, sin corregir stock hasta tener causa.',
      ],
    },
    {
      type: 'table',
      title: 'Stock en sistema al momento de la auditoría (2026-07-14)',
      headers: ['Tienda', 'Stock sistema', 'Última actualización'],
      rows: [
        { cells: ['Tu Móvil Centro', '0', '2026-07-08 13:12'] },
        { cells: ['Tu Móvil La Isla', '2', '2026-07-01 19:50'] },
        { cells: ['Tu Móvil Marino', '2', '2026-07-11 16:41'] },
        { cells: ['Tu Móvil Store', '0', '2026-06-26 16:46'] },
        { cells: ['Zona Gamer Margarita', '1', '2026-07-11 16:05'] },
        { cells: ['TOTAL SISTEMA', '5', '—'] },
      ],
    },
    {
      type: 'steps',
      title: 'Cómo se detuvo la búsqueda en esta fase',
      items: [
        {
          paso: '1',
          accion: 'Leer stock por tienda en UI (Artículos)',
          resultado: 'Total 5 unidades en sistema',
        },
        {
          paso: '2',
          accion: 'Repetir la misma pregunta en SQL sobre inventories',
          resultado: 'Mismos números → UI = BD',
        },
        {
          paso: '3',
          accion: 'Separar “error de pantalla” de “error de inventario físico”',
          resultado: 'Se trabaja como desfase físico vs sistema',
        },
        {
          paso: '4',
          accion: 'Continuar a Parte 2 (análisis SQL de movimientos y ventas)',
          resultado: 'Buscar la causa en bitácora, no corregir a ciegas',
        },
      ],
    },
    navFinParte1(),
  ],
};

export const informeGalaxyA16Parte2: PublicInforme = {
  slug: SLUG_A16_PARTE_2,
  titulo: 'Galaxy A16 — Parte 2: Análisis SQL y rastreo',
  subtitulo:
    'Serie 2/3. Cómo se ejecutaron las pruebas, qué se descartó y qué pistas quedaron vivas.',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'validacion',
  tags: ['inventario', 'galaxy-a16', 'parte-2', 'sql', SKU],
  relacionados: [INFORMES_CATALOGO_SLUG, ...SERIE, SLUG_A16_LEGACY],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Serie', value: 'Parte 2 de 3 — Análisis SQL' },
    { label: 'SKU', value: SKU },
    { label: 'Fecha', value: FECHA_INFORME },
    { label: 'Anterior', value: `/informe/${SLUG_A16_PARTE_1}` },
    { label: 'Siguiente', value: `/informe/${SLUG_A16_PARTE_3}` },
  ],
  sections: [
    { type: 'hero', badge: 'Serie forense · Parte 2/3 · Análisis SQL' },
    navInicioParte2(),
    {
      type: 'verdict',
      titulo: 'Parte 2 — La contabilidad de ventas cuadra; la pista está en una cancelación',
      detalle: [
        'Se revisó el historial completo de `inventory_movements` y las ventas en `sale_items`. Hallazgo clave de control: **unidades facturadas = unidades OUT = 149**. Eso **descarta** la teoría de “se vendió y no se facturó”.',
        'También se aprendió a leer la bitácora: cada venta deja **OUT + ADJUST** (eco del trigger). Sumar ambos como dos bajas sería un error. Las entradas grandes (+10/+15/+20) son **aumentos manuales de mercancía**, no el fantasma.',
        'Al filtrar ADJUST “huérfanos” y buscar referencias a facturas, apareció la pista viva: **restitución IN por cancelación de FAC-20260618-04485** el **18-jun-2026 11:15** en **Zona Gamer**. La factura **ya no existe** en `sales` (0 filas), pero el **+1 al inventario sí quedó**.',
      ].join('\n\n'),
      ok: false,
    },
    {
      type: 'timeline',
      title: 'Orden real en que se fueron ejecutando las pruebas',
      items: [
        {
          fecha: 'Paso A',
          fase: 'Movimientos y ADJUST',
          resultado:
            'Bitácora larga: ventas OUT, transferencias, aumentos manuales. Muchos ADJUST son eco automático, no “alguien bajó a mano”.',
        },
        {
          fecha: 'Paso B',
          fase: 'Stock por tienda (SQL 5)',
          resultado: 'Confirma mapa UI: Isla 2, Marino 2, Zona Gamer 1, total 5.',
        },
        {
          fecha: 'Paso C',
          fase: '¿Existe FAC-04485? (SQL 1)',
          resultado: '0 filas en sales → cancelada/eliminada.',
        },
        {
          fecha: 'Paso D',
          fase: 'ADJUST huérfanos (SQL 2)',
          resultado:
            'Compras grandes = normales. Destacan −1 aislados el 9-jun y 18-jun en Zona Gamer.',
        },
        {
          fecha: 'Paso E',
          fase: 'Ventas facturadas (SQL 3)',
          resultado: 'Lista completed coherente; no hay patrón reciente de venta fantasma.',
        },
        {
          fecha: 'Paso F',
          fase: 'Conciliación (SQL 4)',
          resultado: '149 facturadas = 149 OUT → contabilidad de ventas sana.',
        },
        {
          fecha: 'Paso G',
          fase: 'Búsqueda %04485%',
          resultado:
            'Prueba directa: 1 fila IN +1 en Zona Gamer — restitución por cancelación FAC-20260618-04485.',
        },
      ],
    },
    {
      type: 'table',
      title: 'Qué se descartó y qué quedó vivo',
      headers: ['Hipótesis', 'Resultado', 'Evidencia'],
      rows: [
        {
          cells: [
            'Venta sin factura',
            'DESCARTADA',
            'facturado = OUT (149 = 149)',
          ],
        },
        {
          cells: [
            'Bug UI vs BD',
            'DESCARTADA',
            'Stock UI = inventories',
          ],
        },
        {
          cells: [
            'Ajuste manual reciente raro',
            'POCO PROBABLE',
            'Sin “Disminución/Aumento manual” reciente que explique solo +1 fantasma',
          ],
        },
        {
          cells: [
            'Cancelación con restitución sin retorno físico',
            'VIVA — candidata principal',
            'IN +1 FAC-04485 / 18-jun / Zona Gamer; sales vacío',
          ],
        },
      ],
    },
    {
      type: 'table',
      title: 'Secuencia del 18-jun-2026 en Zona Gamer (evidencia)',
      headers: ['Hora', 'Evento', 'Efecto'],
      rows: [
        {
          cells: [
            '11:12',
            'ADJUST huérfano 6 → 5 (−1)',
            'Compatible con inicio de venta FAC-04485',
          ],
        },
        {
          cells: [
            '11:15',
            'IN restitución +1 (FAC-04485)',
            'Sistema vuelve a sumar la unidad; nace el riesgo +1 vs físico',
          ],
        },
      ],
    },
    {
      type: 'code',
      title: 'SQL que cerró la pista (restitución)',
      language: 'sql',
      code: `SELECT
  im.created_at AT TIME ZONE 'America/Caracas' AS fecha,
  im.type, im.qty, im.reason,
  COALESCE(sf.name, st.name) AS tienda
FROM public.inventory_movements im
JOIN public.products p ON p.id = im.product_id
LEFT JOIN public.stores sf ON sf.id = im.store_from_id
LEFT JOIN public.stores st ON st.id = im.store_to_id
WHERE p.sku = 'RF8YA0DK6ZF'
  AND im.reason ILIKE '%04485%';`,
    },
    navFinParte2(),
  ],
};

export const informeGalaxyA16Parte3: PublicInforme = {
  slug: SLUG_A16_PARTE_3,
  titulo: 'Galaxy A16 — Parte 3: Conclusión y solución',
  subtitulo:
    'Serie 3/3. Causa más probable, significado operativo y plan de conciliación física.',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'validacion',
  tags: ['inventario', 'galaxy-a16', 'parte-3', 'conclusión', 'FAC-04485', SKU],
  relacionados: [INFORMES_CATALOGO_SLUG, ...SERIE, SLUG_A16_LEGACY],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Serie', value: 'Parte 3 de 3 — Conclusión' },
    { label: 'Producto', value: PRODUCTO },
    { label: 'SKU', value: SKU },
    { label: 'Factura pivote', value: 'FAC-20260618-04485' },
    { label: 'Fecha', value: FECHA_INFORME },
    { label: 'Anterior', value: `/informe/${SLUG_A16_PARTE_2}` },
  ],
  sections: [
    { type: 'hero', badge: 'Serie forense · Parte 3/3 · Conclusión' },
    navInicioParte3(),
    {
      type: 'verdict',
      titulo: 'Causa más probable identificada — no es venta sin factura',
      detalle: [
        'Las ventas facturadas coinciden exactamente con las salidas de inventario: **149 = 149**. Por eso **no** hay evidencia de un equipo “vendido por debajo de la mesa” sin factura.',
        'El **+1** frente al físico encaja con una **restitución tipo IN** por cancelación de la factura **FAC-20260618-04485**, el **18 de junio de 2026 a las 11:15**, en **Zona Gamer Margarita**.',
        'Esa factura **ya no existe** en la tabla `sales` (fue cancelada o eliminada). Aun así, el sistema **sí sumó 1 unidad** otra vez al inventario. Si el teléfono **no volvió al estante**, desde ese momento el sistema puede quedar con **1 de más**.',
        'Evidencia directa: movimiento `IN` qty 1 con motivo *Restitución por cancelación de venta - Factura: FAC-20260618-04485* en Zona Gamer Margarita.',
      ].join('\n\n'),
      ok: false,
    },
    {
      type: 'table',
      title: 'Resumen ejecutivo final',
      headers: ['Pregunta', 'Respuesta'],
      rows: [
        {
          cells: [
            '¿Se vendió sin facturar?',
            'No. Facturado = OUT (149 = 149).',
          ],
        },
        {
          cells: [
            '¿UI vs BD desalineada?',
            'No. Ambos muestran total 5.',
          ],
        },
        {
          cells: [
            '¿Cuál es la causa más probable del +1?',
            'Cancelación FAC-04485 con restitución de stock sin retorno físico confirmado.',
          ],
        },
        {
          cells: [
            '¿Dónde ocurrió el evento?',
            'Zona Gamer Margarita — 2026-06-18 11:15.',
          ],
        },
        {
          cells: [
            '¿Qué stock hay hoy en sistema?',
            'Zona Gamer 1 · La Isla 2 · Marino 2 · Centro 0 · Store 0 · Total 5.',
          ],
        },
      ],
    },
    {
      type: 'text',
      title: 'Qué significa operativamente',
      paragraphs: [
        'Hubo una venta (o intento) del A16 en Zona Gamer. Se **canceló**. El sistema **devolvió 1** al inventario.',
        'Si al cancelar el equipo **ya no estaba** en el mostrador (entregado, perdido, no reingresado), la BD quedó optimista: cuenta un aparato que el físico no tiene.',
        'Ese fantasma puede seguir “arrastrándose” en el total aunque después haya más ventas: el sistema siempre lleva **una unidad de más** relativa a ese evento no reconciliado.',
      ],
    },
    {
      type: 'steps',
      title: 'Solución recomendada (conciliación)',
      items: [
        {
          paso: '1',
          accion: 'Contar físico del SKU RF8YA0DK6ZF en Zona Gamer, La Isla y Marino',
          resultado: 'Ubicar en qué tienda el sistema tiene 1 de más',
        },
        {
          paso: '2',
          accion:
            'Si Zona Gamer físico = 0 y sistema = 1 → bajar 1 en Almacén/Artículos',
          resultado: 'Eliminar el fantasma de la restitución FAC-04485',
        },
        {
          paso: '3',
          accion:
            'Si Zona Gamer físico = 1 y sistema = 1 → revisar La Isla (2) o Marino (2)',
          resultado: 'El faltante puede estar en otra sucursal',
        },
        {
          paso: '4',
          accion:
            'Motivo del ajuste: Conciliación física - cancelación FAC-20260618-04485 sin retorno físico / SKU RF8YA0DK6ZF',
          resultado: 'Queda trazabilidad clara en inventory_movements',
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
    navFinParte3(),
  ],
};

/** Conserva el slug original apuntando al cierre (parte 3), con veredicto ampliado */
export const informeAuditoriaStockGalaxyA16: PublicInforme = {
  ...informeGalaxyA16Parte3,
  slug: SLUG_A16_LEGACY,
  titulo: 'Auditoría de stock — Samsung Galaxy A16 128GB/4+4 (cierre)',
  subtitulo:
    'Informe de cierre del desfase +1. Serie completa en 3 partes. SKU RF8YA0DK6ZF · FAC-20260618-04485.',
  relacionados: [INFORMES_CATALOGO_SLUG, ...SERIE],
  meta: [
    ...informeGalaxyA16Parte3.meta,
    { label: 'Serie completa', value: 'Partes 1 → 2 → 3' },
    { label: 'URL pública', value: `/informe/${SLUG_A16_LEGACY}` },
  ],
  sections: [
    { type: 'hero', badge: 'Cierre · Ver también serie 1/3 · 2/3 · 3/3' },
    ...informeGalaxyA16Parte3.sections.filter((s) => s.type !== 'hero'),
    {
      type: 'links',
      title: 'Leer la investigación completa (recomendado)',
      items: [
        { label: 'Parte 1 — Detección del desfase', href: `/informe/${SLUG_A16_PARTE_1}` },
        { label: 'Parte 2 — Análisis SQL y rastreo', href: `/informe/${SLUG_A16_PARTE_2}` },
        { label: 'Parte 3 — Conclusión y solución', href: `/informe/${SLUG_A16_PARTE_3}` },
      ],
    },
  ],
};

export const ALL_AUDITORIA_STOCK_A16_INFORMES: PublicInforme[] = [
  informeGalaxyA16Parte1,
  informeGalaxyA16Parte2,
  informeGalaxyA16Parte3,
  informeAuditoriaStockGalaxyA16,
];
