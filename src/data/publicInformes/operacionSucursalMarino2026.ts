import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const COMPANY_ID = 'aa11bb22-cc33-dd44-ee55-ff6677889900';
const MARINO_ID = '73aae6d8-a396-4443-9c24-c7b03c84d11b';
const SUPABASE_REF = 'swsqmsbyikznalrvydny';

const metaBase = [
  { label: 'Sistema', value: 'POS-TuMovil' },
  { label: 'Supabase', value: SUPABASE_REF },
  { label: 'Empresa', value: COMPANY },
  { label: 'company_id', value: COMPANY_ID },
];

/** Catálogo índice de todos los informes públicos de la operación */
export const informeCatalogo: PublicInforme = {
  slug: INFORMES_CATALOGO_SLUG,
  titulo: 'Catálogo de informes — Operación sucursales 2026',
  subtitulo: 'Informes públicos por slug (sin login)',
  fecha: '2026-06-02',
  estado: 'referencia',
  categoria: 'indice',
  tags: ['índice', 'operaciones', 'marino'],
  relacionados: [
    'respaldo-pre-sucursal-marino-2026',
    'inventario-estado-actual-2026-06',
    'operacion-marino-ejecuciones-2026',
    'operacion-marino-validaciones-2026',
    'operacion-marino-informe-final-2026',
  ],
  meta: metaBase,
  sections: [
    { type: 'hero', badge: 'Índice · Slugs' },
    {
      type: 'text',
      title: 'Uso',
      paragraphs: [
        'Cada informe tiene una URL fija con slug. Compártela para auditoría sin credenciales del POS.',
        'Documentación Markdown en repo: docs/operaciones/ y sql/.',
      ],
    },
    {
      type: 'table',
      title: 'Informes disponibles',
      headers: ['Slug', 'Categoría', 'Descripción'],
      rows: [
        { cells: ['respaldo-pre-sucursal-marino-2026', 'Respaldo', 'Git, dump BD, protocolo restore'] },
        { cells: ['inventario-estado-actual-2026-06', 'Inventario', 'Estado actual certificado (5 tiendas)'] },
        { cells: ['operacion-marino-ejecuciones-2026', 'Ejecución', 'Migración SQL, create_store_system, pasos'] },
        { cells: ['operacion-marino-validaciones-2026', 'Validación', 'E2E, transferencia Centro, comprobaciones'] },
        { cells: ['operacion-marino-informe-final-2026', 'Consolidado', 'Veredicto final y comparativa'] },
      ],
    },
    {
      type: 'links',
      title: 'Enlaces rápidos',
      items: [
        { label: 'Respaldo', href: '/informe/respaldo-pre-sucursal-marino-2026' },
        { label: 'Inventario actual', href: '/informe/inventario-estado-actual-2026-06' },
        { label: 'Ejecuciones', href: '/informe/operacion-marino-ejecuciones-2026' },
        { label: 'Validaciones', href: '/informe/operacion-marino-validaciones-2026' },
        { label: 'Informe final', href: '/informe/operacion-marino-informe-final-2026' },
      ],
    },
  ],
};

export const informeRespaldo: PublicInforme = {
  slug: 'respaldo-pre-sucursal-marino-2026',
  titulo: 'Respaldo pre-sucursal — Tu Móvil Marino',
  subtitulo: 'Snapshot código y base de datos antes de cambios',
  fecha: '2026-06-01',
  estado: 'respaldo',
  categoria: 'respaldo',
  tags: ['backup', 'pg_dump', 'git'],
  relacionados: [INFORMES_CATALOGO_SLUG, 'operacion-marino-ejecuciones-2026'],
  meta: [
    ...metaBase,
    { label: 'Rama Git', value: 'backup-pre-sucursal' },
    { label: 'Commits', value: '8b29b3a, bd3cc24' },
  ],
  sections: [
    { type: 'hero', badge: 'Respaldo · Slug respaldo-pre-sucursal-marino-2026' },
    {
      type: 'verdict',
      titulo: 'Respaldo completado',
      detalle: 'Dump ~9,91 MB + rama Git en GitHub antes de migración.',
      ok: true,
    },
    {
      type: 'table',
      title: 'Recursos de respaldo',
      headers: ['Tipo', 'Ubicación', 'Detalle'],
      rows: [
        { cells: ['Git', 'rama backup-pre-sucursal', 'Código + scripts + dump'] },
        { cells: ['PostgreSQL', 'backups/backup_pre_sucursal_20260601_2059.sql', 'Esquema public ~9,91 MB'] },
        { cells: ['Script', 'scripts/backup-db.ps1', 'Pooler IPv4 Windows'] },
        { cells: ['Protocolo', 'backups/PROTOCOLO_RESTAURACION.md', 'Restore paso a paso'] },
        { cells: ['Reporte pre', 'backups/REPORTE_SITUACION_PRE_SUCURSAL.md', 'Baseline 4 tiendas'] },
      ],
    },
    {
      type: 'text',
      title: 'Configuración backup',
      paragraphs: [
        'Host: aws-1-us-east-1.pooler.supabase.com:5432',
        'Usuario: postgres.swsqmsbyikznalrvydny',
        'Herramienta: pg_dump 17 (Docker no requerido).',
        'Plan Supabase Free: sin backup automático en Dashboard.',
      ],
    },
    {
      type: 'steps',
      title: 'Procedimiento restore (resumen)',
      items: [
        { paso: '1', accion: 'Detener escrituras en POS', resultado: 'Ventana de mantenimiento' },
        { paso: '2', accion: 'Restaurar dump con psql', resultado: 'Ver PROTOCOLO_RESTAURACION.md' },
        { paso: '3', accion: 'Ejecutar reporte unificado SQL', resultado: 'Comparar con baseline documentado' },
      ],
    },
    {
      type: 'links',
      title: 'Siguiente paso',
      items: [{ label: 'Ver ejecuciones SQL', href: '/informe/operacion-marino-ejecuciones-2026' }],
    },
  ],
};

export const informeInventarioActual: PublicInforme = {
  slug: 'inventario-estado-actual-2026-06',
  titulo: 'Estado actual del inventario',
  subtitulo: 'Certificado post-operación y pruebas (5 sucursales)',
  fecha: '2026-06-02',
  estado: 'aprobado',
  categoria: 'inventario',
  tags: ['inventario', 'dashboard', 'estadísticas'],
  relacionados: [INFORMES_CATALOGO_SLUG, 'operacion-marino-validaciones-2026'],
  meta: [
    ...metaBase,
    { label: 'Tiendas activas', value: '5' },
    { label: 'Re-verificar SQL', value: 'sql/reporte_situacion_pre_sucursal_unificado.sql' },
  ],
  sections: [
    { type: 'hero', badge: 'Inventario · Estado actual' },
    {
      type: 'verdict',
      titulo: 'Cuadra con línea base global',
      detalle: '659 productos · 5.300 uds · USD 155.463,51',
      ok: true,
    },
    {
      type: 'table',
      title: 'Totales globales (panel Estadísticas)',
      headers: ['Métrica', 'Valor'],
      rows: [
        { cells: ['Valor inventario USD', '155.463,51'] },
        { cells: ['Productos activos', '659'] },
        { cells: ['Unidades totales', '5.300'] },
        { cells: ['Tiendas', '5'] },
      ],
    },
    {
      type: 'table',
      title: 'Por categoría',
      headers: ['Categoría', 'Productos', 'Unidades', 'USD'],
      rows: [
        { cells: ['Teléfonos', '139', '532', '100.843,30'] },
        { cells: ['Accesorios', '172', '3.087', '35.717,76'] },
        { cells: ['Servicio técnico', '345', '1.678', '18.861,45'] },
        { cells: ['uncategorized', '3', '3', '41,00'] },
      ],
    },
    {
      type: 'table',
      title: 'Por sucursal (unidades)',
      headers: ['Sucursal', 'Tel.', 'Acc.', 'Serv.', 'Total'],
      rows: [
        { cells: ['Tu Móvil Centro', '105', '351', '492', '948'] },
        { cells: ['Tu Móvil La Isla', '59', '53', '0', '112'] },
        { cells: ['Tu Móvil Marino', '0', '0', '0', '0'] },
        { cells: ['Tu Móvil Store', '0', '8', '888', '896'] },
        { cells: ['Zona Gamer Margarita', '368', '2.675', '298', '3.341'] },
      ],
    },
    {
      type: 'table',
      title: 'Filas inventario (BD)',
      headers: ['Sucursal', 'Filas inventario'],
      rows: [
        { cells: ['Centro, La Isla, Store, Zona Gamer', '712 c/u'] },
        { cells: ['Tu Móvil Marino', '659 (solo activos)'] },
      ],
    },
    {
      type: 'text',
      title: 'Nota Marino',
      paragraphs: [
        'Marino operativa con 659 filas (qty=0). Sin carga de stock comercial aún.',
        'Las 4 tiendas originales conservan los mismos totales que antes de la operación.',
      ],
    },
  ],
};

export const informeEjecuciones: PublicInforme = {
  slug: 'operacion-marino-ejecuciones-2026',
  titulo: 'Ejecuciones realizadas — Sucursal Marino',
  subtitulo: 'Migración SQL, RPC y configuración en producción',
  fecha: '2026-06-02',
  estado: 'aprobado',
  categoria: 'ejecucion',
  tags: ['sql', 'migración', 'create_store_system'],
  relacionados: ['respaldo-pre-sucursal-marino-2026', 'operacion-marino-validaciones-2026'],
  meta: [
    ...metaBase,
    { label: 'store_id Marino', value: MARINO_ID },
    { label: 'Commit docs main', value: '2d3eb19' },
  ],
  sections: [
    { type: 'hero', badge: 'Ejecución · Procedimiento' },
    {
      type: 'timeline',
      title: 'Orden de ejecución',
      items: [
        { fecha: '2026-06-01', fase: 'Diagnóstico', resultado: 'create_store_system no existía → false' },
        { fecha: '2026-06-02', fase: 'Migración', resultado: '20260522100000_create_store_v1_system.sql → Success' },
        { fecha: '2026-06-02', fase: 'Verificación', resultado: 'Función existe → true; trigger on_store_created OK' },
        { fecha: '2026-06-02', fase: 'Creación tienda', resultado: 'Tu Móvil Marino → success, 659/659' },
      ],
    },
    {
      type: 'steps',
      title: 'Pasos quirúrgicos',
      items: [
        { paso: '0', accion: 'EXISTS create_store_system', resultado: 'false → aplicar migración' },
        { paso: '1', accion: 'Ejecutar migración 234 líneas', resultado: 'Success' },
        { paso: '2', accion: 'create_store_system (Marino)', resultado: 'store_id asignado, validation OK' },
        { paso: '3', accion: 'Conteo filas por tienda', resultado: '4×712 + Marino 659' },
      ],
    },
    {
      type: 'code',
      title: 'SQL creación tienda (ejecutado)',
      language: 'sql',
      code: `SELECT public.create_store_system(
  p_company_id := '${COMPANY_ID}'::uuid,
  p_name := 'Tu Móvil Marino',
  p_business_name := 'zona gamer margarita c.a',
  p_tax_id := 'J-50283376-6',
  p_active := true
);`,
    },
    {
      type: 'table',
      title: 'Archivos SQL en repositorio',
      headers: ['Archivo', 'Uso'],
      rows: [
        { cells: ['supabase/migrations/20260522100000_create_store_v1_system.sql', 'Migración oficial'] },
        { cells: ['sql/EXECUTAR_CREAR_TU_MOVIL_MARINO.sql', 'Plantilla SQL Editor'] },
        { cells: ['sql/INDICE_SQL_EJECUTADOS_SUCURSAL_MARINO.md', 'Índice detallado'] },
      ],
    },
    {
      type: 'text',
      title: 'Configuración / conversiones',
      paragraphs: [
        'No se modificaron usuarios ni assigned_store_id.',
        'create_store_v1 (auth admin) no se usó; SQL Editor como postgres ejecuta create_store_system.',
        'Nuevos productos futuros: trigger on_store_created + create_product_v3 en 5 tiendas.',
      ],
    },
  ],
};

export const informeValidaciones: PublicInforme = {
  slug: 'operacion-marino-validaciones-2026',
  titulo: 'Validaciones y comprobaciones',
  subtitulo: 'Integridad, E2E POS y transferencia Centro',
  fecha: '2026-06-02',
  estado: 'aprobado',
  categoria: 'validacion',
  tags: ['validate_store_inventory', 'e2e', 'transferencia'],
  relacionados: ['inventario-estado-actual-2026-06', 'operacion-marino-informe-final-2026'],
  meta: [...metaBase, { label: 'Marino store_id', value: MARINO_ID }],
  sections: [
    { type: 'hero', badge: 'Validación · Comprobaciones' },
    {
      type: 'table',
      title: 'Integridad pre-operación',
      headers: ['Control', 'Resultado'],
      rows: [
        { cells: ['Huecos inventario (activos)', '0'] },
        { cells: ['Duplicados (store, product)', '0'] },
        { cells: ['validate_store_inventory(Marino)', 'OK 659/659'] },
      ],
    },
    {
      type: 'table',
      title: 'Prueba end-to-end',
      headers: ['Fase', 'Acción', 'Resultado'],
      rows: [
        { cells: ['A', 'Producto PRU-MARINO-001', '660 prod., +1 uds'] },
        { cells: ['B', 'Venta FAC-20260602-04089', 'Stock Marino 0, USD baseline'] },
        { cells: ['C', 'Anular venta', 'Stock repuesto'] },
        { cells: ['D', 'Soft delete producto', '659 prod., 5.300 uds — baseline'] },
      ],
    },
    {
      type: 'table',
      title: 'Transferencia Tu Móvil Centro',
      headers: ['Control', 'Esperado', 'Observado'],
      rows: [
        { cells: ['Centro total uds', '948', '948'] },
        { cells: ['Global uds', '5.300', '5.300'] },
        { cells: ['Global USD', '155.463,51', '155.463,51'] },
        { cells: ['Marino', '0', '0'] },
      ],
    },
    {
      type: 'table',
      title: 'Componentes probados',
      headers: ['Componente', 'Estado'],
      rows: [
        { cells: ['create_store_system', 'OK'] },
        { cells: ['process_sale / delete_sale_and_restore_inventory', 'OK'] },
        { cells: ['delete_product (soft)', 'OK'] },
        { cells: ['Transferencias entre tiendas', 'OK'] },
        { cells: ['Panel Estadísticas vs SQL', 'OK'] },
      ],
    },
  ],
};

export const informeFinal: PublicInforme = {
  slug: 'operacion-marino-informe-final-2026',
  titulo: 'Informe final — Operación sucursales 2026',
  subtitulo: 'Veredicto consolidado · Producción estable',
  fecha: '2026-06-02',
  estado: 'aprobado',
  categoria: 'consolidado',
  tags: ['cierre', 'veredicto', 'marino'],
  relacionados: [INFORMES_CATALOGO_SLUG, 'inventario-estado-actual-2026-06'],
  meta: [
    ...metaBase,
    { label: 'Veredicto', value: 'APROBADO' },
    { label: 'Período', value: '2026-06-01 → 2026-06-02' },
  ],
  sections: [
    { type: 'hero', badge: 'Informe final · Consolidado' },
    {
      type: 'verdict',
      titulo: 'APROBADO — operación cerrada con éxito',
      detalle: '5 sucursales activas. Inventario global sin desvío. Marino lista para usuarios y carga de stock.',
      ok: true,
    },
    {
      type: 'comparison',
      title: 'Evolución de métricas',
      rows: [
        { etapa: 'Pre (4 tiendas)', tiendas: '4', productos: '659', unidades: '5.300', usd: '155.463,51' },
        { etapa: 'Post Marino', tiendas: '5', productos: '659', unidades: '5.300', usd: '155.463,51' },
        { etapa: 'Post E2E + transferencia', tiendas: '5', productos: '659', unidades: '5.300', usd: '155.463,51' },
      ],
    },
    {
      type: 'text',
      title: 'Pendiente operativo',
      paragraphs: [
        'Asignar usuarios a Tu Móvil Marino (assigned_store_id).',
        'Cargar inventario real en Marino.',
        'Rotar contraseña BD si se expuso por canal inseguro.',
      ],
    },
    {
      type: 'links',
      title: 'Documentación repo',
      items: [
        { label: 'INFORME_FINAL markdown', href: 'https://github.com/ingsistemavzla/POS-TU-MOVIL/blob/main/docs/operaciones/INFORME_FINAL_OPERACION_SUCURSALES_2026.md', external: true },
        { label: 'Acta técnica', href: 'https://github.com/ingsistemavzla/POS-TU-MOVIL/blob/main/docs/operaciones/ACTA_COMPLETA_SUCURSAL_TU_MOVIL_MARINO.md', external: true },
      ],
    },
  ],
};

export const ALL_PUBLIC_INFORMES: PublicInforme[] = [
  informeCatalogo,
  informeRespaldo,
  informeInventarioActual,
  informeEjecuciones,
  informeValidaciones,
  informeFinal,
];
