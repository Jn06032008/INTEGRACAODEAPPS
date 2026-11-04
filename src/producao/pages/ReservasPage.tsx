import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PInput, PLabel, PButton, PPageHeader, PSelect, PTextarea } from "@/producao/components/ui";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { STATUS_RESERVA, formatarData } from "@/producao/lib/constants";
import { useProducaoAuth } from "@/producao/lib/auth";
import { toast } from "@/producao/lib/toast";

type Reserva = { id: string; equipment_id: string; reservado_por_nome: string | null; data_inicio: string; data_fim: string; status: string; observacoes: string | null };
type Equip = { id: string; nome: string; codigo: string };

export function ReservasPage() {
  const { user, perfil } = useProducaoAuth();
  const [reservas, setReservas] = useState<(Reserva & { equipamento?: Equip })[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equip[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [eqId, setEqId] = useState("");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [obs, setObs] = useState("");

  async function carregar() {
    const [r, e] = await Promise.all([
      supabase.from("reservations").select("*").order("data_inicio", { ascending: false }),
      supabase.from("equipment").select("id, nome, codigo").order("nome"),
    ]);
    const ids = [...new Set((r.data ?? []).map((x) => x.equipment_id))];
    const { data: eqs } = ids.length > 0 ? await supabase.from("equipment").select("id, nome, codigo").in("id", ids) : { data: [] };
    const mapa = new Map((eqs ?? []).map((e) => [e.id, e]));
    setReservas((r.data ?? []).map((x) => ({ ...x as Reserva, equipamento: mapa.get(x.equipment_id) })));
    setEquipamentos((e.data ?? []) as Equip[]);
    setCarregando(false);
  }

  useEffect(() => { void carregar(); }, []);

  async function reservar() {
    if (!eqId || !inicio || !fim || !user) return toast("Preencha todos os campos.", "warning");
    if (new Date(fim) < new Date(inicio)) return toast("Data final deve ser após a inicial.", "warning");
    const { data: conflitos } = await supabase.from("reservations").select("id").eq("equipment_id", eqId).neq("status", "cancelada").or(`and(data_inicio.lte.${fim},data_fim.gte.${inicio})`);
    if (conflitos && conflitos.length > 0) return toast("Já existe reserva para esse período.", "warning");
    const { error } = await supabase.from("reservations").insert({ equipment_id: eqId, reservado_por_id: user.id, reservado_por_nome: perfil?.nome ?? user.email, data_inicio: inicio, data_fim: fim, status: "confirmada", observacoes: obs });
    if (error) return toast("Erro: " + error.message, "error");
    toast("Reserva criada!", "success");
    setEqId(""); setInicio(""); setFim(""); setObs("");
    void carregar();
  }

  if (carregando) return <p className="py-10 text-center text-sm text-slate-500">Carregando...</p>;

  return (
    <div>
      <PPageHeader title="Reservas" description="Agende equipamentos para eventos futuros" />
      <PCard className="mb-4"><PCardBody className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div><PLabel>Equipamento</PLabel><PSelect value={eqId} onChange={(e) => setEqId(e.target.value)}><option value="">Selecione...</option>{equipamentos.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}</PSelect></div>
          <div><PLabel>Observações</PLabel><PInput value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          <div><PLabel>Início</PLabel><PInput type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} /></div>
          <div><PLabel>Fim</PLabel><PInput type="datetime-local" value={fim} onChange={(e) => setFim(e.target.value)} /></div>
        </div>
        <PButton onClick={() => void reservar()}>Reservar</PButton>
      </PCardBody></PCard>
      <div className="space-y-2">
        {reservas.map((r) => (
          <PCard key={r.id}><PCardBody className="flex items-center justify-between gap-3 p-3">
            <div><p className="font-semibold text-sm">{r.equipamento?.nome ?? "Equipamento"}</p><p className="text-xs text-slate-500">{formatarData(r.data_inicio, false)} → {formatarData(r.data_fim, false)} • {r.reservado_por_nome ?? "—"}</p></div>
            <StatusBadge label={STATUS_RESERVA[r.status]?.label ?? r.status} tom={STATUS_RESERVA[r.status]?.tom ?? "neutral"} />
          </PCardBody></PCard>
        ))}
        {reservas.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nenhuma reserva registrada.</p>}
      </div>
    </div>
  );
}
