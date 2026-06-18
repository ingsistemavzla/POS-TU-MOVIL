import { Link } from 'react-router-dom';
import { Database, FileCheck, FileText, FolderArchive, ListChecks, ShieldCheck } from 'lucide-react';
import { listPublicInformesExceptCatalog } from '@/data/publicInformes/registry';
import { informePath, INFORMES_CATALOGO_SLUG } from '@/types/publicInforme';

const iconByCategoria: Record<string, React.ReactNode> = {
  respaldo: <FolderArchive className="h-6 w-6" />,
  inventario: <Database className="h-6 w-6" />,
  ejecucion: <FileText className="h-6 w-6" />,
  validacion: <ListChecks className="h-6 w-6" />,
  consolidado: <ShieldCheck className="h-6 w-6" />,
};

export default function PublicInformesCatalogPage() {
  const items = listPublicInformesExceptCatalog();

  return (
    <div
      className="min-h-screen bg-[#F2F2F2] text-[#0D0D0D] py-10 px-4"
      style={
        {
          ['--verde-primario' as string]: '#30D96B',
          ['--verde-oscuro' as string]: '#022601',
        } as React.CSSProperties
      }
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-10">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow mb-4">
            <FileCheck className="h-7 w-7 text-[var(--verde-primario)]" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--verde-oscuro)]">
            Informes operativos públicos
          </h1>
          <p className="mt-2 text-sm text-[#0D0D0D]/65">
            Inventory System · Public reports · No login · Slug in URL
          </p>
          <p className="mt-1 font-mono text-xs text-[#0D0D0D]/45">/informes · /informe/&lt;slug&gt;</p>
        </div>

        <ul className="space-y-4">
          {items.map((inf) => (
            <li key={inf.slug}>
              <Link
                to={informePath(inf.slug)}
                className="block rounded-xl bg-white p-5 shadow-md ring-1 ring-[#0D0D0D]/8 hover:ring-[var(--verde-primario)] transition-shadow"
              >
                <div className="flex gap-4 items-start">
                  <div className="rounded-lg bg-[var(--verde-primario)]/20 p-3 text-[var(--verde-oscuro)]">
                    {iconByCategoria[inf.categoria] ?? <FileText className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] text-[#0D0D0D]/45 mb-1">/informe/{inf.slug}</p>
                    <h2 className="font-bold text-[var(--verde-oscuro)]">{inf.titulo}</h2>
                    <p className="text-sm text-[#0D0D0D]/65 mt-1">{inf.subtitulo}</p>
                    <p className="text-xs mt-2 text-[#0D0D0D]/45">{inf.fecha}</p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>

        <p className="text-center mt-8">
          <Link
            to={informePath(INFORMES_CATALOGO_SLUG)}
            className="text-sm text-[var(--verde-oscuro)] underline"
          >
            Vista índice detallada (catálogo)
          </Link>
        </p>
      </div>
    </div>
  );
}
