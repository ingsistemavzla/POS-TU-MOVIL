import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-06-18';

export const informeAuditoriaImeiVariantes: PublicInforme = {
  slug: 'auditoria-imei-variantes-128-256-2026',
  titulo: 'Auditoría IMEI y variantes 128/256 GB',
  subtitulo:
    'Diagnóstico SKU-dependiente, integridad ventas-inventario, cruce caja/equipo y plan de blindaje (sin login)',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'validacion',
  tags: ['imei', '128gb', '256gb', 'auditoría', 'inventario', 'variantes', 'pos'],
  relacionados: [
    INFORMES_CATALOGO_SLUG,
    'inventario-estado-actual-2026-06',
    'productos-sin-categoria-inventario-2026',
  ],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Fecha informe', value: FECHA_INFORME },
    { label: 'SQL auditoría', value: 'sql/auditoria_integridad_ventas_inventario.sql' },
    { label: 'Estado Fase 1 código', value: 'Local — sin deploy autorizado' },
    { label: 'URL pública', value: '/informe/auditoria-imei-variantes-128-256-2026' },
  ],
  sections: [
    { type: 'hero', badge: 'Auditoría · IMEI · Variantes' },
    {
      type: 'verdict',
      titulo: 'Contabilidad alineada — riesgo operativo en selección de SKU',
      detalle:
        'En 90 días: factura ↔ movimientos de inventario sin desajustes (Bloque A = 0 filas). IMEI presente en 99,5 % de líneas teléfono. El problema 128 vs 256 es error humano de SKU/caja, no falla masiva del motor de stock.',
      ok: true,
    },
    {
      type: 'text',
      title: 'Problema principal',
      paragraphs: [
        'El POS descuenta inventario por product_id (SKU) elegido en carrito. Si el cajero factura 128 GB teniendo en mano 256 GB (o caja cruzada con equipo), el sistema obedece el SKU del carrito: la contabilidad total cuadra, pero el detalle por variante queda mal.',
        'No es un bug de suma/resta en process_sale; es dependencia del SKU seleccionado (sistema SKU-dependiente).',
        'Caso operativo jun-2026: dos equipos con cajas/capacidades intercambiadas. Los IMEI físicos no coincidían exactamente con ninguna venta del día; la búsqueda fuzzy histórica sí arrojó candidatos.',
      ],
    },
    {
      type: 'table',
      title: 'Resumen auditoría SQL (90 días)',
      headers: ['Prueba', 'Resultado', 'Interpretación'],
      rows: [
        {
          cells: [
            'PASO 0 — sale_id en inventory_movements',
            'Existe (uuid)',
            'Conciliación por venta disponible',
          ],
        },
        {
          cells: [
            'Bloque A — sale_items vs movimientos OUT',
            '0 filas',
            'Cantidades facturadas = salidas inventario',
          ],
        },
        {
          cells: [
            'EXTRA — teléfonos con IMEI',
            '1049 / 1054 líneas (99,5 %)',
            'Solo 5 líneas sin IMEI en 90 días',
          ],
        },
        {
          cells: [
            'Bloque C — IMEI duplicado',
            'Varios (incl. 000000…)',
            'Placeholders y reutilización; no prueba 128/256',
          ],
        },
        {
          cells: [
            'Búsqueda exacta IMEI caso jun-2026',
            '0 filas',
            'Esos IMEI no quedaron exactos en ventas',
          ],
        },
      ],
    },
    {
      type: 'table',
      title: 'IMEI del caso operativo (caja/equipo cruzado)',
      description: 'Datos aportados por tienda — búsqueda en Supabase jun-2026.',
      headers: ['IMEI', 'Rol', '¿Exacto en ventas?'],
      rows: [
        {
          cells: [
            '869009083237546',
            'Equipo que se llevó el cliente',
            'No — similitud prefijo 8690 (Note 15 / Xiaomi)',
          ],
        },
        {
          cells: [
            '866132089591527',
            'Equipo en tienda / relacionado',
            'No — solo prefijo 8661 (Redmi A5 128 GB)',
          ],
        },
        {
          cells: [
            '88231509815780',
            'Equipo tienda (14 dígitos)',
            'No — sufijo 5780 en Note 15 256 / Redmi A5',
          ],
        },
        {
          cells: [
            '864812085273822',
            'IMEI adicional consultado',
            'Casi exacto → ver candidato abajo',
          ],
        },
      ],
    },
    {
      type: 'table',
      title: 'Candidatos por similitud IMEI (histórico)',
      description: 'Coincidencia por 4 primeros / 4 últimos dígitos o typo cercano. Revisar en piso antes de corregir stock.',
      headers: ['IMEI buscado', 'N° venta', 'Fecha (VE)', 'Tienda', 'Producto registrado', 'IMEI en venta', 'Cliente'],
      rows: [
        {
          cells: [
            '864812085273822',
            'FAC-20260608-04245',
            '2026-06-08 17:19',
            'Zona Gamer Margarita',
            'xiaomi poco x8 pro 512gb/12+12',
            '864812085273830',
            'crisdarys brito',
          ],
        },
        {
          cells: [
            '869009083237546',
            'FAC-20260509-03575',
            '2026-05-09 11:50',
            'Zona Gamer Margarita',
            'xiaomi note 15 128gb/6+6',
            '869009083237587',
            'marianny longart',
          ],
        },
        {
          cells: [
            '869009083237546',
            'FAC-20260509-03577',
            '2026-05-09 12:00',
            'Zona Gamer Margarita',
            'xiaomi note 15 128gb/6+6',
            '869009083237447',
            'aikme salazar',
          ],
        },
        {
          cells: [
            '869009083237546 (sufijo 7546)',
            'FAC-20260509-03600',
            '2026-05-09 13:53',
            'Tu Móvil Centro',
            'xiaomi redmi a5 64gb/6',
            '868820087127546',
            'YRENE DEL VALLE HERNANDEZ',
          ],
        },
        {
          cells: [
            '88231509815780 (sufijo 5780)',
            'FAC-20260502-03401',
            '2026-05-02 13:30',
            'Zona Gamer Margarita',
            'xiaomi note 15 256gb',
            '862315089815780',
            'mairelys lopez',
          ],
        },
        {
          cells: [
            '866132089591527',
            '—',
            '—',
            '—',
            '—',
            'No vendido con ese IMEI registrado',
            'Equipo probablemente sin venta en sistema',
          ],
        },
      ],
    },
    {
      type: 'table',
      title: 'Ventas teléfono 2026-06-18 (referencia del día)',
      description: 'Ninguna fila contenía los IMEI exactos del caso; lista para cruce manual.',
      headers: ['N° venta', 'Hora (VE)', 'Tienda', 'SKU', 'Producto', 'IMEI', 'Cliente'],
      rows: [
        {
          cells: [
            'FAC-20260618-04493',
            '12:52',
            'Zona Gamer Margarita',
            '2966-verde',
            'xiaomi poco x8 pro 512gb/12+12',
            '865532081424026',
            'oswaldo alfonzo',
          ],
        },
        {
          cells: [
            'FAC-20260618-04492',
            '12:32',
            'Tu Móvil Marino',
            '1556',
            'INIFNIX NOTE 50 PRO 256/12',
            '351315251704091',
            'yuselis marcano',
          ],
        },
        {
          cells: [
            'FAC-20260618-04490',
            '12:13',
            'Tu Móvil Centro',
            'RF8YA0DK6ZF',
            'samsung galaxy a16 128gb/4+4',
            '351577550331229',
            'ana la rosa',
          ],
        },
        {
          cells: [
            'FAC-20260618-04488',
            '11:48',
            'Zona Gamer Margarita',
            '4894947114052',
            'infinix note 60 256gb/8+8',
            '353148231678426',
            'henry ludovic guillen',
          ],
        },
        {
          cells: [
            'FAC-20260618-04487',
            '11:23',
            'Zona Gamer Margarita',
            '69213-65UN00589',
            'xiaomi redmi 15c 256gb/16',
            '866509089775848',
            'david mata',
          ],
        },
      ],
    },
    {
      type: 'text',
      title: 'Conclusión técnica',
      paragraphs: [
        'Las consultas SQL son solo lectura: no modifican POS ni base de datos.',
        '“No rows” en Bloque A confirma alineación cantidades; no detecta cruce 128/256 con mismas cantidades.',
        'Los IMEI 000000… y duplicados históricos indican captura débil; Fase 1 (IMEI obligatorio + rechazo ceros) reduce futuro, no reescribe pasado.',
        'El IMEI 864812085273822 vs 864812085273830 (2 dígitos) es el match más fuerte encontrado en todo el historial.',
      ],
    },
    {
      type: 'steps',
      title: 'Plan acordado (fases)',
      items: [
        {
          paso: '0',
          accion: 'Auditoría SQL ejecutada',
          resultado: 'Integridad OK; calidad IMEI mejorable',
        },
        {
          paso: '1',
          accion: 'Fase 1 — IMEI obligatorio en POS + process_sale',
          resultado: 'Código local listo; sin deploy hasta autorización',
        },
        {
          paso: '1b',
          accion: 'Opcional — “IMEI ya vendido” + rechazo 000000…',
          resultado: 'Complemento anti-reutilización',
        },
        {
          paso: '2',
          accion: 'Pistola por variante (128 vs 256) — EAN de caja distinto por SKU',
          resultado: 'Evita búsqueda manual; no requiere 100 IMEI en entrada',
        },
        {
          paso: '3',
          accion: 'Fase 2 — Maestro unidades (IMEI → SKU) en modelos críticos',
          resultado: 'Piloto Note 15 / modelos con 128+256',
        },
      ],
    },
    {
      type: 'text',
      title: 'Acción operativa inmediata (sin código)',
      paragraphs: [
        'Confirmar IMEI de 15 dígitos en Ajustes → Acerca del teléfono en ambos equipos físicos.',
        'Cruzar con factura impresa del cliente (tienda, hora, modelo).',
        'Si se confirma cruce: ajuste manual de inventario una vez (subir SKU correcto, bajar incorrecto) + nota operativa.',
        'Recepción: dos pilas separadas por SKU (128 aparte de 256) para modelos con variantes.',
      ],
    },
    {
      type: 'code',
      title: 'SQL — buscar venta por IMEI (exacto)',
      language: 'sql',
      code: `SELECT s.invoice_number, s.created_at AT TIME ZONE 'America/Caracas' AS fecha_ve,
  st.name AS tienda, p.sku, p.name AS producto, si.imei, s.customer_name
FROM sale_items si
JOIN sales s ON s.id = si.sale_id
JOIN products p ON p.id = si.product_id
JOIN stores st ON st.id = s.store_id
WHERE btrim(si.imei) = '869009083237546';  -- reemplazar IMEI`,
    },
    {
      type: 'code',
      title: 'SQL — similitud IMEI (4 primeros o 4 últimos)',
      language: 'sql',
      code: `-- Ver sql/auditoria_integridad_ventas_inventario.sql
-- Buscar en sale_items WHERE left(imei,4) = '8690' OR right(imei,4) = '7546'`,
    },
    {
      type: 'links',
      title: 'Enlaces',
      items: [
        { label: 'Catálogo de informes', href: '/informes' },
        { label: 'Inventario actual (5 tiendas)', href: '/informe/inventario-estado-actual-2026-06' },
        {
          label: 'POS producción',
          href: 'https://pos-tu-movil.onrender.com/informes',
          external: true,
        },
      ],
    },
  ],
};

export const ALL_AUDITORIA_IMEI_INFORMES: PublicInforme[] = [informeAuditoriaImeiVariantes];
