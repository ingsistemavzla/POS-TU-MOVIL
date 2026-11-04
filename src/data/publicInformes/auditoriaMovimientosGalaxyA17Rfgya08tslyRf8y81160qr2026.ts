import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-11-04';

/** Informe A — auditoría gerencial A17 (6+6 y 4+4) + libros cronológicos. */
export const SLUG_AUDITORIA_MOVIMIENTOS_A17 =
  'auditoria-movimientos-galaxy-a17-rfgya08tsly-rf8y81160qr-2026-11';

const SLUG_TRAZABILIDAD_FAC_07881 =
  'trazabilidad-fac-20261010-07881-a17-4plus4-2026-11';

/**
 * Snapshot documental de movimientos/ventas A17 (ventana ~30 días).
 * Fuente: extracto original de 133 filas de inventory_movements (05/10–04/11/2026).
 * Stocks 15 / 3 = verificación previa; no lectura Live al abrir la URL.
 * OUT cruzados con sales.status = completed. Sin datos personales.
 * ADJUST automáticos: solo evidencia de saldo; no se cuentan como operaciones.
 */
export const informeAuditoriaMovimientosGalaxyA17: PublicInforme = {
  slug: SLUG_AUDITORIA_MOVIMIENTOS_A17,
  titulo: 'Auditoría gerencial — Samsung Galaxy A17 (6+6 y 4+4)',
  subtitulo:
    'Resumen gerencial y libro de movimientos tipo estado de cuenta · 55 operaciones · corte documental 4 nov 2026.',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'inventario',
  tags: [
    'inventario',
    'galaxy-a17',
    'auditoria',
    'movimientos',
    'cronologia',
    'RFGYA08TSLY',
    'RF8Y81160QR',
  ],
  relacionados: [INFORMES_CATALOGO_SLUG, SLUG_TRAZABILIDAD_FAC_07881],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Destinatario', value: 'Gerencia / operaciones de inventario' },
    { label: 'SKU 6+6', value: 'RFGYA08TSLY' },
    { label: 'SKU 4+4', value: 'RF8Y81160QR' },
    { label: 'Operaciones de libro', value: '55 (19 + 36)' },
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
        'INFORME A · Auditoría gerencial + libro histórico · Galaxy A17 · Solo lectura',
    },
    {
      type: 'verdict',
      titulo:
        '38 OUT · 37 facturas completed · stocks verificados 15 (6+6) y 3 (4+4)',
      detalle: [
        'Validación comercial: los movimientos OUT de la ventana están respaldados por facturas en estado **completed**.',
        'Libro histórico: **55** operaciones comerciales documentadas (19 del 6+6 + 36 del 4+4), sin contar ADJUST automáticos.',
        'Stocks globales **15** y **3** corresponden a una verificación previa documentada; este informe es un **snapshot** y no consulta existencias en vivo al abrirse.',
      ].join('\n\n'),
      ok: true,
    },
    {
      type: 'table',
      title: '1. Resumen consolidado',
      headers: ['Métrica', '6+6 RFGYA08TSLY', '4+4 RF8Y81160QR', 'Total'],
      rows: [
        { cells: ['Operaciones de libro', '19', '36', '55'] },
        { cells: ['Aumentos manuales', '+20', '+30', '+50'] },
        { cells: ['Unidades OUT', '11', '27', '38'] },
        { cells: ['Facturas distintas', '11', '26', '37'] },
        { cells: ['Estado facturas (cruce OUT)', '100% completed', '100% completed', '100% completed'] },
        { cells: ['Transferencias (neto global)', '0', '0', '0'] },
        { cells: ['Ud movidas en traslados', '15', '17', '—'] },
        { cells: ['Eventos de traslado', '6', '5', '11'] },
        { cells: ['Restituciones IN (anulaciones)', '0', '2', '2'] },
        { cells: ['Stock verificado (previo)', '15', '3', '18'] },
        { cells: ['Stock inicial del período', 'No certificado', 'No certificado', '—'] },
      ],
    },
    {
      type: 'text',
      title: '2. Reglas de interpretación',
      paragraphs: [
        'Cada fila del libro es una **operación comercial**: aumento manual, venta OUT, traslado (un evento) o restitución IN.',
        'Los registros **ADJUST automático de auditoría** no se listan como operaciones; solo aportan **saldo anterior / posterior** cuando existen.',
        'Los traslados **no** cambian el stock global. Se muestra efecto en origen y destino en una sola fila.',
        'Si un saldo no está respaldado por ADJUST documental, se indica **No verificable** (no se calcula artificialmente).',
        '**Validación comercial** = OUT vigentes + factura completed. Esto **no** es una conciliación histórica integral ni certifica la apertura del período.',
        'No se publican nombres de clientes, cédulas, IMEI ni identificadores personales.',
      ],
    },

    // ── LIBRO 6+6 ──
    {
      type: 'text',
      title: '3. Libro cronológico — Galaxy A17 6+6 (RFGYA08TSLY)',
      paragraphs: [
        '**19 operaciones**: 11 OUT · 2 aumentos (+20) · 6 traslados (15 ud movilizadas). Cobertura documental: 05/10/2026 – 03/11/2026.',
        'Hubo ventas antes de la primera carga manual del 08/10 → existía stock previo; el saldo inicial del período **no está certificado**.',
      ],
    },
    {
      type: 'timeline',
      title: '6+6 — Línea de tiempo (libro de movimientos)',
      items: [
          {
            fecha: '05/10/2026 14:52:50',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261005-07769**. Saldo sucursal: **1 → 0**.',
          },
          {
            fecha: '05/10/2026 16:19:22',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261005-07777**. Saldo sucursal: **1 → 0**.',
          },
          {
            fecha: '05/10/2026 17:40:40',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261005-07786**. Saldo sucursal: **2 → 1**.',
          },
          {
            fecha: '06/10/2026 10:51:52',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261006-07795**. Saldo sucursal: **2 → 1**.',
          },
          {
            fecha: '06/10/2026 11:41:51',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261006-07798**. Saldo sucursal: **1 → 0**.',
          },
          {
            fecha: '07/10/2026 09:37:17',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261007-07819**. Saldo sucursal: **1 → 0**.',
          },
          {
            fecha: '08/10/2026 17:53:42',
            fase: 'Aumento manual · +10',
            resultado:
              'Incorporación documental. Saldo: **0 → 10**.',
          },
          {
            fecha: '09/10/2026 17:41:56',
            fase: 'Traslado · 2 ud',
            resultado:
              'Moviliza **2** ud. Efecto origen: **Zona Gamer 10→8**. Efecto destino: **Centro 0→2**.',
          },
          {
            fecha: '12/10/2026 13:58:51',
            fase: 'Traslado · 2 ud',
            resultado:
              'Moviliza **2** ud. Efecto origen: **Zona Gamer 8→6**. Efecto destino: **La Isla 0→2**.',
          },
          {
            fecha: '16/10/2026 09:12:57',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261016-07984**. Saldo sucursal: **2 → 1**.',
          },
          {
            fecha: '16/10/2026 14:05:37',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261016-08004**. Saldo sucursal: **1 → 0**.',
          },
          {
            fecha: '24/10/2026 07:06:02',
            fase: 'Aumento manual · +10',
            resultado:
              'Incorporación documental. Saldo: **6 → 16**.',
          },
          {
            fecha: '26/10/2026 11:01:05',
            fase: 'Traslado · 3 ud',
            resultado:
              'Moviliza **3** ud. Efecto origen: **Zona Gamer 16→13**. Efecto destino: **Centro 0→3**.',
          },
          {
            fecha: '26/10/2026 11:21:58',
            fase: 'Traslado · 3 ud',
            resultado:
              'Moviliza **3** ud. Efecto origen: **Zona Gamer 13→10**. Efecto destino: **Marino 0→3**.',
          },
          {
            fecha: '26/10/2026 12:01:21',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261026-08275**. Saldo sucursal: **3 → 2**.',
          },
          {
            fecha: '27/10/2026 10:13:39',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261027-08295**. Saldo sucursal: **2 → 1**.',
          },
          {
            fecha: '02/11/2026 17:43:50',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261102-08483**. Saldo sucursal: **3 → 2**.',
          },
          {
            fecha: '03/11/2026 13:41:51',
            fase: 'Traslado · 2 ud',
            resultado:
              'Moviliza **2** ud. Efecto origen: **Zona Gamer 10→8**. Efecto destino: **Marino 2→4**.',
          },
          {
            fecha: '03/11/2026 14:01:19',
            fase: 'Traslado · 3 ud',
            resultado:
              'Moviliza **3** ud. Efecto origen: **Zona Gamer 8→5**. Efecto destino: **La Isla 1→4**.',
          }
      ],
    },
    {
      type: 'table',
      title: '6+6 — Detalle tipo estado de cuenta',
      description:
        'Antes/Después de ventas y aumentos = stock de la sucursal. En traslados: columna Antes = efecto origen; Después = efecto destino.',
      headers: [
        'Fecha y hora (VE)',
        'Operación',
        'Sucursal',
        'Δ',
        'Antes',
        'Después',
        'Referencia',
      ],
      rows: [
        {
          cells: [
            '05/10/2026 14:52:50',
            'Venta OUT',
            'Marino',
            '−1',
            '1',
            '0',
            'FAC-20261005-07769',
          ],
        },
        {
          cells: [
            '05/10/2026 16:19:22',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '1',
            '0',
            'FAC-20261005-07777',
          ],
        },
        {
          cells: [
            '05/10/2026 17:40:40',
            'Venta OUT',
            'La Isla',
            '−1',
            '2',
            '1',
            'FAC-20261005-07786',
          ],
        },
        {
          cells: [
            '06/10/2026 10:51:52',
            'Venta OUT',
            'Centro',
            '−1',
            '2',
            '1',
            'FAC-20261006-07795',
          ],
        },
        {
          cells: [
            '06/10/2026 11:41:51',
            'Venta OUT',
            'Centro',
            '−1',
            '1',
            '0',
            'FAC-20261006-07798',
          ],
        },
        {
          cells: [
            '07/10/2026 09:37:17',
            'Venta OUT',
            'La Isla',
            '−1',
            '1',
            '0',
            'FAC-20261007-07819',
          ],
        },
        {
          cells: [
            '08/10/2026 17:53:42',
            'Aumento manual',
            'Zona Gamer',
            '+10',
            '0',
            '10',
            'Aumento +10',
          ],
        },
        {
          cells: [
            '09/10/2026 17:41:56',
            'Traslado',
            'Zona Gamer → Centro',
            '2',
            'Zona Gamer 10→8',
            'Centro 0→2',
            'ZG→Centro',
          ],
        },
        {
          cells: [
            '12/10/2026 13:58:51',
            'Traslado',
            'Zona Gamer → La Isla',
            '2',
            'Zona Gamer 8→6',
            'La Isla 0→2',
            'ZG→La Isla',
          ],
        },
        {
          cells: [
            '16/10/2026 09:12:57',
            'Venta OUT',
            'Centro',
            '−1',
            '2',
            '1',
            'FAC-20261016-07984',
          ],
        },
        {
          cells: [
            '16/10/2026 14:05:37',
            'Venta OUT',
            'Centro',
            '−1',
            '1',
            '0',
            'FAC-20261016-08004',
          ],
        },
        {
          cells: [
            '24/10/2026 07:06:02',
            'Aumento manual',
            'Zona Gamer',
            '+10',
            '6',
            '16',
            'Aumento +10',
          ],
        },
        {
          cells: [
            '26/10/2026 11:01:05',
            'Traslado',
            'Zona Gamer → Centro',
            '3',
            'Zona Gamer 16→13',
            'Centro 0→3',
            'ZG→Centro',
          ],
        },
        {
          cells: [
            '26/10/2026 11:21:58',
            'Traslado',
            'Zona Gamer → Marino',
            '3',
            'Zona Gamer 13→10',
            'Marino 0→3',
            'ZG→Marino',
          ],
        },
        {
          cells: [
            '26/10/2026 12:01:21',
            'Venta OUT',
            'Marino',
            '−1',
            '3',
            '2',
            'FAC-20261026-08275',
          ],
        },
        {
          cells: [
            '27/10/2026 10:13:39',
            'Venta OUT',
            'La Isla',
            '−1',
            '2',
            '1',
            'FAC-20261027-08295',
          ],
        },
        {
          cells: [
            '02/11/2026 17:43:50',
            'Venta OUT',
            'Centro',
            '−1',
            '3',
            '2',
            'FAC-20261102-08483',
          ],
        },
        {
          cells: [
            '03/11/2026 13:41:51',
            'Traslado',
            'Zona Gamer → Marino',
            '2',
            'Zona Gamer 10→8',
            'Marino 2→4',
            'ZG→Marino',
          ],
        },
        {
          cells: [
            '03/11/2026 14:01:19',
            'Traslado',
            'Zona Gamer → La Isla',
            '3',
            'Zona Gamer 8→5',
            'La Isla 1→4',
            'ZG→La Isla',
          ],
        }
      ],
    },

    // ── LIBRO 4+4 ──
    {
      type: 'text',
      title: '4. Libro cronológico — Galaxy A17 4+4 (RF8Y81160QR)',
      paragraphs: [
        '**36 operaciones**: 27 OUT · 2 aumentos (+30) · 5 traslados (17 ud) · 2 restituciones IN. Cobertura documental: 08/10/2026 – 03/11/2026.',
        'FAC-20261010-07881 registra **dos** OUT en el mismo instante; solo hay ADJUST documental **3→2** para la primera unidad. La segunda queda **No verificable** en saldos — detalle técnico en Informe B.',
      ],
    },
    {
      type: 'timeline',
      title: '4+4 — Línea de tiempo (libro de movimientos)',
      items: [
          {
            fecha: '08/10/2026 17:51:49',
            fase: 'Aumento manual · +20',
            resultado:
              'Incorporación documental. Saldo: **0 → 20**.',
          },
          {
            fecha: '09/10/2026 17:41:47',
            fase: 'Traslado · 3 ud',
            resultado:
              'Moviliza **3** ud. Efecto origen: **Zona Gamer 20→17**. Efecto destino: **Centro 0→3**.',
          },
          {
            fecha: '10/10/2026 12:35:03',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261010-07881**. Saldo sucursal: **3 → 2**.',
          },
          {
            fecha: '10/10/2026 12:35:03',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261010-07881**. Saldo sucursal: **No verificable** (sin ADJUST 2→1; ver Informe B).',
          },
          {
            fecha: '12/10/2026 13:58:35',
            fase: 'Traslado · 2 ud',
            resultado:
              'Moviliza **2** ud. Efecto origen: **Zona Gamer 17→15**. Efecto destino: **La Isla 0→2**.',
          },
          {
            fecha: '12/10/2026 14:08:24',
            fase: 'Traslado · 5 ud',
            resultado:
              'Moviliza **5** ud. Efecto origen: **Zona Gamer 15→10**. Efecto destino: **Centro 1→6**.',
          },
          {
            fecha: '12/10/2026 16:49:21',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261012-07922**. Saldo sucursal: **6 → 5**.',
          },
          {
            fecha: '15/10/2026 17:11:57',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261015-07976**. Saldo sucursal: **10 → 9**.',
          },
          {
            fecha: '16/10/2026 11:05:06',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261016-07994**. Saldo sucursal: **9 → 8**.',
          },
          {
            fecha: '16/10/2026 12:34:24',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261016-08000**. Saldo sucursal: **8 → 7**.',
          },
          {
            fecha: '17/10/2026 10:13:59',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261017-08037**. Saldo sucursal: **5 → 4**.',
          },
          {
            fecha: '17/10/2026 10:22:33',
            fase: 'Restitución IN · +1',
            resultado:
              'Restitución por anulación **FAC-20261017-08038**. Saldo: **3 → 4**. OUT original ya no figura en el extracto.',
          },
          {
            fecha: '17/10/2026 10:23:59',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261017-08039**. Saldo sucursal: **4 → 3**.',
          },
          {
            fecha: '17/10/2026 14:44:10',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261017-08072**. Saldo sucursal: **7 → 6**.',
          },
          {
            fecha: '17/10/2026 15:36:17',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261017-08080**. Saldo sucursal: **3 → 2**.',
          },
          {
            fecha: '17/10/2026 15:53:37',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261017-08082**. Saldo sucursal: **6 → 5**.',
          },
          {
            fecha: '20/10/2026 12:31:15',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261020-08140**. Saldo sucursal: **5 → 4**.',
          },
          {
            fecha: '24/10/2026 07:05:23',
            fase: 'Aumento manual · +10',
            resultado:
              'Incorporación documental. Saldo: **4 → 14**.',
          },
          {
            fecha: '24/10/2026 09:44:29',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261024-08220**. Saldo sucursal: **14 → 13**.',
          },
          {
            fecha: '24/10/2026 12:53:53',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261024-08233**. Saldo sucursal: **13 → 12**.',
          },
          {
            fecha: '24/10/2026 13:26:32',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261024-08237**. Saldo sucursal: **12 → 11**.',
          },
          {
            fecha: '24/10/2026 16:59:13',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261024-08251**. Saldo sucursal: **11 → 10**.',
          },
          {
            fecha: '26/10/2026 11:00:55',
            fase: 'Traslado · 3 ud',
            resultado:
              'Moviliza **3** ud. Efecto origen: **Zona Gamer 10→7**. Efecto destino: **Centro 2→5**.',
          },
          {
            fecha: '26/10/2026 11:21:48',
            fase: 'Traslado · 4 ud',
            resultado:
              'Moviliza **4** ud. Efecto origen: **Zona Gamer 7→3**. Efecto destino: **Marino 0→4**.',
          },
          {
            fecha: '27/10/2026 14:55:31',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261027-08306**. Saldo sucursal: **4 → 3**.',
          },
          {
            fecha: '29/10/2026 16:41:38',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261029-08342**. Saldo sucursal: **5 → 4**.',
          },
          {
            fecha: '31/10/2026 09:15:06',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261031-08368**. Saldo sucursal: **3 → 2**.',
          },
          {
            fecha: '31/10/2026 11:07:54',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261031-08379**. Saldo sucursal: **3 → 2**.',
          },
          {
            fecha: '31/10/2026 11:31:17',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261031-08382**. Saldo sucursal: **2 → 1**.',
          },
          {
            fecha: '31/10/2026 13:30:22',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261031-08396**. Saldo sucursal: **2 → 1**.',
          },
          {
            fecha: '01/11/2026 10:18:24',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261101-08420**. Saldo sucursal: **2 → 1**.',
          },
          {
            fecha: '02/11/2026 12:59:48',
            fase: 'Restitución IN · +1',
            resultado:
              'Restitución por anulación **FAC-20261102-08456**. Saldo: **0 → 1**. OUT original ya no figura en el extracto.',
          },
          {
            fecha: '02/11/2026 13:36:43',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261102-08461**. Saldo sucursal: **4 → 3**.',
          },
          {
            fecha: '03/11/2026 10:49:34',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261103-08488**. Saldo sucursal: **1 → 0**.',
          },
          {
            fecha: '03/11/2026 15:38:08',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261103-08509**. Saldo sucursal: **1 → 0**.',
          },
          {
            fecha: '03/11/2026 17:49:53',
            fase: 'Venta OUT · −1',
            resultado:
              'Factura **FAC-20261103-08523**. Saldo sucursal: **3 → 2**.',
          }
      ],
    },
    {
      type: 'table',
      title: '4+4 — Detalle tipo estado de cuenta',
      description:
        'Antes/Después de ventas, aumentos y restituciones = stock de la sucursal. En traslados: Antes = origen; Después = destino.',
      headers: [
        'Fecha y hora (VE)',
        'Operación',
        'Sucursal',
        'Δ',
        'Antes',
        'Después',
        'Referencia',
      ],
      rows: [
        {
          cells: [
            '08/10/2026 17:51:49',
            'Aumento manual',
            'Zona Gamer',
            '+20',
            '0',
            '20',
            'Aumento +20',
          ],
        },
        {
          cells: [
            '09/10/2026 17:41:47',
            'Traslado',
            'Zona Gamer → Centro',
            '3',
            'Zona Gamer 20→17',
            'Centro 0→3',
            'ZG→Centro',
          ],
        },
        {
          cells: [
            '10/10/2026 12:35:03',
            'Venta OUT',
            'Centro',
            '−1',
            '3',
            '2',
            'FAC-20261010-07881',
          ],
        },
        {
          cells: [
            '10/10/2026 12:35:03',
            'Venta OUT',
            'Centro',
            '−1',
            'No verificable',
            'No verificable',
            'FAC-20261010-07881',
          ],
        },
        {
          cells: [
            '12/10/2026 13:58:35',
            'Traslado',
            'Zona Gamer → La Isla',
            '2',
            'Zona Gamer 17→15',
            'La Isla 0→2',
            'ZG→La Isla',
          ],
        },
        {
          cells: [
            '12/10/2026 14:08:24',
            'Traslado',
            'Zona Gamer → Centro',
            '5',
            'Zona Gamer 15→10',
            'Centro 1→6',
            'ZG→Centro',
          ],
        },
        {
          cells: [
            '12/10/2026 16:49:21',
            'Venta OUT',
            'Centro',
            '−1',
            '6',
            '5',
            'FAC-20261012-07922',
          ],
        },
        {
          cells: [
            '15/10/2026 17:11:57',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '10',
            '9',
            'FAC-20261015-07976',
          ],
        },
        {
          cells: [
            '16/10/2026 11:05:06',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '9',
            '8',
            'FAC-20261016-07994',
          ],
        },
        {
          cells: [
            '16/10/2026 12:34:24',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '8',
            '7',
            'FAC-20261016-08000',
          ],
        },
        {
          cells: [
            '17/10/2026 10:13:59',
            'Venta OUT',
            'Centro',
            '−1',
            '5',
            '4',
            'FAC-20261017-08037',
          ],
        },
        {
          cells: [
            '17/10/2026 10:22:33',
            'Restitución IN',
            'Centro',
            '+1',
            '3',
            '4',
            'FAC-20261017-08038',
          ],
        },
        {
          cells: [
            '17/10/2026 10:23:59',
            'Venta OUT',
            'Centro',
            '−1',
            '4',
            '3',
            'FAC-20261017-08039',
          ],
        },
        {
          cells: [
            '17/10/2026 14:44:10',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '7',
            '6',
            'FAC-20261017-08072',
          ],
        },
        {
          cells: [
            '17/10/2026 15:36:17',
            'Venta OUT',
            'Centro',
            '−1',
            '3',
            '2',
            'FAC-20261017-08080',
          ],
        },
        {
          cells: [
            '17/10/2026 15:53:37',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '6',
            '5',
            'FAC-20261017-08082',
          ],
        },
        {
          cells: [
            '20/10/2026 12:31:15',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '5',
            '4',
            'FAC-20261020-08140',
          ],
        },
        {
          cells: [
            '24/10/2026 07:05:23',
            'Aumento manual',
            'Zona Gamer',
            '+10',
            '4',
            '14',
            'Aumento +10',
          ],
        },
        {
          cells: [
            '24/10/2026 09:44:29',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '14',
            '13',
            'FAC-20261024-08220',
          ],
        },
        {
          cells: [
            '24/10/2026 12:53:53',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '13',
            '12',
            'FAC-20261024-08233',
          ],
        },
        {
          cells: [
            '24/10/2026 13:26:32',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '12',
            '11',
            'FAC-20261024-08237',
          ],
        },
        {
          cells: [
            '24/10/2026 16:59:13',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '11',
            '10',
            'FAC-20261024-08251',
          ],
        },
        {
          cells: [
            '26/10/2026 11:00:55',
            'Traslado',
            'Zona Gamer → Centro',
            '3',
            'Zona Gamer 10→7',
            'Centro 2→5',
            'ZG→Centro',
          ],
        },
        {
          cells: [
            '26/10/2026 11:21:48',
            'Traslado',
            'Zona Gamer → Marino',
            '4',
            'Zona Gamer 7→3',
            'Marino 0→4',
            'ZG→Marino',
          ],
        },
        {
          cells: [
            '27/10/2026 14:55:31',
            'Venta OUT',
            'Marino',
            '−1',
            '4',
            '3',
            'FAC-20261027-08306',
          ],
        },
        {
          cells: [
            '29/10/2026 16:41:38',
            'Venta OUT',
            'Centro',
            '−1',
            '5',
            '4',
            'FAC-20261029-08342',
          ],
        },
        {
          cells: [
            '31/10/2026 09:15:06',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '3',
            '2',
            'FAC-20261031-08368',
          ],
        },
        {
          cells: [
            '31/10/2026 11:07:54',
            'Venta OUT',
            'Marino',
            '−1',
            '3',
            '2',
            'FAC-20261031-08379',
          ],
        },
        {
          cells: [
            '31/10/2026 11:31:17',
            'Venta OUT',
            'Marino',
            '−1',
            '2',
            '1',
            'FAC-20261031-08382',
          ],
        },
        {
          cells: [
            '31/10/2026 13:30:22',
            'Venta OUT',
            'La Isla',
            '−1',
            '2',
            '1',
            'FAC-20261031-08396',
          ],
        },
        {
          cells: [
            '01/11/2026 10:18:24',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '2',
            '1',
            'FAC-20261101-08420',
          ],
        },
        {
          cells: [
            '02/11/2026 12:59:48',
            'Restitución IN',
            'Zona Gamer',
            '+1',
            '0',
            '1',
            'FAC-20261102-08456',
          ],
        },
        {
          cells: [
            '02/11/2026 13:36:43',
            'Venta OUT',
            'Centro',
            '−1',
            '4',
            '3',
            'FAC-20261102-08461',
          ],
        },
        {
          cells: [
            '03/11/2026 10:49:34',
            'Venta OUT',
            'Zona Gamer',
            '−1',
            '1',
            '0',
            'FAC-20261103-08488',
          ],
        },
        {
          cells: [
            '03/11/2026 15:38:08',
            'Venta OUT',
            'Marino',
            '−1',
            '1',
            '0',
            'FAC-20261103-08509',
          ],
        },
        {
          cells: [
            '03/11/2026 17:49:53',
            'Venta OUT',
            'Centro',
            '−1',
            '3',
            '2',
            'FAC-20261103-08523',
          ],
        }
      ],
    },

    {
      type: 'text',
      title: '5. Restituciones y anulaciones (solo 4+4)',
      paragraphs: [
        '**FAC-20261017-08038** (Centro, 17/10/2026): restitución IN +1. El OUT de esa venta **ya no aparece** en el extracto OUT consultado.',
        '**FAC-20261102-08456** (Zona Gamer, 02/11/2026): restitución IN +1. Igual: OUT original eliminado del historial OUT.',
        'Por eso el conteo de OUT vigentes es **27** (no incluye esas ventas anuladas), con **26** facturas completed distintas entre los OUT restantes (FAC-07881 aporta dos líneas).',
      ],
    },
    {
      type: 'text',
      title: '6. Hallazgos, limitaciones y conclusiones',
      paragraphs: [
        '**38** unidades OUT y **37** facturas distintas, todas **completed** en el cruce verificado.',
        'Operación coherente en el extracto: cargas en Zona Gamer, traslados sin efecto neto global, ventas documentadas, dos restituciones en 4+4.',
        'Limitaciones: (1) stock inicial del período no certificado; (2) stocks 15 y 3 = verificación previa, no Live; (3) ADJUST automáticos no son operaciones; (4) en FAC-07881 el segundo OUT no tiene ADJUST 2→1 verificable; (5) no se inventa continuidad global de saldos ni se certifica conciliación histórica integral.',
        'La particularidad del ADJUST 3→2 en FAC-07881 se documenta en el **Informe B**; no se interpreta aquí como pérdida de mercancía.',
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
