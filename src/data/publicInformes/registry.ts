import type { PublicInforme } from '@/types/publicInforme';
import { ALL_AUDITORIA_IMEI_INFORMES } from './auditoriaImeiVariantes2026';
import { ALL_AUDITORIA_STOCK_A16_INFORMES } from './auditoriaStockGalaxyA16Rf8ya0dk6zf2026';
import { ALL_CIERRES_ESTADISTICAS_INFORMES } from './cierresVsEstadisticas2026';
import { ALL_GERENTE_A16_IMEI_INFORMES } from './gerenteA16ImeiEmailsCarga15Hasta20jul2026';
import { ALL_A16_CARGA20_CENTRO_INFORMES } from './a16Carga20Centro17jul2026';
import { ALL_A16_CALENDARIO_CARGAS_INFORMES } from './a16CalendarioCargas2026';
import { ALL_A16_ULTIMA_CARGA_GERENTE_INFORMES } from './a16UltimaCargaGerenteVsSistema2026';
import { ALL_INVESTIGACION_CIERRES_INFORMES } from './investigacionCierresEstadisticas2026';
import { ALL_PUBLIC_INFORMES as MARINO_INFORMES } from './operacionSucursalMarino2026';
import { informeRespuestaGerenteGalaxyA16CeroCarga } from './respuestaGerenteGalaxyA16CeroCarga2026';

const ALL_PUBLIC_INFORMES: PublicInforme[] = [
  ...MARINO_INFORMES,
  ...ALL_AUDITORIA_IMEI_INFORMES,
  ...ALL_AUDITORIA_STOCK_A16_INFORMES,
  informeRespuestaGerenteGalaxyA16CeroCarga,
  ...ALL_GERENTE_A16_IMEI_INFORMES,
  ...ALL_A16_CARGA20_CENTRO_INFORMES,
  ...ALL_A16_CALENDARIO_CARGAS_INFORMES,
  ...ALL_A16_ULTIMA_CARGA_GERENTE_INFORMES,
  ...ALL_CIERRES_ESTADISTICAS_INFORMES,
  ...ALL_INVESTIGACION_CIERRES_INFORMES,
];

const bySlug = new Map<string, PublicInforme>();

for (const informe of ALL_PUBLIC_INFORMES) {
  bySlug.set(informe.slug, informe);
}

export function getPublicInforme(slug: string): PublicInforme | undefined {
  return bySlug.get(slug);
}

export function listPublicInformes(): PublicInforme[] {
  return [...ALL_PUBLIC_INFORMES];
}

export function listPublicInformesExceptCatalog(): PublicInforme[] {
  return ALL_PUBLIC_INFORMES.filter((i) => i.categoria !== 'indice');
}
