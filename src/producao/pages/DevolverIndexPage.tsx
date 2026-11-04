import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PInput, PPageHeader } from "@/producao/components/ui";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { formatarData } from "@/producao/lib/constants";

type Checkout = { id: string; numero: string; equipment_id: string; responsavel_nome: string | null; destino: string | null; previsao_devolucao: string | null; status: string };
type Equip = { id: string; nome: string; codigo: string };

export function DevolverIndexPage({ onDevolver }: { onDevolver: (id: string) => void }) {
  const [busca, setBusca] = useState("");
  const [checkouts, setCheckouts] = useState<(Checkout & { equipamento?: Equip })[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      const { data } = await supabase.from("checkouts").select("id, numero, equipment_id, responsavel_nome, destino, previsao_devolucao, status").eq("status", "aberta").order("created_at", { ascending: false });
      const ids = [...new Set((data ?? []).map((x) => x.equipment_id))];
      const { data: eqs } = await supabase.from("equipment").select("id, nome, codigo").in("id", ids);
      const mapa = new Map((eqs ?? []).map((e) => [e.id, e]));
      if (!c) { setCheckouts((data ?? []).map((x) => ({ ...x, equipamento: mapa.get(x.equipment_id) }))); setCarregando(false); }
    })();
    return () => { c = true; };
  }, []);

  const lista = checkouts.filter((c) => {
    const t = busca.trim().toLowerCase();
    return !t || [c.numero, c.equipamento?.nome, c.equipamento?.codigo, c.responsavel_nome, c.destino].filter(Boolean).some((v) => String(v).toLowerCase().includes(t));
  });

  return (
    <div>
      <PPageHeader title="Devolver equipamento" description="Selecione a retirada que será devolvida" />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <PInput className="pl-9" placeholder="Buscar por número, equipamento ou responsável..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {carregando ? <p className="py-10 text-center text-sm text-slate-500">Carregando...</p> : (
        <div className="space-y-3">
          {lista.map((c) => (
            <button key={c.id} onClick={() => onDevolver(c.id)} className="block w-full text-left">
              <PCard className="transition-shadow hover:shadow-md"><PCardBody className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0"><p className="truncate font-bold">{c.equipamento?.nome ?? "Equipamento"}</p><p className="text-xs text-slate-500">{c.numero} • {c.responsavel_nome ?? "—"}</p><p className="text-xs text-slate-500">Devolução prevista: {formatarData(c.previsao_devolucao, false)}</p></div>
                <StatusBadge label={c.previsao_devolucao && new Date(c.previsao_devolucao).getTime() < Date.now() ? "Atrasada" : "No prazo"} tom={c.previsao_devolucao && new Date(c.previsao_devolucao).getTime() < Date.now() ? "danger" : "info"} />
              </PCardBody></PCard>
            </button>
          ))}
          {lista.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nenhuma retirada em aberto.</p>}
        </div>
      )}
    </div>
  );
}
