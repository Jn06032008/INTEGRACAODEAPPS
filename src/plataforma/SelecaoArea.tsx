import { DESCRICAO_AREAS } from '@/plataforma/areas';
import { usePlataforma } from '@/plataforma/PlataformaContext';

export function SelecaoArea() {
  const { perfil, areas, escolherArea } = usePlataforma();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium text-teal-700">Olá, {perfil?.nome}</p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">Escolha uma área</h1>
        <p className="mt-2 text-slate-600">Você pode trocar de área a qualquer momento pelo menu do topo.</p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {areas.map((area) => (
            <button
              key={area.chave}
              type="button"
              onClick={() => escolherArea(area.chave)}
              className="group rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-teal-600 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
            >
              <span className="text-xl font-semibold text-slate-900 group-hover:text-teal-700">{area.nome}</span>
              <span className="mt-2 block text-sm leading-relaxed text-slate-600">
                {DESCRICAO_AREAS[area.chave] ?? 'Área da plataforma.'}
              </span>
              <span className="mt-6 inline-block text-sm font-medium text-teal-700">Entrar na área &rarr;</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
