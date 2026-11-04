import type { ReactNode } from 'react';
import { Spinner } from '@/components/ui';
import { LoginScreen } from '@/plataforma/LoginScreen';
import { PlataformaProvider, usePlataforma } from '@/plataforma/PlataformaContext';
import { PlataformaShell } from '@/plataforma/PlataformaShell';
import { SelecaoArea } from '@/plataforma/SelecaoArea';

function Plataforma() {
  const { sessao, perfil, areas, carregando, erro, areaAtiva, tentarNovamente, sair } = usePlataforma();

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    );
  }

  if (!sessao) return <LoginScreen />;

  if (erro) {
    return (
      <Mensagem titulo="Algo deu errado" texto={erro}>
        <button type="button" onClick={tentarNovamente} className="rounded-lg bg-teal-700 px-4 py-2 font-medium text-white transition hover:bg-teal-800">
          Tentar novamente
        </button>
        <button type="button" onClick={() => void sair()} className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100">
          Sair
        </button>
      </Mensagem>
    );
  }

  if (!perfil || !perfil.ativo) {
    return (
      <Mensagem titulo="Acesso indisponível" texto="Sua conta não tem acesso ativo à plataforma. Procure a administração.">
        <button type="button" onClick={() => void sair()} className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100">
          Sair
        </button>
      </Mensagem>
    );
  }

  if (areas.length === 0) {
    return (
      <Mensagem titulo="Nenhuma área liberada" texto="Sua conta ainda não tem nenhuma área liberada. Procure a administração.">
        <button type="button" onClick={() => void sair()} className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-100">
          Sair
        </button>
      </Mensagem>
    );
  }

  if (!areaAtiva) return <SelecaoArea />;

  return <PlataformaShell />;
}

function Mensagem({ titulo, texto, children }: { titulo: string; texto: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-slate-900">{titulo}</h1>
        <p className="mt-2 text-sm text-slate-600">{texto}</p>
        <div className="mt-6 flex justify-center gap-3">{children}</div>
      </div>
    </div>
  );
}

function App() {
  return (
    <PlataformaProvider>
      <Plataforma />
    </PlataformaProvider>
  );
}

export default App;
