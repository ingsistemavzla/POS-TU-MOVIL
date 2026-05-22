export const PROPUESTA_META = {
  tituloPrincipal: 'Sistema de Control Técnico',
  cliente: 'Tu Móvil Margarita',
  subtitulo: 'Sistema Gestión integral — Servicio técnico',
  ruta: '/presupuesto-sistema-servicio-tecnico',
};

/** 1 — Objetivo general (apertura unificada) */
export const OBJETIVO_GENERAL =
  'Desarrollar un sistema especializado en gestión de servicios técnicos y órdenes de recibo detalladas, formales y validadas por el cliente, que opere de manera paralela, independiente y separada del sistema principal Tu Móvil POS, bajo una arquitectura híbrida paralela que requiere implementación técnica rigurosa y específica para no alterar el sistema en producción bajo ningún concepto, extrayendo del POS únicamente la información relacionada a la categoría de servicios técnicos (productos, repuestos, inventario, precios, clientes, stock).';

export const OBJETIVO_GENERAL_CIERRE =
  'El sistema resultante permitirá administrar de forma profesional todo el flujo operativo del área técnica, manteniendo trazabilidad completa sobre cada dispositivo ingresado, control de inventario especializado y protección operativa tanto para la empresa como para el cliente.';

/** 2 — Definición general */
export const DEFINICION_INTRO =
  'El presente proyecto contempla el desarrollo de un sistema especializado de gestión de servicio técnico, orientado al control operativo, administrativo, documental y técnico de dispositivos ingresados a reparación dentro del ecosistema de Tu Móvil Margarita.';

export const DEFINICION_PLATAFORMA =
  'La solución será implementada como plataforma independiente, paralela y desacoplada del sistema principal Tu Móvil POS, bajo arquitectura híbrida paralela con sincronización controlada, diseñada específicamente para preservar la estabilidad del entorno actualmente en producción.';

export const CAPACIDADES_INFRAESTRUCTURA = [
  'Gestionar órdenes técnicas de forma profesional',
  'Emitir órdenes de recibo detalladas y validadas por clientes',
  'Registrar evidencia técnica, física y fotográfica de equipos ingresados',
  'Controlar producción técnica y flujo operativo interno',
  'Administrar repuestos y consumibles asociados a reparaciones',
  'Sincronizar inventario técnico con Tu Móvil POS',
  'Centralizar documentación técnica, reportes y trazabilidad',
  'Mantener control legal y administrativo mediante términos y condiciones digitales',
  'Emitir recibos, reportes y facturación relacionada al área técnica',
];

/** 3 — Arquitectura híbrida: contexto y enfoque */
export const ARQUITECTURA_CONTEXTO =
  'El área de servicio técnico posee una lógica operativa completamente distinta a las ventas tradicionales, requiriendo procesos especializados, estados técnicos, evidencias multimedia y control interno de producción. NO se busca modificar Tu Móvil POS como sistema técnico principal.';

export const RIESGOS_INTEGRAR_EN_POS = [
  'Saturación del sistema comercial',
  'Alteraciones sobre producción',
  'Riesgo de corrupción de datos',
  'Pérdida de estabilidad operativa',
  'Dependencia estructural peligrosa',
  'Limitaciones de escalabilidad futura',
  'Mezcla incorrecta entre lógica comercial y lógica técnica',
  'Mayor complejidad de mantenimiento',
  'Problemas de rendimiento',
  'Dificultad para auditorías técnicas especializadas',
];

export const ENFOQUE_CORRECTO =
  'Desarrollar una plataforma especializada independiente, conectada estratégicamente al POS mediante mecanismos controlados de sincronización e integración de datos.';

/** 4 — Objetivos del sistema */
export const OBJETIVOS_SISTEMA_GARANTIAS = [
  'Trazabilidad completa de dispositivos',
  'Protección operativa y legal',
  'Control estricto de producción técnica',
  'Gestión documental avanzada',
  'Sincronización de inventario técnico',
  'Automatización de procesos internos',
  'Auditoría completa de reparaciones',
  'Integración controlada con Tu Móvil POS',
];

/** 5 — Objetivos funcionales */
export interface ObjetivoFuncional {
  id: string;
  titulo: string;
  items: string[];
  extras?: string[];
}

export const OBJETIVOS_FUNCIONALES: ObjetivoFuncional[] = [
  {
    id: 'recepcion',
    titulo: 'Recepción profesional de equipos',
    items: [
      'Marca, modelo, IMEI, serial, color, capacidad',
      'Estado físico y estado técnico',
      'Golpes, rayones, humedad, pantalla, cámaras',
      'Face ID, huella, micrófono, WiFi',
      'Accesorios entregados, fallas reportadas, observaciones técnicas',
    ],
    extras: [
      'Evidencias fotográficas obligatorias',
      'Video opcional',
      'Firma digital del cliente',
      'Validación de términos y condiciones',
      'Generación de comprobante de recepción',
    ],
  },
  {
    id: 'ordenes',
    titulo: 'Gestión de órdenes técnicas',
    items: [
      'Creación automática de órdenes',
      'Código QR por orden y recibo imprimible',
      'Asignación de técnicos, costos estimados',
      'Historial cronológico, seguimiento operativo',
      'Registro de eventos internos',
    ],
    extras: [
      'Recibido',
      'Diagnóstico',
      'Esperando aprobación',
      'Esperando repuesto',
      'En reparación',
      'Reparado',
      'Listo para entrega',
      'Entregado',
      'Garantía',
      'Devolución',
    ],
  },
  {
    id: 'produccion',
    titulo: 'Control de producción técnica',
    items: [
      'Control de carga técnica y seguimiento por técnico',
      'Monitoreo de tiempos y auditoría operativa',
      'Gestión de productividad y control de órdenes activas',
      'Registro histórico completo',
    ],
  },
  {
    id: 'evidencias',
    titulo: 'Gestión de evidencias y protección legal',
    items: [
      'Órdenes de ingreso y recibos técnicos',
      'Términos y condiciones y documentos PDF',
      'Evidencias anexas y validaciones digitales',
      'Historial documental',
    ],
    extras: [
      'Proteger legal y operativamente al proveedor del servicio ante cualquier reclamación posterior.',
    ],
  },
];

/** 6 — Arquitectura tecnológica */
export const ARQUITECTURA_TECNICA_PILARES = [
  'El sistema técnico operará sobre su propia base de datos',
  'Tendrá su propio backend y entorno de ejecución',
  'Lógica operativa completamente independiente',
  'El POS no será alterado estructuralmente',
  'La integración será controlada y limitada',
];

export const PRINCIPIO_NO_ALTERACION = [
  'Modificar lógica interna del POS',
  'Sobrecargar procesos productivos',
  'Alterar estructura comercial existente',
  'Comprometer estabilidad operativa',
  'Romper consistencia de datos',
];

export const PRINCIPIO_INTEGRACION =
  'La integración deberá realizarse mediante mecanismos controlados de sincronización.';

/** 7 — Mirror Sync */
export const MIRROR_SYNC_DESCRIPCION =
  'La solución recomendada consiste en implementar un modelo de sincronización espejo (Mirror Sync Architecture). El sistema técnico mantendrá una copia sincronizada exclusivamente de la categoría relacionada al área técnica dentro del POS.';

export const LECTURA_DESDE_POS = [
  'Productos técnicos',
  'Repuestos y componentes',
  'Inventario técnico',
  'Categoría «Servicio Técnico» (específicamente)',
  'Clientes',
  'Stock',
  'Precios',
];

export const ESCRITURA_HACIA_POS = [
  'Descuentos de inventario',
  'Consumo de piezas',
  'Movimientos técnicos',
  'Ajustes de stock',
  'Facturación operativa opcional',
];

/** 8 — Bases de datos */
export const BD_POS = {
  titulo: 'Base de datos principal — Tu Móvil POS',
  items: ['Ventas', 'Compras', 'Clientes', 'Inventario general', 'Facturación', 'Operaciones comerciales'],
};

export const BD_TECNICA = {
  titulo: 'Base de datos técnica — Sistema servicio técnico',
  items: [
    'Órdenes técnicas',
    'Diagnósticos',
    'Técnicos',
    'Evidencias y fotografías',
    'Garantías y estados',
    'Tiempos y producción',
    'Historial',
    'Consumo técnico',
    'Trazabilidad completa',
  ],
};

/** 9 — Módulos (lista única consolidada) */
export interface ModuloSistema {
  numero: number;
  titulo: string;
  descripcion: string;
  metricas?: string[];
}

export const MODULOS_SISTEMA: ModuloSistema[] = [
  {
    numero: 1,
    titulo: 'Recepción técnica',
    descripcion:
      'Ingreso completo de equipos con fotografías, firma digital y términos y condiciones.',
  },
  {
    numero: 2,
    titulo: 'Diagnóstico',
    descripcion: 'Evaluación técnica, costos estimados, observaciones y autorización del cliente.',
  },
  {
    numero: 3,
    titulo: 'Producción técnica',
    descripcion: 'Pipeline de reparación con estados, asignación de técnicos y seguimiento.',
  },
  {
    numero: 4,
    titulo: 'Control de repuestos',
    descripcion:
      'Registro de piezas utilizadas por orden, descuento automático de inventario y sincronización con POS.',
  },
  {
    numero: 5,
    titulo: 'Garantías',
    descripcion: 'Seguimiento post-servicio, control de períodos y reingresos automáticos.',
  },
  {
    numero: 6,
    titulo: 'Entrega',
    descripcion: 'Validación final, conformidad del cliente, firma de cierre y liberación del equipo.',
  },
  {
    numero: 7,
    titulo: 'Reportes y métricas',
    descripcion: 'Análisis operativo y de rentabilidad del área técnica.',
    metricas: [
      'Técnicos más productivos',
      'Fallas más frecuentes',
      'Rentabilidad por orden y por técnico',
      'Tiempo promedio de reparación',
      'Equipos recurrentes',
      'Inventario consumido',
      'Órdenes en garantía',
      'Órdenes activas',
    ],
  },
];

export const BENEFICIOS_ARQUITECTURA = [
  'Mayor estabilidad operativa',
  'Mejor rendimiento',
  'Escalabilidad futura',
  'Seguridad estructural',
  'Independencia técnica',
  'Trazabilidad completa',
  'Auditoría profesional',
  'Menor riesgo de corrupción de datos',
  'Mejor control de inventario técnico',
  'Posibilidad de operación offline parcial',
  'Mayor velocidad operativa',
];

/** 10 — Fases comerciales */
export interface FaseComercial {
  numero: number;
  /** Enfoque principal de la fase (título visible) */
  enfoque: string;
  titulo: string;
  valorUsd: number;
  valorBcv: number;
  objetivo: string;
  incluye: string[];
  resultado: string;
  critica?: boolean;
}

export const FASES_COMERCIALES: FaseComercial[] = [
  {
    numero: 1,
    enfoque: 'Estructuración de Implementación',
    titulo: 'Investigación y arquitectura',
    valorUsd: 100,
    valorBcv: 125,
    objetivo: 'Definir la arquitectura operativa y técnica del ecosistema.',
    incluye: [
      'Levantamiento operativo e investigación de flujos',
      'Análisis del POS',
      'Diseño relacional y arquitectura backend/frontend',
      'Diseño de integración y mapeo de sincronización',
    ],
    resultado: 'Blueprint completo del sistema.',
  },
  {
    numero: 2,
    enfoque: 'Estructuración Funcional',
    titulo: 'UX/UI y experiencia operativa',
    valorUsd: 100,
    valorBcv: 125,
    objetivo: 'Diseñar la experiencia de usuario y flujo operativo.',
    incluye: [
      'Dashboard técnico y recepción de equipos',
      'Diseño responsive y flujo de órdenes',
      'PDFs y prototipos navegables',
    ],
    resultado: 'Sistema visual aprobado.',
  },
  {
    numero: 3,
    enfoque: 'Desarrollo Operativo',
    titulo: 'Desarrollo backend core',
    valorUsd: 100,
    valorBcv: 125,
    objetivo: 'Construir toda la lógica operativa del sistema.',
    incluye: [
      'API principal, roles y permisos',
      'Motor de órdenes, evidencias multimedia, PDFs y QR',
      'Auditoría y base de datos',
    ],
    resultado: 'Backend funcional.',
  },
  {
    numero: 4,
    enfoque: 'Desarrollo Estructural',
    titulo: 'Desarrollo frontend',
    valorUsd: 100,
    valorBcv: 125,
    objetivo: 'Desarrollar interfaces operativas.',
    incluye: [
      'Panel administrativo y dashboard',
      'Recepción, gestión técnica, seguimiento y producción',
    ],
    resultado: 'Frontend operativo.',
  },
  {
    numero: 5,
    enfoque: 'Integración POS - Dual - Base de Datos',
    titulo: 'Integración POS y sincronización',
    valorUsd: 100,
    valorBcv: 125,
    objetivo: 'Conectar ambos ecosistemas sin afectar producción.',
    incluye: [
      'Mirror Sync e integración de inventario',
      'Consumo de piezas, actualización de stock',
      'Validación de consistencia y automatización de movimientos',
    ],
    resultado: 'Inventario técnico sincronizado.',
    critica: true,
  },
  {
    numero: 6,
    enfoque: 'Implementación y Estructuración',
    titulo: 'Testing, estabilización y despliegue',
    valorUsd: 100,
    valorBcv: 125,
    objetivo: 'Validar el sistema y llevarlo a producción.',
    incluye: [
      'Testing funcional y simulación real',
      'Validación de sincronización y corrección de incidencias',
      'Deployment, seguridad, backups y capacitación',
    ],
    resultado: 'Sistema estable en producción.',
  },
];

export const INVERSION = {
  totalUsd: 600,
  totalBcv: 750,
  porFaseUsd: 100,
  porFaseBcv: 125,
  nota: 'Seis fases · $100 USD / 125 BCV por fase',
};

/** 11 — Resultado esperado */
export const RESULTADO_ESPERADO = [
  'Profesionalizar el área de servicio técnico',
  'Garantizar trazabilidad absoluta',
  'Automatizar operaciones internas',
  'Mejorar control administrativo',
  'Centralizar documentación técnica',
  'Proteger legalmente al proveedor',
  'Integrar inventario técnico con POS',
  'Escalar operativamente a futuro',
];

/** 12 — Consideraciones finales */
export const CONSIDERACIONES_FINALES = [
  'El sistema técnico y el POS son plataformas separadas',
  'La arquitectura implementada será híbrida y paralela',
  'La integración será controlada y desacoplada',
  'El POS continuará siendo el núcleo comercial principal',
  'El sistema técnico será el núcleo operativo del área de reparaciones',
  'Solo se sincronizará información relacionada al área técnica',
  'Toda la lógica documental, productiva y operativa residirá exclusivamente en el nuevo sistema técnico',
];

export const CIERRE_TECNICO_INTRO =
  'La solución correcta consiste en desarrollar un ecosistema técnico completamente independiente, operando bajo arquitectura híbrida paralela desacoplada.';

export const CIERRE_TECNICO_REQUISITOS = [
  'Proteger el entorno productivo actual',
  'Evitar alteraciones sobre el sistema comercial',
  'Mantener estabilidad operativa',
  'Permitir escalabilidad futura',
  'Garantizar trazabilidad técnica especializada',
  'Optimizar rendimiento y seguridad',
];

/** Índice de navegación (orden lógico de lectura) */
export const SECCIONES_NAV = [
  { id: 'objetivo', label: 'Objetivo' },
  { id: 'definicion', label: 'Definición' },
  { id: 'arquitectura', label: 'Arquitectura' },
  { id: 'funcional', label: 'Funcional' },
  { id: 'tecnologia', label: 'Tecnología' },
  { id: 'integracion', label: 'Integración' },
  { id: 'datos', label: 'Bases de datos' },
  { id: 'modulos', label: 'Módulos' },
  { id: 'beneficios', label: 'Beneficios' },
  { id: 'fases', label: 'Fases' },
  { id: 'cierre', label: 'Cierre' },
];
