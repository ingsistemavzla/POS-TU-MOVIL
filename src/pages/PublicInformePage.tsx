import { Link, useParams } from 'react-router-dom';
import { PublicInformeLayout } from '@/components/publicInforme/PublicInformeLayout';
import { PublicInformeSections } from '@/components/publicInforme/PublicInformeSections';
import { getPublicInforme } from '@/data/publicInformes/registry';
import { informePath, INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

export default function PublicInformePage() {
  const { slug } = useParams<{ slug: string }>();
  const informe = slug ? getPublicInforme(slug) : undefined;

  if (!informe) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F2F2F2] px-4">
        <h1 className="text-xl font-bold text-[#022601] mb-2">Informe no encontrado</h1>
        <p className="text-sm text-[#0D0D0D]/60 mb-6 font-mono">/informe/{slug ?? '—'}</p>
        <Link
          to={informePath(INFORMES_CATALOGO_SLUG)}
          className="rounded-lg bg-[#30D96B] px-4 py-2 text-sm font-semibold text-[#022601]"
        >
          Ver catálogo de informes
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
