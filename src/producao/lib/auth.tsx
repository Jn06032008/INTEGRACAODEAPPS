import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type Papel = "admin" | "coordenador" | "operador" | "tecnico";

export type Perfil = {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  unit_id: string | null;
  department_id: string | null;
  ativo: boolean;
  must_change_password: boolean;
};

type ProducaoAuthValor = {
  carregando: boolean;
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  papeis: Papel[];
  temPapel: (...papeis: Papel[]) => boolean;
  ehGestor: boolean;
  recarregarPerfil: () => Promise<void>;
};

const ProducaoAuthContext = createContext<ProducaoAuthValor | null>(null);

async function buscarPerfilEPapeis(userId: string): Promise<{ perfil: Perfil | null; papeis: Papel[] }> {
  const [{ data: perfil, error: erroPerfil }, { data: linhas, error: erroPapeis }] = await Promise.all([
    supabase
      .from("producao_perfis")
      .select("id, nome, email, telefone, unit_id, department_id, ativo, must_change_password")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("producao_papeis").select("role").eq("user_id", userId),
  ]);
  if (erroPerfil) throw erroPerfil;
  if (erroPapeis) throw erroPapeis;
  const papeis = (linhas ?? []).map((l) => l.role as Papel);
  return { perfil: (perfil as Perfil | null) ?? null, papeis };
}

export function ProducaoAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [carregando, setCarregando] = useState(true);

  const userId = session?.user.id ?? null;

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      if (!data.session) setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      if (!ativo) return;
      setSession(novaSessao);
      if (!novaSessao) {
        setPerfil(null);
        setPapeis([]);
        setCarregando(false);
      }
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    let ativo = true;
    setCarregando(true);
    buscarPerfilEPapeis(userId)
      .then(({ perfil: p, papeis: ps }) => {
        if (!ativo) return;
        setPerfil(p);
        setPapeis(ps);
      })
      .catch(() => {
        if (!ativo) return;
        setPerfil(null);
        setPapeis([]);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [userId]);

  const valor: ProducaoAuthValor = {
    carregando,
    session,
    user: session?.user ?? null,
    perfil,
    papeis,
    temPapel: (...lista) => lista.some((p) => papeis.includes(p)),
    ehGestor: papeis.includes("admin") || papeis.includes("coordenador"),
    recarregarPerfil: async () => {
      if (!userId) return;
      const { perfil: p, papeis: ps } = await buscarPerfilEPapeis(userId);
      setPerfil(p);
      setPapeis(ps);
    },
  };

  return <ProducaoAuthContext.Provider value={valor}>{children}</ProducaoAuthContext.Provider>;
}

export function useProducaoAuth(): ProducaoAuthValor {
  const contexto = useContext(ProducaoAuthContext);
  if (!contexto) throw new Error("useProducaoAuth deve ser usado dentro de ProducaoAuthProvider");
  return contexto;
}

export function nomeUsuario(perfil: Perfil | null, user: User | null) {
  return perfil?.nome || user?.email?.split("@")[0] || "Usuário";
}
