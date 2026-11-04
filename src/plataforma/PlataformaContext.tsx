import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  nivel_chave: string;
  ativo: boolean;
};

export type Area = {
  chave: string;
  nome: string;
};

type PlataformaValor = {
  sessao: Session | null;
  perfil: Perfil | null;
  areas: Area[];
  carregando: boolean;
  erro: string | null;
  areaAtiva: string | null;
  escolherArea: (chave: string | null) => void;
  tentarNovamente: () => void;
  sair: () => Promise<void>;
};

const PlataformaContext = createContext<PlataformaValor | null>(null);

async function carregarAcesso(userId: string): Promise<{ perfil: Perfil | null; areas: Area[] }> {
  const { data: perfil, error: erroPerfil } = await supabase
    .from('perfis')
    .select('id, nome, email, nivel_chave, ativo')
    .eq('id', userId)
    .maybeSingle();
  if (erroPerfil) throw erroPerfil;
  if (!perfil) return { perfil: null, areas: [] };

  const { data: todas, error: erroAreas } = await supabase
    .from('areas')
    .select('chave, nome')
    .eq('ativa', true)
    .order('chave');
  if (erroAreas) throw erroAreas;
  const listaAreas = todas ?? [];

  if (!perfil.ativo) return { perfil, areas: [] };
  if (perfil.nivel_chave === 'master') return { perfil, areas: listaAreas };

  const { data: vinculos, error: erroVinculos } = await supabase
    .from('perfil_areas')
    .select('area_chave')
    .eq('perfil_id', userId);
  if (erroVinculos) throw erroVinculos;

  const permitidas = new Set((vinculos ?? []).map((v) => v.area_chave));
  return { perfil, areas: listaAreas.filter((a) => permitidas.has(a.chave)) };
}

export function PlataformaProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [iniciando, setIniciando] = useState(true);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [carregandoAcesso, setCarregandoAcesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [areaAtiva, setAreaAtiva] = useState<string | null>(null);
  const [versao, setVersao] = useState(0);

  const userId = sessao?.user.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setIniciando(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao);
      if (!novaSessao) setAreaAtiva(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userId) {
      setPerfil(null);
      setAreas([]);
      setErro(null);
      return;
    }
    let cancelado = false;
    setCarregandoAcesso(true);
    setErro(null);
    carregarAcesso(userId)
      .then((acesso) => {
        if (cancelado) return;
        setPerfil(acesso.perfil);
        setAreas(acesso.areas);
      })
      .catch(() => {
        if (!cancelado) setErro('Não foi possível carregar seu acesso. Verifique sua conexão e tente novamente.');
      })
      .finally(() => {
        if (!cancelado) setCarregandoAcesso(false);
      });
    return () => {
      cancelado = true;
    };
  }, [userId, versao]);

  const sair = async () => {
    await supabase.auth.signOut();
    setAreaAtiva(null);
  };

  const valor: PlataformaValor = {
    sessao,
    perfil,
    areas,
    carregando: iniciando || carregandoAcesso,
    erro,
    areaAtiva,
    escolherArea: setAreaAtiva,
    tentarNovamente: () => setVersao((v) => v + 1),
    sair,
  };

  return <PlataformaContext.Provider value={valor}>{children}</PlataformaContext.Provider>;
}

export function usePlataforma(): PlataformaValor {
  const contexto = useContext(PlataformaContext);
  if (!contexto) throw new Error('usePlataforma deve ser usado dentro de PlataformaProvider');
  return contexto;
}
