import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PPageHeader } from "@/producao/components/ui";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { formatarData, statusLabel, statusTom } from "@/producao/lib/constants";

type Mov = { id: string; tipo: string; responsavel_nome: string | null; destino: string | null; status: string | null; created_at: string; equipment_id: string | null };

export function MovimentacoesPage() {
  const [movs, setMovs] = useState<(Mov & { equipamento?: { nome: string; codigo: string } })[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      const { data } = await supabase.from("movements").select("*").order("created_at", { ascending: false }).limit(200);
      const ids = [...new Set((data ?? []).map((x) => x.equipment_id).filter(Boolean))];
      const { data: eqs } = ids.length > 0 ? await supabase.from("equipment").select("id, nome, codigo").in("id", ids) : { data: [] };
      const mapa = new Map((eqs ?? []).map((e) => [e.id, e]));
      if (!c) { setMovs((data ?? []).map((x) => ({ ...x as Mov, equipamento: x.equipment_id ? mapa.get(x.equipment_id) : undefined }))); setCarregando(false); }
    })();
    return () => { c = true; };
  }, []);

  return (
    <div>
      <PPageHeader title="Histórico de movimentações" description="Últimas 200 movimentações" />
      {carregando ? <p className="py-10 text-center text-sm text-slate-500">Carregando...</p> : (
        <div className="space-y-2">
          {movs.map((m) => (
            <PCard key={m.id}><PCardBody className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0"><p className="truncate text-sm font-semibold">{m.equipamento?.nome ?? "Equipamento"}</p><p className="text-xs text-slate-500">{m.tipo} • {m.responsavel_nome ?? "—"} • {formatarData(m.created_at)}{m.destino ? ` • ${m.destino}` : ""}</p></div>
              {m.status && <StatusBadge label={statusLabel(m.status)} tom={statusTom(m.status)} />}
            </PCardBody></PCard>
          ))}
          {movs.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nenhuma movimentação registrada.</p>}
        </div>
      )}
    </div>
  );
}
