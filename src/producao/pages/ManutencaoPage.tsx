import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PButton, PInput, PLabel, PPageHeader, PSelect, PTextarea } from "@/producao/components/ui";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { STATUS_MANUTENCAO, PRIORIDADES, formatarData, formatarMoeda } from "@/producao/lib/constants";
import { toast } from "@/producao/lib/toast";

type Ordem = { id: string; numero: string | null; equipment_id: string; status: string; prioridade: string | null; descricao_problema: string | null; custo_total: number | null; created_at: string };
type Equip = { id: string; nome: string; codigo: string };

const STATUS_OPCOES = Object.keys(STATUS_MANUTENCAO);

export function ManutencaoPage() {
  const [ordens, setOrdens] = useState<(Ordem & { equipamento?: Equip })[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equip[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [eqId, setEqId] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("normal");

  async function carregar() {
    const [o, e] = await Promise.all([
      supabase.from("maintenance_orders").select("*").order("created_at", { ascending: false }),
      supabase.from("equipment").select("id, nome, codigo").order("nome"),
    ]);
    const ids = [...new Set((o.data ?? []).map((x) => x.equipment_id))];
    const { data: eqs } = ids.length > 0 ? await supabase.from("equipment").select("id, nome, codigo").in("id", ids) : { data: [] };
    const mapa = new Map((eqs ?? []).map((e) => [e.id, e]));
    setOrdens((o.data ?? []).map((x) => ({ ...x as Ordem, equipamento: mapa.get(x.equipment_id) })));
    setEquipamentos((e.data ?? []) as Equip[]);
    setCarregando(false);
  }

  useEffect(() => { void carregar(); }, []);

  async function criar() {
    if (!eqId) return toast("Selecione um equipamento.", "warning");
    const numero = `MAN-${Date.now().toString().slice(-6)}`;
    const { error } = await supabase.from("maintenance_orders").insert({ numero, equipment_id: eqId, status: "aguardando_avaliacao", prioridade, descricao_problema: descricao });
    if (error) return toast("Erro: " + error.message, "error");
    toast("Ordem de manutenção criada!", "success");
    setEqId(""); setDescricao(""); setMostrarForm(false);
    void carregar();
  }

  async function mudarStatus(id: string, novoStatus: string) {
    await supabase.from("maintenance_orders").update({ status: novoStatus, ...(novoStatus === "concluida" ? { concluida_em: new Date().toISOString() } : {}) }).eq("id", id);
    toast("Status atualizado!", "success");
    void carregar();
  }

  if (carregando) return <p className="py-10 text-center text-sm text-slate-500">Carregando...</p>;

  return (
    <div>
      <PPageHeader title="Manutenção" description="Ordens de manutenção interna" actions={<PButton size="sm" onClick={() => setMostrarForm(!mostrarForm)}>Nova ordem</PButton>} />
      {mostrarForm && (
        <PCard className="mb-4"><PCardBody className="space-y-3">
          <div><PLabel>Equipamento</PLabel><PSelect value={eqId} onChange={(e) => setEqId(e.target.value)}><option value="">Selecione...</option>{equipamentos.map((e) => <option key={e.id} value={e.id}>{e.nome} ({e.codigo})</option>)}</PSelect></div>
          <div><PLabel>Prioridade</PLabel><PSelect value={prioridade} onChange={(e) => setPrioridade(e.target.value)}>{Object.entries(PRIORIDADES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</PSelect></div>
          <div><PLabel>Descrição do problema</PLabel><PTextarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} /></div>
          <PButton onClick={() => void criar()}>Criar ordem</PButton>
        </PCardBody></PCard>
      )}
      <div className="space-y-3">
        {ordens.map((o) => (
          <PCard key={o.id}><PCardBody className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold text-sm">{o.equipamento?.nome ?? "Equipamento"}</p><p className="text-xs text-slate-500">{o.numero ?? "—"} • {formatarData(o.created_at, false)}</p>{o.descricao_problema && <p className="mt-1 text-xs text-slate-600">{o.descricao_problema}</p>}</div>
              <div className="flex items-center gap-2">
                {o.prioridade && <StatusBadge label={PRIORIDADES[o.prioridade]?.label ?? o.prioridade} tom={PRIORIDADES[o.prioridade]?.tom ?? "neutral"} />}
                <StatusBadge label={STATUS_MANUTENCAO[o.status]?.label ?? o.status} tom={STATUS_MANUTENCAO[o.status]?.tom ?? "neutral"} />
              </div>
            </div>
            {o.custo_total != null && <p className="mt-2 text-xs text-slate-500">Custo: {formatarMoeda(o.custo_total)}</p>}
            <div className="mt-2"><PSelect value={o.status} onChange={(e) => void mudarStatus(o.id, e.target.value)} className="text-xs">{STATUS_OPCOES.map((s) => <option key={s} value={s}>{STATUS_MANUTENCAO[s]?.label}</option>)}</PSelect></div>
          </PCardBody></PCard>
        ))}
        {ordens.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nenhuma ordem de manutenção.</p>}
      </div>
    </div>
  );
}
