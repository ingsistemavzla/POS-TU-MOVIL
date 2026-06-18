import type { PublicInforme } from '@/types/publicInforme';
import { ALL_AUDITORIA_IMEI_INFORMES } from './auditoriaImeiVariantes2026';
import { ALL_PUBLIC_INFORMES as MARINO_INFORMES } from './operacionSucursalMarino2026';

const ALL_PUBLIC_INFORMES: PublicInforme[] = [...MARINO_INFORMES, ...ALL_AUDITORIA_IMEI_INFORMES];

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
