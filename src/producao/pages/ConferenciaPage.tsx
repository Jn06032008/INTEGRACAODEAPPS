import { useEffect, useState } from "react";
import { ClipboardCheck, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PButton, PPageHeader } from "@/producao/components/ui";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { CONDICOES_DEVOLUCAO, formatarData } from "@/producao/lib/constants";
import { toast } from "@/producao/lib/toast";

type Ret = { id: string; checkout_id: string | null; equipment_id: string; devolvido_por_nome: string | null; condicao: string | null; status: string; observacoes: string | null; devolvido_em: string };
type Equip = { id: string; nome: string; codigo: string };

export function ConferenciaPage({ onNavigate }: { onNavigate: (k: string) => void }) {
  const [devolucoes, setDevolucoes] = useState<(Ret & { equipamento?: Equip })[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    const { data } = await supabase.from("returns").select("*").order("devolvido_em", { ascending: false });
    const ids = [...new Set((data ?? []).map((x) => x.equipment_id))];
    const { data: eqs } = ids.length > 0 ? await supabase.from("equipment").select("id, nome, codigo").in("id", ids) : { data: [] };
    const mapa = new Map((eqs ?? []).map((e) => [e.id, e]));
    setDevolucoes((data ?? []).map((x) => ({ ...x as Ret, equipamento: mapa.get(x.equipment_id) })));
    setCarregando(false);
  }

  useEffect(() => { void carregar(); }, []);

  async function liberar(id: string, equipId: string) {
    await supabase.from("returns").update({ status: "concluida" }).eq("id", id);
    await supabase.from("equipment").update({ status: "disponivel" }).eq("id", equipId);
    toast("Equipamento liberado!", "success");
    void carregar();
  }
  async function enviarLimpeza(id: string, equipId: string) {
    await supabase.from("returns").update({ status: "concluida" }).eq("id", id);
    await supabase.from("cleaning_orders").insert({ equipment_id: equipId, status: "pendente" });
    await supabase.from("equipment").update({ status: "precisa_limpeza" }).eq("id", equipId);
    toast("Enviado para limpeza!", "success");
    void carregar();
  }
  async function enviarManutencao(id: string, equipId: string) {
    await supabase.from("returns").update({ status: "concluida" }).eq("id", id);
    await supabase.from("maintenance_orders").insert({ equipment_id: equipId, numero: `MAN-${Date.now().toString().slice(-6)}`, status: "aguardando_avaliacao", prioridade: "alta", descricao_problema: "Avaria identificada na devolução" });
    await supabase.from("equipment").update({ status: "danificado" }).eq("id", equipId);
    toast("Enviado para manutenção!", "success");
    void carregar();
  }

  if (carregando) return <p className="py-10 text-center text-sm text-slate-500">Carregando...</p>;

  const aguardando = devolucoes.filter((d) => d.status === "aguardando_conferencia");

  return (
    <div>
      <PPageHeader title="Conferir devoluções" description="Verifique as condições e decida o destino" />
      <div className="space-y-3">
        {aguardando.map((d) => (
          <PCard key={d.id}><PCardBody className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold text-sm">{d.equipamento?.nome ?? "Equipamento"}</p><p className="text-xs text-slate-500">{d.equipamento?.codigo} • {d.devolvido_por_nome ?? "—"} • {formatarData(d.devolvido_em)}</p>{d.observacoes && <p className="mt-1 text-xs text-slate-500">{d.observacoes}</p>}</div>
              <StatusBadge label={CONDICOES_DEVOLUCAO[d.condicao ?? "perfeito"]?.label ?? d.condicao ?? "—"} tom={d.condicao === "perfeito" ? "success" : "warning"} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <PButton size="sm" variant="secondary" onClick={() => void liberar(d.id, d.equipment_id)}>Liberar</PButton>
              <PButton size="sm" variant="secondary" onClick={() => void enviarLimpeza(d.id, d.equipment_id)}>Enviar p/ limpeza</PButton>
              <PButton size="sm" variant="danger" onClick={() => void enviarManutencao(d.id, d.equipment_id)}>Enviar p/ manutenção</PButton>
            </div>
          </PCardBody></PCard>
        ))}
        {aguardando.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nenhuma devolução aguardando conferência.</p>}
      </div>
    </div>
  );
}
