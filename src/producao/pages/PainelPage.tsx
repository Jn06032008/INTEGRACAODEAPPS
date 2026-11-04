import { useEffect, useState } from "react";
import { ArrowUpFromLine, ArrowDownToLine, QrCode, AlertTriangle, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PPageHeader } from "@/producao/components/ui";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { STATUS_EQUIPAMENTO, formatarData, formatarMoeda, statusLabel, statusTom } from "@/producao/lib/constants";

type Dados = {
  equipamentos: { id: string; nome: string; codigo: string; status: string; category_id: string | null }[];
  categorias: { id: string; nome: string }[];
  retiradas: { id: string; numero: string; equipment_id: string; responsavel_nome: string | null; previsao_devolucao: string | null; status: string; destino: string | null }[];
  devolucoes: { id: string; equipment_id: string; devolvido_por_nome: string | null; condicao: string | null; status: string; devolvido_em: string }[];
  movimentos: { id: string; tipo: string; responsavel_nome: string | null; destino: string | null; status: string | null; created_at: string; equipment_id: string | null }[];
  manutencoes: { id: string; status: string; custo_total: number | null; created_at: string }[];
  assistencias: { id: string; status: string; previsao_retorno: string | null; equipment_id: string; empresa: string | null }[];
};

export function PainelPage({ onNavigate }: { onNavigate: (key: string) => void }) {
  const [dados, setDados] = useState<Dados | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      const [eq, cat, ret, dev, mov, man, ast] = await Promise.all([
        supabase.from("equipment").select("id, nome, codigo, status, category_id"),
        supabase.from("equipment_categories").select("id, nome"),
        supabase.from("checkouts").select("id, numero, equipment_id, responsavel_nome, previsao_devolucao, status, destino").eq("status", "aberta"),
        supabase.from("returns").select("id, equipment_id, devolvido_por_nome, condicao, status, devolvido_em"),
        supabase.from("movements").select("id, tipo, responsavel_nome, destino, status, created_at, equipment_id").order("created_at", { ascending: false }).limit(200),
        supabase.from("maintenance_orders").select("id, status, custo_total, created_at"),
        supabase.from("technical_assistance").select("id, status, previsao_retorno, equipment_id, empresa"),
      ]);
      if (!c) { setDados({ equipamentos: eq.data ?? [], categorias: cat.data ?? [], retiradas: ret.data ?? [], devolucoes: dev.data ?? [], movimentos: mov.data ?? [], manutencoes: man.data ?? [], assistencias: ast.data ?? [] }); setCarregando(false); }
    })();
    return () => { c = true; };
  }, []);

  const equipamentos = dados?.equipamentos ?? [];
  const contagem = (s: string) => equipamentos.filter((e) => e.status === s).length;
  const nomePorId = new Map(equipamentos.map((e) => [e.id, `${e.nome} (${e.codigo})`]));
  const agora = Date.now();
  const atrasadas = (dados?.retiradas ?? []).filter((r) => r.previsao_devolucao && new Date(r.previsao_devolucao).getTime() < agora);
  const semPrevisao = (dados?.retiradas ?? []).filter((r) => !r.previsao_devolucao);
  const devolvidasComAvaria = (dados?.devolucoes ?? []).filter((d) => d.status === "aguardando_conferencia" && d.condicao !== "perfeito");
  const aguardandoConf = (dados?.devolucoes ?? []).filter((d) => d.status === "aguardando_conferencia");
  const assistenciaVencida = (dados?.assistencias ?? []).filter((a) => a.previsao_retorno && new Date(a.previsao_retorno).getTime() < agora && !["retornou", "liberado", "sem_conserto"].includes(a.status));
  const manutencoesAbertas = (dados?.manutencoes ?? []).filter((m) => m.status !== "concluida");
  const devolvidosHoje = (dados?.devolucoes ?? []).filter((d) => new Date(d.devolvido_em).toDateString() === new Date().toDateString());

  const porCategoria = (dados?.categorias ?? []).map((c) => ({ nome: c.nome, total: equipamentos.filter((e) => e.category_id === c.id).length })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total).slice(0, 8);
  const maxCat = Math.max(1, ...porCategoria.map((c) => c.total));

  const porSituacao = Object.keys(STATUS_EQUIPAMENTO).map((s) => ({ nome: STATUS_EQUIPAMENTO[s]!.label, total: contagem(s), tom: STATUS_EQUIPAMENTO[s]!.tom })).filter((s) => s.total > 0).sort((a, b) => b.total - a.total);
  const maxSit = Math.max(1, ...porSituacao.map((s) => s.total));

  return (
    <div>
      <PPageHeader title="Início" description="O que você precisa agora?" />
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { key: "retirar", label: "Pegar", icon: ArrowUpFromLine, cls: "bg-[#8B2635] text-white" },
          { key: "devolver", label: "Devolver", icon: ArrowDownToLine, cls: "bg-emerald-600 text-white" },
          { key: "escanear", label: "Ler QR", icon: QrCode, cls: "bg-blue-600 text-white" },
        ].map((b) => (
          <button key={b.key} onClick={() => onNavigate(b.key)} className={`flex flex-col items-center justify-center gap-2 rounded-3xl py-6 text-base font-extrabold shadow-md transition active:scale-95 ${b.cls}`}>
            <b.icon className="h-9 w-9" />{b.label}
          </button>
        ))}
      </div>

      {carregando ? (
        <p className="py-10 text-center text-sm text-slate-500">Carregando informações...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <PCard className="border-[#8B2635]/20 bg-[#8B2635] text-white"><PCardBody className="p-4"><p className="text-xs font-medium opacity-80">Total de equipamentos</p><p className="mt-1 text-3xl font-extrabold">{equipamentos.length}</p></PCardBody></PCard>
            <PCard><PCardBody className="p-4"><p className="text-xs font-medium text-slate-500">Devolvidos hoje</p><p className="mt-1 text-3xl font-extrabold text-emerald-600">{devolvidosHoje.length}</p></PCardBody></PCard>
            <PCard><PCardBody className="p-4"><p className="text-xs font-medium text-slate-500">Devolução atrasada</p><p className="mt-1 text-3xl font-extrabold text-red-600">{atrasadas.length}</p></PCardBody></PCard>
            {["disponivel","em_uso","retirado","aguardando_liberacao","aguardando_conferencia","precisa_limpeza","precisa_revisao","danificado","quebrado","manutencao_interna","enviado_assistencia","inativo","extraviado"].map((s) => (
              <PCard key={s}><PCardBody className="p-4"><p className="text-xs font-medium text-slate-500">{STATUS_EQUIPAMENTO[s]?.label}</p><p className="mt-1 text-3xl font-extrabold">{contagem(s)}</p></PCardBody></PCard>
            ))}
          </div>

          <PCard className="border-amber-300"><PCardBody className="space-y-2">
            <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /><h2 className="text-base font-semibold">Atenção necessária</h2></div>
            {[
              { titulo: "Devoluções atrasadas", valor: atrasadas.length, key: "pendencias", tom: "danger" as const },
              { titulo: "Sem previsão de retorno", valor: semPrevisao.length, key: "pendencias", tom: "warning" as const },
              { titulo: "Devolvidos com avaria", valor: devolvidasComAvaria.length, key: "conferencia", tom: "danger" as const },
              { titulo: "Aguardando conferência", valor: aguardandoConf.length, key: "conferencia", tom: "warning" as const },
              { titulo: "Assistência (prazo vencido)", valor: assistenciaVencida.length, key: "assistencia", tom: "danger" as const },
              { titulo: "Manutenções em aberto", valor: manutencoesAbertas.length, key: "manutencao", tom: "warning" as const },
            ].map((l) => (
              <div key={l.titulo} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span>{l.titulo}</span>
                <div className="flex items-center gap-2"><StatusBadge label={String(l.valor)} tom={l.valor > 0 ? l.tom : "neutral"} /><button onClick={() => onNavigate(l.key)} className="inline-flex items-center gap-1 text-xs text-[#8B2635] hover:underline">Ver <ArrowRight className="h-3 w-3" /></button></div>
              </div>
            ))}
          </PCardBody></PCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <PCard><PCardBody>
              <h2 className="mb-3 text-base font-semibold">Equipamentos por categoria</h2>
              <div className="space-y-2">
                {porCategoria.map((c) => (
                  <div key={c.nome} className="flex items-center gap-2 text-sm">
                    <span className="w-28 truncate text-slate-600">{c.nome}</span>
                    <div className="h-6 flex-1 rounded bg-slate-100"><div className="h-6 rounded bg-blue-500" style={{ width: `${(c.total / maxCat) * 100}%` }} /></div>
                    <span className="w-8 text-right font-semibold">{c.total}</span>
                  </div>
                ))}
                {porCategoria.length === 0 && <p className="text-sm text-slate-500">Sem dados.</p>}
              </div>
            </PCardBody></PCard>
            <PCard><PCardBody>
              <h2 className="mb-3 text-base font-semibold">Equipamentos por situação</h2>
              <div className="space-y-2">
                {porSituacao.map((s) => (
                  <div key={s.nome} className="flex items-center gap-2 text-sm">
                    <span className="w-32 truncate text-slate-600">{s.nome}</span>
                    <div className="h-6 flex-1 rounded bg-slate-100"><div className="h-6 rounded bg-[#8B2635]" style={{ width: `${(s.total / maxSit) * 100}%` }} /></div>
                    <span className="w-8 text-right font-semibold">{s.total}</span>
                  </div>
                ))}
                {porSituacao.length === 0 && <p className="text-sm text-slate-500">Sem dados.</p>}
              </div>
            </PCardBody></PCard>
          </div>

          <PCard><PCardBody>
            <h2 className="mb-3 text-base font-semibold">Movimentações recentes</h2>
            <div className="space-y-2">
              {(dados?.movimentos ?? []).slice(0, 10).map((m) => (
                <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{nomePorId.get(m.equipment_id ?? "") ?? "Equipamento"}</p><p className="text-xs text-slate-500">{m.tipo} • {m.responsavel_nome ?? "—"} • {formatarData(m.created_at)}{m.destino ? ` • ${m.destino}` : ""}</p></div>
                  <StatusBadge label={statusLabel(m.status)} tom={statusTom(m.status)} />
                </div>
              ))}
              {(dados?.movimentos ?? []).length === 0 && <p className="text-sm text-slate-500">Nenhuma movimentação registrada.</p>}
            </div>
          </PCardBody></PCard>
        </div>
      )}
    </div>
  );
}
