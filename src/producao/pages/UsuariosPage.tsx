import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PPageHeader } from "@/producao/components/ui";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { PAPEIS, formatarData } from "@/producao/lib/constants";
import { useProducaoAuth } from "@/producao/lib/auth";

type Perfil = { id: string; nome: string; email: string | null; telefone: string | null; ativo: boolean; must_change_password: boolean };
type PapelRow = { user_id: string; role: string };

export function UsuariosPage() {
  const { ehGestor } = useProducaoAuth();
  const [perfis, setPerfis] = useState<(Perfil & { papeis: string[] })[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      const [p, r] = await Promise.all([
        supabase.from("producao_perfis").select("*").order("nome"),
        supabase.from("producao_papeis").select("user_id, role"),
      ]);
      if (c) return;
      const mapa = new Map<string, string[]>();
      (r.data ?? []).forEach((x: PapelRow) => { const arr = mapa.get(x.user_id) ?? []; arr.push(x.role); mapa.set(x.user_id, arr); });
      setPerfis((p.data ?? []).map((x) => ({ ...x as Perfil, papeis: mapa.get((x as Perfil).id) ?? [] })));
      setCarregando(false);
    })();
    return () => { c = true; };
  }, []);

  if (!ehGestor) return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <p className="font-medium text-slate-900">Acesso restrito</p>
      <p className="mt-2 text-sm text-slate-600">Apenas coordenadores e administradores podem gerenciar usuários.</p>
    </div>
  );

  if (carregando) return <p className="py-10 text-center text-sm text-slate-500">Carregando...</p>;

  return (
    <div>
      <PPageHeader title="Usuários" description="Membros da equipe de produção" />
      <div className="space-y-2">
        {perfis.map((p) => (
          <PCard key={p.id}><PCardBody className="flex items-center justify-between gap-3 p-4">
            <div><p className="font-semibold text-sm">{p.nome}</p><p className="text-xs text-slate-500">{p.email} • {p.telefone ?? "Sem telefone"}</p></div>
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap gap-1">{p.papeis.map((r) => <StatusBadge key={r} label={PAPEIS[r] ?? r} tom="primary" />)}</div>
              <StatusBadge label={p.ativo ? "Ativo" : "Inativo"} tom={p.ativo ? "success" : "neutral"} />
            </div>
          </PCardBody></PCard>
        ))}
        {perfis.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nenhum usuário cadastrado.</p>}
      </div>
    </div>
  );
}
