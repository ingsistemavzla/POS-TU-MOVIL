import { Link, useParams } from 'react-router-dom';
import { PublicInformeLayout } from '@/components/publicInforme/PublicInformeLayout';
import { PublicInformeSections } from '@/components/publicInforme/PublicInformeSections';
import { getPublicInforme } from '@/data/publicInformes/registry';
import { informePath, INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';
import { INVENTORY_SYSTEM_NAME } from '@/constants/inventorySystemBranding';
import { PUBLIC_INVENTORY_THEME_VARS, PUBLIC_PAGE_BG } from '@/constants/publicInventoryTheme';

export default function PublicInformePage() {
  const { slug } = useParams<{ slug: string }>();
  const informe = slug ? getPublicInforme(slug) : undefined;

  if (!informe) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ ...PUBLIC_INVENTORY_THEME_VARS, backgroundColor: PUBLIC_PAGE_BG }}
      >
        <h1 className="text-xl font-bold text-[var(--verde-oscuro)] mb-2">Report not found</h1>
        <p className="text-sm text-[#0D0D0D]/60 mb-6 font-mono">/informe/{slug ?? '—'}</p>
        <Link
          to={informePath(INFORMES_CATALOGO_SLUG)}
          className="rounded-lg bg-[var(--verde-primario)] px-4 py-2 text-sm font-semibold text-white"
        >
          {INVENTORY_SYSTEM_NAME} · View catalog
        </Link>
      </div>
    );
  }

  return (
    <PublicInformeLayout informe={informe}>
      <PublicInformeSections sections={informe.sections} />
    </PublicInformeLayout>
  );
}
