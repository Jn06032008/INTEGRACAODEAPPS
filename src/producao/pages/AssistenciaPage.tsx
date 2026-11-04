import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PButton, PInput, PLabel, PPageHeader, PSelect, PTextarea } from "@/producao/components/ui";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { STATUS_ASSISTENCIA, formatarData, formatarMoeda } from "@/producao/lib/constants";
import { toast } from "@/producao/lib/toast";

type Assist = { id: string; equipment_id: string; status: string; empresa: string | null; previsao_retorno: string | null; custo: number | null; observacoes: string | null; created_at: string };
type Equip = { id: string; nome: string; codigo: string };

const STATUS_OPCOES = Object.keys(STATUS_ASSISTENCIA);

export function AssistenciaPage() {
  const [assistencias, setAssistencias] = useState<(Assist & { equipamento?: Equip })[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equip[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [eqId, setEqId] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [previsao, setPrevisao] = useState("");

  async function carregar() {
    const [a, e] = await Promise.all([
      supabase.from("technical_assistance").select("*").order("created_at", { ascending: false }),
      supabase.from("equipment").select("id, nome, codigo").order("nome"),
    ]);
    const ids = [...new Set((a.data ?? []).map((x) => x.equipment_id))];
    const { data: eqs } = ids.length > 0 ? await supabase.from("equipment").select("id, nome, codigo").in("id", ids) : { data: [] };
    const mapa = new Map((eqs ?? []).map((e) => [e.id, e]));
    setAssistencias((a.data ?? []).map((x) => ({ ...x as Assist, equipamento: mapa.get(x.equipment_id) })));
    setEquipamentos((e.data ?? []) as Equip[]);
    setCarregando(false);
  }

  useEffect(() => { void carregar(); }, []);

  async function criar() {
    if (!eqId) return toast("Selecione um equipamento.", "warning");
    const { error } = await supabase.from("technical_assistance").insert({ equipment_id: eqId, status: "aguardando_envio", empresa, previsao_retorno: previsao || null });
    if (error) return toast("Erro: " + error.message, "error");
    await supabase.from("equipment").update({ status: "aguardando_envio_assistencia" }).eq("id", eqId);
    toast("Envio para assistência registrado!", "success");
    setEqId(""); setEmpresa(""); setPrevisao(""); setMostrarForm(false);
    void carregar();
  }

  async function mudarStatus(id: string, novoStatus: string) {
    await supabase.from("technical_assistance").update({ status: novoStatus }).eq("id", id);
    toast("Status atualizado!", "success");
    void carregar();
  }

  if (carregando) return <p className="py-10 text-center text-sm text-slate-500">Carregando...</p>;

  return (
    <div>
      <PPageHeader title="Assistência técnica" description="Equipamentos enviados para reparo externo" actions={<PButton size="sm" onClick={() => setMostrarForm(!mostrarForm)}>Nova assistência</PButton>} />
      {mostrarForm && (
        <PCard className="mb-4"><PCardBody className="space-y-3">
          <div><PLabel>Equipamento</PLabel><PSelect value={eqId} onChange={(e) => setEqId(e.target.value)}><option value="">Selecione...</option>{equipamentos.map((e) => <option key={e.id} value={e.id}>{e.nome} ({e.codigo})</option>)}</PSelect></div>
          <div><PLabel>Empresa</PLabel><PInput value={empresa} onChange={(e) => setEmpresa(e.target.value)} /></div>
          <div><PLabel>Previsão de retorno</PLabel><PInput type="date" value={previsao} onChange={(e) => setPrevisao(e.target.value)} /></div>
          <PButton onClick={() => void criar()}>Registrar envio</PButton>
        </PCardBody></PCard>
      )}
      <div className="space-y-3">
        {assistencias.map((a) => (
          <PCard key={a.id}><PCardBody className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-semibold text-sm">{a.equipamento?.nome ?? "Equipamento"}</p><p className="text-xs text-slate-500">{a.empresa ?? "—"} • {formatarData(a.created_at, false)}</p>{a.previsao_retorno && <p className="text-xs text-slate-500">Previsão: {formatarData(a.previsao_retorno, false)}</p>}</div>
              <StatusBadge label={STATUS_ASSISTENCIA[a.status]?.label ?? a.status} tom={STATUS_ASSISTENCIA[a.status]?.tom ?? "neutral"} />
            </div>
            {a.custo != null && <p className="mt-2 text-xs text-slate-500">Custo: {formatarMoeda(a.custo)}</p>}
            <div className="mt-2"><PSelect value={a.status} onChange={(e) => void mudarStatus(a.id, e.target.value)} className="text-xs">{STATUS_OPCOES.map((s) => <option key={s} value={s}>{STATUS_ASSISTENCIA[s]?.label}</option>)}</PSelect></div>
          </PCardBody></PCard>
        ))}
        {assistencias.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nenhuma assistência registrada.</p>}
      </div>
    </div>
  );
}
