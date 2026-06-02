import type { PublicInforme } from '@/types/publicInforme';
import { ALL_PUBLIC_INFORMES } from './operacionSucursalMarino2026';

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
