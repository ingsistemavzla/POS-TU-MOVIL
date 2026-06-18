import type { PublicInforme } from '@/types/publicInforme';
import { INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const COMPANY = 'Tu Movil Margarita';
const FECHA_INFORME = '2026-06-18';
const SLUG = 'cierres-inventario-vs-estadisticas-2026';

export const informeCierresVsEstadisticas: PublicInforme = {
  slug: SLUG,
  titulo: '¿Por qué no coinciden Cierres diarios y Estadísticas?',
  subtitulo:
    'Explicación en lenguaje sencillo: diferencias de dólares y unidades entre Historial → Cierres y la pantalla Estadísticas (sin login)',
  fecha: FECHA_INFORME,
  estado: 'referencia',
  categoria: 'inventario',
  tags: ['cierres', 'estadísticas', 'inventario', 'usd', 'unidades', 'explicación', 'dueño'],
  relacionados: [
    INFORMES_CATALOGO_SLUG,
    'investigacion-cierres-estadisticas-2026',
    'inventario-estado-actual-2026-06',
    'auditoria-imei-variantes-128-256-2026',
  ],
  meta: [
    { label: 'Empresa', value: COMPANY },
    { label: 'Fecha informe', value: FECHA_INFORME },
    { label: 'Pantallas del POS', value: 'Historial → Cierres diarios · Estadísticas' },
    { label: 'URL pública', value: `/informe/${SLUG}` },
    { label: 'Audiencia', value: 'Dueños, gerentes y personal sin conocimientos técnicos' },
  ],
  sections: [
    { type: 'hero', badge: 'Inventario · Cierres · Estadísticas' },
    {
      type: 'verdict',
      titulo: 'No hay fallo del sistema — son dos formas distintas de medir',
      detalle:
        'El cierre diario guarda una foto del inventario a medianoche y valora el stock al precio de costo (lo que costó comprarlo). Estadísticas muestra el inventario en vivo y lo valora al precio de venta (lo que se cobraría al cliente). Por eso los dólares casi nunca serán iguales, y las unidades solo coinciden si comparas la misma hora del día.',
      ok: true,
    },
    {
      type: 'text',
      title: 'Para quién es este informe',
      paragraphs: [
        'Este documento responde una duda frecuente del dueño o gerente: “En Cierres diarios veo USD 113.875 y 5.728 unidades, pero en Estadísticas veo USD 158.335 y 5.611 unidades. ¿Algo está mal?”.',
        'La respuesta corta es: no necesariamente. Las dos pantallas sirven para cosas diferentes. Aquí se explica con palabras simples, sin programación.',
      ],
    },
    {
      type: 'text',
      title: 'Las dos pantallas en pocas palabras',
      paragraphs: [
        'Historial → pestaña Cierres diarios: cada noche el sistema toma una “foto” del inventario (como una fotografía a las 12:00 de la noche, hora Venezuela). Esa foto queda guardada con la fecha del día.',
        'Estadísticas: muestra cómo está el inventario ahora mismo, en el momento en que pulsas “Actualizar”. Cambia durante el día cuando se vende, se recibe mercancía o se hacen transferencias.',
        'Por eso comparar el cierre de ayer con Estadísticas de hoy a mediodía es como comparar una foto de la mañana con lo que hay en el estante ahora: las unidades pueden ser distintas.',
      ],
    },
    {
      type: 'comparison',
      title: 'Comparación directa: qué mide cada pantalla',
      rows: [
        {
          etapa: 'Cierres diarios (Historial)',
          tiendas: '5 tiendas activas',
          productos: 'Productos activos con stock',
          unidades: 'Foto a las 00:00 Venezuela',
          usd: 'Precio de COSTO (cost_usd)',
        },
        {
          etapa: 'Estadísticas (en vivo)',
          tiendas: '5 tiendas activas',
          productos: 'Productos activos con stock',
          unidades: 'Momento actual (Actualizar)',
          usd: 'Precio de VENTA (sale_price_usd)',
        },
      ],
    },
    {
      type: 'table',
      title: 'Ejemplo real — cierre del 18/06/2026 vs Estadísticas del mismo día (más tarde)',
      description:
        'Números observados en operación. Las unidades del cierre son las de medianoche; las de Estadísticas son las del momento de consulta.',
      headers: ['Concepto', 'Cierres diarios (18/06)', 'Estadísticas (en vivo)', '¿Debe ser igual?'],
      rows: [
        {
          cells: [
            'Total unidades',
            '5.728',
            '5.611',
            'Solo si miras Estadísticas exactamente a las 00:00',
          ],
        },
        {
          cells: [
            'Teléfonos',
            '507',
            '510',
            'Puede variar con ventas del día',
          ],
        },
        {
          cells: [
            'Accesorios',
            '3.484',
            '3.369',
            'Puede variar con ventas del día',
          ],
        },
        {
          cells: [
            'Servicio técnico',
            '1.737',
            '1.732',
            'Puede variar con ventas del día',
          ],
        },
        {
          cells: [
            'Valor en USD',
            'USD 113.875,64',
            'USD 158.335,70',
            'No — miden cosas distintas (ver abajo)',
          ],
        },
        {
          cells: [
            'Diferencia de unidades',
            '—',
            '117 unidades menos en vivo',
            'Normal: ventas y movimientos desde medianoche',
          ],
        },
        {
          cells: [
            'Diferencia de USD',
            '—',
            '≈ USD 44.460 más en Estadísticas',
            'Normal: venta vs costo + distinto momento',
          ],
        },
      ],
    },
    {
      type: 'table',
      title: '¿Dónde se movió el stock? (cierre 18/06 vs Estadísticas en vivo)',
      description:
        'La mayor parte de la diferencia de 117 unidades se explica por movimientos del día, sobre todo en Zona Gamer Margarita.',
      headers: ['Tienda', 'Unidades en cierre (00:00)', 'Unidades en Estadísticas', 'Diferencia'],
      rows: [
        { cells: ['Tu Móvil Centro', '931', '941', '+10'] },
        { cells: ['Tu Móvil La Isla', '85', '80', '−5'] },
        { cells: ['Tu Móvil Marino', '311', '307', '−4'] },
        { cells: ['Tu Móvil Store', '954', '950', '−4'] },
        { cells: ['Zona Gamer Margarita', '3.447', '3.333', '−114'] },
        { cells: ['TOTAL', '5.728', '5.611', '−117'] },
      ],
    },
    {
      type: 'text',
      title: 'Por qué el USD del cierre (113.875) es menor que el de Estadísticas (158.335)',
      paragraphs: [
        'Imagina una tienda de ropa: compraste una camisa a USD 20 (costo) y la vendes a USD 35 (precio de venta). Si tienes 100 camisas, el “valor a costo” es USD 2.000 y el “valor a precio de venta” es USD 3.500. Las 100 unidades son las mismas; los dólares no.',
        'Cierres diarios suma: cantidad × precio de costo de cada producto. Responde: “¿Cuánto dinero tengo invertido en mercancía?”.',
        'Estadísticas suma: cantidad × precio de venta de cada producto. Responde: “¿Cuánto dinero entraría si vendiera todo al precio de lista?”.',
        'La diferencia de unos USD 44.460 en el ejemplo es el margen bruto potencial (ganancia aproximada si vendieras todo al precio actual). Eso no es pérdida ni error contable.',
        'Productos sin costo cargado en el sistema aportan USD 0 al cierre aunque tengan unidades. Productos sin precio de venta aportan USD 0 en Estadísticas.',
      ],
    },
    {
      type: 'text',
      title: 'Por qué las unidades del cierre (5.728) y Estadísticas (5.611) no coinciden',
      paragraphs: [
        'El cierre del 18/06/2026 refleja el inventario exactamente a las 00:00 de ese día (cuando corre el proceso automático nocturno).',
        'Estadísticas muestra el inventario en el instante en que abres la pantalla y pulsas Actualizar — por ejemplo a las 10:00, 15:00 o 20:00.',
        'Entre medianoche y ese momento hubo ventas, recepciones de mercancía y transferencias entre tiendas. En el ejemplo, salieron 117 unidades netas del stock total (sobre todo ventas en Zona Gamer).',
        'El texto del POS dice que las unidades por categoría del cierre “coinciden con Estadísticas” solo cuando comparas el mismo momento: justo después de medianoche, antes de que abra la tienda y se venda algo.',
      ],
    },
    {
      type: 'steps',
      title: 'Qué hacer cuando compares números (checklist para gerencia)',
      items: [
        {
          paso: '1',
          accion: '¿Estás comparando dólares o unidades?',
          resultado:
            'Si comparas USD: recuerda que Cierres = costo y Estadísticas = precio de venta. No deben ser iguales.',
        },
        {
          paso: '2',
          accion: '¿Estás comparando la misma hora?',
          resultado:
            'Para unidades: compara el cierre de ayer con Estadísticas solo si consultas a las 00:00, o espera diferencias normales por ventas del día.',
        },
        {
          paso: '3',
          accion: '¿La diferencia de unidades es grande en una sola tienda?',
          resultado:
            'Revisa ventas y movimientos de esa sucursal en el día. En el ejemplo, Zona Gamer explica casi toda la diferencia.',
        },
        {
          paso: '4',
          accion: '¿El USD del cierre te parece “muy bajo”?',
          resultado:
            'Revisa productos sin costo cargado en Artículos. Sin costo, el sistema cuenta las unidades pero USD 0 en el cierre.',
        },
        {
          paso: '5',
          accion: '¿Necesitas un solo número para el dueño?',
          resultado:
            'Patrimonio invertido → Cierres diarios (USD a costo). Valor de venta potencial → Estadísticas. Usa el que corresponda a la pregunta.',
        },
      ],
    },
    {
      type: 'text',
      title: 'Conclusión para cualquier persona (sin tecnicismos)',
      paragraphs: [
        'El sistema no está “restando mal” ni perdiendo USD 44.000. Simplemente muestra dos preguntas distintas en dos pantallas.',
        'Cierres diarios = foto de medianoche + “¿cuánto me costó la mercancía que tengo?”.',
        'Estadísticas = inventario de ahora + “¿cuánto valdría vender todo?”.',
        'Si el dueño pregunta por el total en dólares, primero aclare qué quiere saber: inversión en stock (cierre) o valor de venta (estadísticas). Con eso desaparece la confusión.',
      ],
    },
    {
      type: 'links',
      title: 'Enlaces',
      items: [
        { label: 'Catálogo de informes', href: '/informes' },
        { label: 'Inventario actual (5 tiendas)', href: '/informe/inventario-estado-actual-2026-06' },
        {
          label: 'POS — Historial / Cierres',
          href: 'https://pos-tu-movil.onrender.com/historial',
          external: true,
        },
        {
          label: 'POS — Estadísticas',
          href: 'https://pos-tu-movil.onrender.com/estadisticas',
          external: true,
        },
      ],
    },
  ],
};

export const ALL_CIERRES_ESTADISTICAS_INFORMES: PublicInforme[] = [informeCierresVsEstadisticas];
