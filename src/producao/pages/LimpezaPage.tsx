import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PButton, PPageHeader, PTextarea } from "@/producao/components/ui";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { formatarData } from "@/producao/lib/constants";
import { toast } from "@/producao/lib/toast";

type Ordem = { id: string; equipment_id: string; status: string; observacoes: string | null; created_at: string; concluida_em: string | null };
type Equip = { id: string; nome: string; codigo: string };

export function LimpezaPage() {
  const [ordens, setOrdens] = useState<(Ordem & { equipamento?: Equip })[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    const { data } = await supabase.from("cleaning_orders").select("*").order("created_at", { ascending: false });
    const ids = [...new Set((data ?? []).map((x) => x.equipment_id))];
    const { data: eqs } = ids.length > 0 ? await supabase.from("equipment").select("id, nome, codigo").in("id", ids) : { data: [] };
    const mapa = new Map((eqs ?? []).map((e) => [e.id, e]));
    setOrdens((data ?? []).map((x) => ({ ...x as Ordem, equipamento: mapa.get(x.equipment_id) })));
    setCarregando(false);
  }

  useEffect(() => { void carregar(); }, []);

  async function concluir(id: string) {
    await supabase.from("cleaning_orders").update({ status: "concluida", concluida_em: new Date().toISOString() }).eq("id", id);
    toast("Limpeza concluída!", "success");
    void carregar();
  }

  if (carregando) return <p className="py-10 text-center text-sm text-slate-500">Carregando...</p>;

  return (
    <div>
      <PPageHeader title="Limpeza e revisão" description="Equipamentos que precisam de cuidados" />
      <div className="space-y-3">
        {ordens.map((o) => (
          <PCard key={o.id}><PCardBody className="flex items-center justify-between gap-3 p-4">
            <div><p className="font-semibold text-sm">{o.equipamento?.nome ?? "Equipamento"}</p><p className="text-xs text-slate-500">{o.equipamento?.codigo} • {formatarData(o.created_at)}</p>{o.observacoes && <p className="mt-1 text-xs text-slate-500">{o.observacoes}</p>}</div>
            <div className="flex items-center gap-2">
              <StatusBadge label={o.status === "concluida" ? "Concluída" : "Pendente"} tom={o.status === "concluida" ? "success" : "warning"} />
              {o.status !== "concluida" && <PButton size="sm" onClick={() => void concluir(o.id)}>Concluir</PButton>}
            </div>
          </PCardBody></PCard>
        ))}
        {ordens.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nenhuma ordem de limpeza.</p>}
      </div>
    </div>
  );
}
