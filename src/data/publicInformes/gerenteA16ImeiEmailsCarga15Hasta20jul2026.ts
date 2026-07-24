import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';
import { SLUG_GERENTE_A16_CERO_CARGA } from './respuestaGerenteGalaxyA16CeroCarga2026';
import {
  SLUG_A16_PARTE_1,
  SLUG_A16_PARTE_2,
  SLUG_A16_PARTE_3,
} from './auditoriaStockGalaxyA16Rf8ya0dk6zf2026';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-07-23';
const PRODUCTO = 'samsung galaxy a16 128gb/4+4';
const SKU = 'RF8YA0DK6ZF';

/** IMEI + facturas A16 desde carga 15 (26-jun) hasta 20-jul */
export const SLUG_A16_IMEI_EMAILS = 'a16-imei-carga15-20jul-2026';

const IMEI_ROWS: { n: string; imei: string; factura: string; fecha: string; tienda: string; nota?: string }[] = [
  { n: '1', imei: '351577550328654', factura: 'FAC-20260627-04743', fecha: '27-jun 11:45', tienda: 'Tu Móvil Marino' },
  { n: '2', imei: '351577550328969', factura: 'FAC-20260627-04745', fecha: '27-jun 12:12', tienda: 'Zona Gamer Margarita' },
  { n: '3', imei: '351577550323028', factura: 'FAC-20260628-04764', fecha: '28-jun 11:20', tienda: 'Tu Móvil Centro' },
  { n: '4', imei: '351577550327771', factura: 'FAC-20260701-04835', fecha: '01-jul 12:19', tienda: 'Zona Gamer Margarita' },
  { n: '5', imei: '351577550327813', factura: 'FAC-20260701-04844', fecha: '01-jul 14:04', tienda: 'Tu Móvil Centro' },
  { n: '6', imei: '351577550327821', factura: 'FAC-20260702-04862', fecha: '02-jul 10:56', tienda: 'Zona Gamer Margarita' },
  { n: '7', imei: '351577550327789', factura: 'FAC-20260703-04904', fecha: '03-jul 12:36', tienda: 'Tu Móvil Centro' },
  { n: '8', imei: '351577550338240', factura: 'FAC-20260708-05043', fecha: '08-jul 11:39', tienda: 'Tu Móvil Centro' },
  { n: '9', imei: '351577550320628', factura: 'FAC-20260708-05044', fecha: '08-jul 13:12', tienda: 'Tu Móvil Centro' },
  { n: '10', imei: '351577550326930', factura: 'FAC-20260708-05053', fecha: '08-jul 16:37', tienda: 'Zona Gamer Margarita' },
  { n: '11', imei: '351577550324901', factura: 'FAC-20260709-05074', fecha: '09-jul 15:27', tienda: 'Zona Gamer Margarita' },
  { n: '12', imei: '351577550323010', factura: 'FAC-20260709-05075', fecha: '09-jul 15:33', tienda: 'Zona Gamer Margarita' },
  { n: '13', imei: '351577550321287', factura: 'FAC-20260711-05122', fecha: '11-jul 16:05', tienda: 'Zona Gamer Margarita' },
  { n: '14', imei: '351577550329934', factura: 'FAC-20260711-05124', fecha: '11-jul 16:41', tienda: 'Tu Móvil Marino' },
  { n: '15', imei: '351577550324976', factura: 'FAC-20260715-05180', fecha: '15-jul 09:40', tienda: 'Tu Móvil La Isla' },
  { n: '16', imei: '351577550326948', factura: 'FAC-20260715-05201', fecha: '15-jul 16:56', tienda: 'Tu Móvil La Isla' },
  { n: '17', imei: '351577550319422', factura: 'FAC-20260716-05233', fecha: '16-jul 14:03', tienda: 'Tu Móvil Marino' },
  {
    n: '18',
    imei: '3515777550333290',
    factura: 'FAC-20260716-05252',
    fecha: '16-jul 16:33',
    tienda: 'Tu Móvil Marino',
    nota: '⚠️ 16 dígitos (IMEI típico = 15) — revisar typo',
  },
  { n: '19', imei: '351577551841325', factura: 'FAC-20260717-05340', fecha: '17-jul 17:41', tienda: 'Tu Móvil Centro' },
  { n: '20', imei: '351577551817325', factura: 'FAC-20260718-05376', fecha: '18-jul 12:03', tienda: 'Tu Móvil Centro' },
  { n: '21', imei: '351577551830013', factura: 'FAC-20260718-05380', fecha: '18-jul 12:22', tienda: 'Tu Móvil Centro' },
  { n: '22', imei: '351577551837497', factura: 'FAC-20260718-05380', fecha: '18-jul 12:22', tienda: 'Tu Móvil Centro' },
  { n: '23', imei: '351577551835079', factura: 'FAC-20260718-05420', fecha: '18-jul 15:56', tienda: 'Tu Móvil Centro' },
  { n: '24', imei: '351577551822481', factura: 'FAC-20260720-05491', fecha: '20-jul 13:19', tienda: 'Tu Móvil Centro' },
  { n: '25', imei: '351577551826771', factura: 'FAC-20260720-05497', fecha: '20-jul 13:37', tienda: 'Tu Móvil Centro' },
  { n: '26', imei: '351577551835087', factura: 'FAC-20260720-05512', fecha: '20-jul 16:41', tienda: 'Tu Móvil Centro' },
  { n: '27', imei: '351577551817853', factura: 'FAC-20260720-05523', fecha: '20-jul 18:17', tienda: 'Tu Móvil Centro' },
];

export const informeGerenteA16ImeiEmails: PublicInforme = {
  slug: SLUG_A16_IMEI_EMAILS,
  titulo: 'Galaxy A16 — IMEI, emails y facturas (carga 15 → 20 jul)',
  subtitulo:
    'Respuesta operativa: listado de IMEI vendidos desde la carga de 15 unidades hasta el 20 de julio, estado de emails en POS y anulaciones.',
  fecha: FECHA_INFORME,
  estado: 'aprobado',
  categoria: 'inventario',
  tags: ['inventario', 'galaxy-a16', 'imei', 'emails', SKU],
  relacionados: [
    INFORMES_CATALOGO_SLUG,
    SLUG_GERENTE_A16_CERO_CARGA,
    SLUG_A16_PARTE_1,
    SLUG_A16_PARTE_2,
    SLUG_A16_PARTE_3,
  ],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Destinatario', value: 'Operaciones / cierre caso A16' },
    { label: 'Producto', value: PRODUCTO },
    { label: 'SKU', value: SKU },
    { label: 'Ventana', value: '26-jun-2026 16:46 → 20-jul-2026 (Caracas)' },
    { label: 'Fuente', value: 'Supabase sales + sale_items (consulta 23-jul-2026)' },
    { label: 'Fecha informe', value: FECHA_INFORME },
  ],
  sections: [
    {
      type: 'hero',
      badge: 'Respuesta operativa · A16 128GB · IMEI / emails',
    },
    {
      type: 'verdict',
      titulo: 'Hay 27 IMEI en el sistema; 0 emails de cliente; 0 facturas anuladas en la ventana',
      detalle: [
        'Se extrajo del POS el listado completo de ventas del A16 128 (SKU RF8YA0DK6ZF) **desde la carga de 15 en Zona Gamer (26-jun ~16:46) hasta el 20-jul-2026 inclusive**.',
        'Resultado: **27 unidades vendidas** con IMEI registrado, **todas** en estado `completed`. **Ninguna** venta tiene email de cliente en el POS. **Ninguna** factura aparece anulada/reversada en esa ventana.',
        'Los “15 emails de los 15 equipos” (cuenta de fábrica / proveedor) **no viven en el POS**. Hay que cruzarlos con este listado de IMEI cuando el proveedor los entregue.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'text',
      title: 'Qué preguntó gerencia (texto original)',
      paragraphs: [
        '«Necesito los IMEI de los A16 desde la carga de 15 unidades hasta el 20 de julio.»',
        '«Que me saques un reporte de los que debe estar de los e-mails de los equipos vendidos, de los A16, o sea, de esos 15 que se cargaron… Los 15 e-mails de esos 15. Y si la factura a la cual se anuló (reverso) coincide al momento del e-mail que se registró… Tiene que coincidir. Ya estoy pidiendo los e-mails de los proveedores, porque necesito dar por finalizado lo de la A16.»',
      ],
    },
    {
      type: 'text',
      title: 'Respuestas punto por punto',
      paragraphs: [
        '**1) IMEI desde la carga de 15 hasta el 20 de julio** — Sí. Tabla completa más abajo (27 filas). La carga de referencia es Zona Gamer **0 → 15** el **26-jun-2026 ~16:46**.',
        '**2) Los 15 emails de esos 15 equipos** — En el POS **no hay** emails de equipo ni de cliente en esas ventas (`email_en_pos` = vacío en las 27). Lo que pediste al proveedor (emails de fábrica/proveedor) es el camino correcto: cuando lleguen, se cruzan **IMEI ↔ email**.',
        '**3) Factura anulada / reverso y coincidencia con el email** — En la ventana consultada (**26-jun 16:46 → 20-jul**) hay **0** ventas con status distinto de `completed`. Si viste un reverso, está fuera de esta ventana, es otro producto, o hay que buscar por número de factura concreto.',
        '**4) ¿Por qué 27 y no 15?** — La carga de 15 en Zona Gamer no es el único stock vendido en el período. Ese mismo día y después hubo más entradas / otras tiendas. El POS muestra **27 ventas completed con IMEI** hasta el 20-jul.',
      ],
    },
    {
      type: 'table',
      title: 'Resumen numérico (consulta Supabase 23-jul-2026)',
      headers: ['Métrica', 'Valor', 'Interpretación'],
      rows: [
        { cells: ['Unidades en líneas de venta', '27', 'Facturado en la ventana'] },
        { cells: ['Estado completed', '27', 'Todas vigentes'] },
        { cells: ['Anuladas / no completed', '0', 'Nada que cruzar por reverso en esta ventana'] },
        { cells: ['Líneas con IMEI', '27 / 27', 'Completo'] },
        { cells: ['IMEI únicos', '27', 'Sin duplicados de IMEI'] },
        { cells: ['Con email en POS', '0 / 27', 'No hay correo de cliente guardado'] },
        { cells: ['Carga de referencia', '0→15 Zona Gamer 26-jun 16:46', 'La que recuerda gerencia'] },
      ],
    },
    {
      type: 'table',
      title: 'Listado IMEI + factura + tienda + fecha (27)',
      description:
        'Fuente: sale_items.imei + sales. Email en POS: ninguno. Todas completed. Fila 18 marcada por IMEI de 16 dígitos (revisar).',
      headers: ['#', 'IMEI', 'Factura', 'Fecha (VE)', 'Tienda', 'Email POS', 'Nota'],
      rows: IMEI_ROWS.map((r) => ({
        cells: [r.n, r.imei, r.factura, r.fecha, r.tienda, '—', r.nota || ''],
      })),
    },
    {
      type: 'verdict',
      titulo: 'Alerta operativa — IMEI fila 18',
      detalle:
        'Factura **FAC-20260716-05252** (Tu Móvil Marino, 16-jul): IMEI `3515777550333290` tiene **16 dígitos** (un IMEI estándar suele tener 15). Posible error de digitación. Revisar en la factura física / reingresar si aplica antes de cruzar con el proveedor.',
      ok: false,
    },
    {
      type: 'steps',
      title: 'Qué hacer ahora para dar por cerrado el A16',
      items: [
        {
          paso: '1',
          accion: 'Usar esta tabla de 27 IMEI como lista maestra del POS',
          resultado: 'Base para cruzar con proveedor',
        },
        {
          paso: '2',
          accion: 'Cuando lleguen los emails del proveedor, cruzar IMEI ↔ email (Excel)',
          resultado: 'Quedan cubiertos los “emails de equipos” que no están en el POS',
        },
        {
          paso: '3',
          accion: 'Si hay una factura de reverso concreta, enviar el número FAC-…',
          resultado: 'Se busca fuera de esta ventana o por status histórico',
        },
        {
          paso: '4',
          accion: 'Corregir / validar IMEI de FAC-20260716-05252 si está mal digitado',
          resultado: 'Evita descuadre al cruzar con proveedor',
        },
      ],
    },
    {
      type: 'text',
      title: 'SQL de respaldo (reproducible)',
      paragraphs: [
        'Consulta en repo: `sql/gerente_a16_imei_emails_carga15_hasta_20jul.sql` (bloques 2–5).',
        'Filtro: SKU RF8YA0DK6ZF, `created_at` desde `2026-06-26 16:46:00-04` hasta `2026-07-20 23:59:59-04`.',
      ],
    },
    {
      type: 'links',
      title: 'Informes relacionados',
      items: [
        {
          label: 'Respuesta gerente: cero, carga y facturas',
          href: `/informe/${SLUG_GERENTE_A16_CERO_CARGA}`,
        },
        {
          label: 'Auditoría A16 — Parte 1 (detección)',
          href: `/informe/${SLUG_A16_PARTE_1}`,
        },
        {
          label: 'Auditoría A16 — Parte 2 (SQL)',
          href: `/informe/${SLUG_A16_PARTE_2}`,
        },
        {
          label: 'Auditoría A16 — Parte 3 (conclusión)',
          href: `/informe/${SLUG_A16_PARTE_3}`,
        },
        {
          label: 'Catálogo de informes',
          href: `/informe/${INFORMES_CATALOGO_SLUG}`,
        },
      ],
    },
  ],
};

export const ALL_GERENTE_A16_IMEI_INFORMES: PublicInforme[] = [informeGerenteA16ImeiEmails];
