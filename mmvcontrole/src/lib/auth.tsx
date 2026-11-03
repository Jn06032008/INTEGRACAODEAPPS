import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

type AuthContextValue = {
  carregando: boolean;
  session: Session | null;
  user: User | null;
  perfil: Perfil | null;
  papeis: Papel[];
  temPapel: (...papeis: Papel[]) => boolean;
  ehGestor: boolean;
  recarregarPerfil: () => Promise<void>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregarDados(userId: string) {
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    setPerfil((p as Perfil) ?? null);
    setPapeis(((r ?? []) as { role: Papel }[]).map((x) => x.role));
  }

  useEffect(() => {
    let ativo = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      if (!ativo) return;
      setSession(novaSessao);
      if (!novaSessao?.user) {
        setPerfil(null);
        setPapeis([]);
      }
    });

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      setSession(data.session);
      if (data.session?.user) await carregarDados(data.session.user.id);
      setCarregando(false);
    })();

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const id = session?.user?.id;
    if (!id) return;
    void carregarDados(id);
  }, [session?.user?.id]);

  const value: AuthContextValue = {
    carregando,
    session,
    user: session?.user ?? null,
    perfil,
    papeis,
    temPapel: (...p) => p.some((x) => papeis.includes(x)),
    ehGestor: papeis.includes("admin") || papeis.includes("coordenador"),
    recarregarPerfil: async () => {
      if (session?.user) await carregarDados(session.user.id);
    },
    sair: async () => {
      await supabase.auth.signOut();
      setPerfil(null);
      setPapeis([]);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}

export function nomeUsuario(perfil: Perfil | null, user: User | null) {
  return perfil?.nome || user?.email?.split("@")[0] || "Usuário";
}
