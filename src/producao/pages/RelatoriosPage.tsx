import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PPageHeader, PButton, PSelect, PLabel } from "@/producao/components/ui";
import { STATUS_EQUIPAMENTO, STATUS_MANUTENCAO, formatarMoeda, formatarData, statusLabel } from "@/producao/lib/constants";

const RELATORIOS = [
  { key: "inventario", label: "Inventário completo" },
  { key: "disponiveis", label: "Equipamentos disponíveis" },
  { key: "indisponiveis", label: "Equipamentos indisponíveis" },
  { key: "retiradas", label: "Retiradas em aberto" },
  { key: "devolucoes", label: "Devoluções recentes" },
  { key: "atrasadas", label: "Devoluções atrasadas" },
  { key: "manutencao", label: "Ordens de manutenção" },
  { key: "assistencia", label: "Assistências técnicas" },
  { key: "limpeza", label: "Ordens de limpeza" },
  { key: "reservas", label: "Reservas" },
  { key: "movimentacoes", label: "Movimentações" },
  { key: "valor_patrimonial", label: "Valor patrimonial" },
  { key: "categorias", label: "Distribuição por categoria" },
  { key: "auditoria", label: "Log de auditoria" },
  { key: "usuarios", label: "Usuários ativos" },
];

export function RelatoriosPage() {
  const [relatorio, setRelatorio] = useState("inventario");
  const [dados, setDados] = useState<Record<string, unknown>[]>([]);
  const [carregando, setCarregando] = useState(false);

  async function gerar() {
    setCarregando(true);
    let query: ReturnType<typeof supabase.from> | null = null;
    let extra: Record<string, unknown>[] = [];
    switch (relatorio) {
      case "inventario": query = supabase.from("equipment").select("*"); break;
      case "disponiveis": query = supabase.from("equipment").select("*").eq("status", "disponivel"); break;
      case "indisponiveis": query = supabase.from("equipment").select("*").neq("status", "disponivel"); break;
      case "retiradas": query = supabase.from("checkouts").select("*").eq("status", "aberta"); break;
      case "devolucoes": query = supabase.from("returns").select("*").order("devolvido_em", { ascending: false }).limit(100); break;
      case "manutencao": query = supabase.from("maintenance_orders").select("*"); break;
      case "assistencia": query = supabase.from("technical_assistance").select("*"); break;
      case "limpeza": query = supabase.from("cleaning_orders").select("*"); break;
      case "reservas": query = supabase.from("reservations").select("*"); break;
      case "movimentacoes": query = supabase.from("movements").select("*").order("created_at", { ascending: false }).limit(200); break;
      case "auditoria": query = supabase.from("producao_audit_logs").select("*").order("created_at", { ascending: false }).limit(200); break;
      case "usuarios": query = supabase.from("producao_perfis").select("*"); break;
      case "valor_patrimonial": { const { data } = await supabase.from("equipment").select("nome, codigo, valor_estimado, status"); extra = (data ?? []).map((e) => ({ nome: e.nome, codigo: e.codigo, valor: e.valor_estimado, status: statusLabel(e.status) })); break; }
      case "categorias": { const { data: eq } = await supabase.from("equipment").select("category_id"); const { data: cats } = await supabase.from("equipment_categories").select("id, nome"); const mapa = new Map((cats ?? []).map((c) => [c.id, c.nome])); const contagem: Record<string, number> = {}; (eq ?? []).forEach((e) => { const n = mapa.get(e.category_id) ?? "Sem categoria"; contagem[n] = (contagem[n] ?? 0) + 1; }); extra = Object.entries(contagem).map(([nome, total]) => ({ categoria: nome, total })); break; }
      default: query = supabase.from("equipment").select("*");
    }
    if (query) { const { data } = await query; setDados((data ?? []) as Record<string, unknown>[]); }
    else setDados(extra);
    setCarregando(false);
  }

  function exportarCSV() {
    if (dados.length === 0) return;
    const cols = Object.keys(dados[0]);
    const linhas = [cols.join(","), ...dados.map((r) => cols.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","))];
    const blob = new Blob([linhas.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${relatorio}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  const colunas = dados.length > 0 ? Object.keys(dados[0]) : [];

  return (
    <div>
      <PPageHeader title="Relatórios" description="Gere e exporte relatórios do sistema" />
      <PCard className="mb-4"><PCardBody className="flex flex-wrap items-end gap-3">
        <div><PLabel>Tipo de relatório</PLabel><PSelect value={relatorio} onChange={(e) => setRelatorio(e.target.value)}>{RELATORIOS.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}</PSelect></div>
        <PButton onClick={() => void gerar()} loading={carregando}>Gerar</PButton>
        {dados.length > 0 && <PButton variant="secondary" onClick={exportarCSV}><Download className="h-4 w-4" /> Exportar CSV</PButton>}
      </PCardBody></PCard>
      {dados.length > 0 && (
        <PCard><PCardBody className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50"><tr>{colunas.map((c) => <th key={c} className="px-3 py-2 text-left font-semibold text-slate-600">{c}</th>)}</tr></thead>
            <tbody>{dados.slice(0, 100).map((r, i) => (
              <tr key={i} className="border-b border-slate-100">{colunas.map((c) => <td key={c} className="px-3 py-2 text-slate-700">{String(r[c] ?? "—")}</td>)}</tr>
            ))}</tbody>
          </table>
        </PCardBody></PCard>
      )}
    </div>
  );
}
