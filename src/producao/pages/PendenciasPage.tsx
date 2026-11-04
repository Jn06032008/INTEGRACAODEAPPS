import { useEffect, useState } from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PPageHeader } from "@/producao/components/ui";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { formatarData } from "@/producao/lib/constants";

type Checkout = { id: string; numero: string; equipment_id: string; responsavel_nome: string | null; previsao_devolucao: string | null; status: string; destino: string | null };
type Equip = { id: string; nome: string; codigo: string };

export function PendenciasPage({ onNavigate }: { onNavigate: (k: string) => void }) {
  const [atrasadas, setAtrasadas] = useState<(Checkout & { equipamento?: Equip })[]>([]);
  const [semPrev, setSemPrev] = useState<(Checkout & { equipamento?: Equip })[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      const { data } = await supabase.from("checkouts").select("*").eq("status", "aberta").order("created_at", { ascending: false });
      const agora = Date.now();
      const a = (data ?? []).filter((x) => x.previsao_devolucao && new Date(x.previsao_devolucao).getTime() < agora);
      const s = (data ?? []).filter((x) => !x.previsao_devolucao);
      const ids = [...new Set((data ?? []).map((x) => x.equipment_id))];
      const { data: eqs } = ids.length > 0 ? await supabase.from("equipment").select("id, nome, codigo").in("id", ids) : { data: [] };
      const mapa = new Map((eqs ?? []).map((e) => [e.id, e]));
      if (!c) { setAtrasadas(a.map((x) => ({ ...x as Checkout, equipamento: mapa.get(x.equipment_id) }))); setSemPrev(s.map((x) => ({ ...x as Checkout, equipamento: mapa.get(x.equipment_id) }))); setCarregando(false); }
    })();
    return () => { c = true; };
  }, []);

  if (carregando) return <p className="py-10 text-center text-sm text-slate-500">Carregando...</p>;

  return (
    <div>
      <PPageHeader title="Precisa de atenção" description="Pendências que exigem ação imediata" />
      <div className="space-y-6">
        <PCard className="border-red-200"><PCardBody>
          <div className="mb-3 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-600" /><h2 className="font-semibold">Devoluções atrasadas ({atrasadas.length})</h2></div>
          <div className="space-y-2">{atrasadas.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
              <div><p className="text-sm font-semibold">{c.equipamento?.nome ?? "Equipamento"}</p><p className="text-xs text-slate-500">{c.numero} • {c.responsavel_nome ?? "—"} • Previsto: {formatarData(c.previsao_devolucao)}</p></div>
              <div className="flex items-center gap-2"><StatusBadge label="Atrasada" tom="danger" /><button onClick={() => onNavigate("devolver")} className="inline-flex items-center gap-1 text-xs text-[#8B2635] hover:underline">Devolver <ArrowRight className="h-3 w-3" /></button></div>
            </div>
          ))}{atrasadas.length === 0 && <p className="text-sm text-slate-500">Nenhuma devolução atrasada.</p>}</div>
        </PCardBody></PCard>
        <PCard className="border-amber-200"><PCardBody>
          <div className="mb-3 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><h2 className="font-semibold">Sem previsão de retorno ({semPrev.length})</h2></div>
          <div className="space-y-2">{semPrev.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
              <div><p className="text-sm font-semibold">{c.equipamento?.nome ?? "Equipamento"}</p><p className="text-xs text-slate-500">{c.numero} • {c.responsavel_nome ?? "—"}</p></div>
              <StatusBadge label="Sem previsão" tom="warning" />
            </div>
          ))}{semPrev.length === 0 && <p className="text-sm text-slate-500">Todas as retiradas têm previsão.</p>}</div>
        </PCardBody></PCard>
      </div>
    </div>
  );
}
