import { EstudioApp } from '@/estudio/EstudioApp';
import { ProducaoApp } from '@/producao/ProducaoApp';
import { DESCRICAO_AREAS } from '@/plataforma/areas';
import { usePlataforma } from '@/plataforma/PlataformaContext';

export function PlataformaShell() {
  const { perfil, areas, areaAtiva, escolherArea, sair } = usePlataforma();
  const area = areas.find((a) => a.chave === areaAtiva);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-xs font-semibold text-white">
              MMV
            </div>
            <span className="font-semibold text-slate-900">Plataforma MMV</span>
          </div>

          <nav aria-label="Trocar de área" className="flex flex-wrap items-center gap-2">
            {areas.map((a) => {
              const ativa = a.chave === areaAtiva;
              return (
                <button
                  key={a.chave}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => escolherArea(a.chave)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                    ativa
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {a.nome}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-600 sm:inline">{perfil?.nome}</span>
            <button
              type="button"
              onClick={() => void sair()}
              className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {areaAtiva === 'estudio' ? (
        <EstudioApp />
      ) : (
        <main className="mx-auto max-w-6xl px-4 py-10">
          {area && (
            <>
              <h1 className="text-3xl font-semibold text-slate-900">{area.nome}</h1>
              <p className="mt-2 text-slate-600">{DESCRICAO_AREAS[area.chave] ?? 'Área da plataforma.'}</p>
              <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
                <p className="font-medium text-slate-800">As telas desta área ainda não foram conectadas.</p>
                <p className="mt-2 text-sm text-slate-600">
                  Esta é a prévia da estrutura unificada. A área de {area.nome} será conectada em uma próxima etapa.
                </p>
              </div>
            </>
          )}
        </main>
      )}
    </div>
  );
}
