import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarData, formatarMoeda, statusLabel } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — MMV Produção" },
      { name: "description", content: "Relatórios de inventário, retiradas, atrasos, manutenções, gastos e revisões." },
      { property: "og:title", content: "Relatórios — MMV Produção" },
      { property: "og:description", content: "Relatórios do controle de equipamentos audiovisuais." },
    ],
  }),
  component: Relatorios,
});

const RELATORIOS = [
  { id: "inventario", label: "Inventário completo" },
  { id: "disponiveis", label: "Equipamentos disponíveis" },
  { id: "retirados", label: "Equipamentos retirados" },
  { id: "atrasadas", label: "Devoluções atrasadas" },
  { id: "danificados", label: "Equipamentos danificados" },
  { id: "quebrados", label: "Equipamentos quebrados" },
  { id: "manutencao", label: "Em manutenção" },
  { id: "assistencia", label: "Na assistência técnica" },
  { id: "historico_equipamento", label: "Histórico por equipamento" },
  { id: "historico_usuario", label: "Histórico por responsável" },
  { id: "gastos", label: "Gastos com manutenção e assistência" },
  { id: "ocorrencias", label: "Equipamentos com mais ocorrências" },
  { id: "sem_movimentacao", label: "Sem movimentação no período" },
  { id: "revisoes", label: "Próximas revisões" },
  { id: "baixados", label: "Baixados e extraviados" },
] as const;

type Linha = Record<string, string>;

function Relatorios() {
  const [relatorio, setRelatorio] = useState<string>("inventario");
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");

  const { data } = useQuery({
    queryKey: ["relatorios-base"],
    queryFn: async () => {
      const [equipamentos, categorias, checkouts, movimentos, manutencoes, assistencias] = await Promise.all([
        supabase.from("equipment").select("*").order("nome"),
        supabase.from("equipment_categories").select("id, nome"),
        supabase.from("checkouts").select("*"),
        supabase.from("movements").select("*"),
        supabase.from("maintenance_orders").select("*"),
        supabase.from("technical_assistance").select("*"),
      ]);
      return {
        equipamentos: equipamentos.data ?? [],
        categorias: categorias.data ?? [],
        checkouts: checkouts.data ?? [],
        movimentos: movimentos.data ?? [],
        manutencoes: manutencoes.data ?? [],
        assistencias: assistencias.data ?? [],
      };
    },
  });

  const categorias = new Map((data?.categorias ?? []).map((c) => [c.id, c.nome]));
  const equipamentos = new Map((data?.equipamentos ?? []).map((e) => [e.id, e]));

  function noPeriodo(valor?: string | null) {
    if (!valor) return !inicio && !fim;
    const t = new Date(valor).getTime();
    if (inicio && t < new Date(inicio).getTime()) return false;
    if (fim && t > new Date(fim).getTime() + 86400000) return false;
    return true;
  }

  function montar(): { colunas: string[]; linhas: Linha[] } {
    const eq = data?.equipamentos ?? [];
    const base = (lista: typeof eq): Linha[] =>
      lista.map((e) => ({
        Código: e.codigo,
        Nome: e.nome,
        Categoria: categorias.get(e.category_id ?? "") ?? "—",
        Patrimônio: e.patrimonio ?? "—",
        Situação: statusLabel(e.status),
        Responsável: e.responsavel_atual_nome ?? "—",
        Valor: formatarMoeda(e.valor_estimado),
      }));

    switch (relatorio) {
      case "disponiveis":
        return { colunas: ["Código", "Nome", "Categoria", "Patrimônio", "Situação", "Responsável", "Valor"], linhas: base(eq.filter((e) => e.status === "disponivel")) };
      case "retirados":
        return { colunas: ["Código", "Nome", "Categoria", "Patrimônio", "Situação", "Responsável", "Valor"], linhas: base(eq.filter((e) => ["retirado", "em_uso"].includes(e.status))) };
      case "danificados":
        return { colunas: ["Código", "Nome", "Categoria", "Patrimônio", "Situação", "Responsável", "Valor"], linhas: base(eq.filter((e) => e.status === "danificado")) };
      case "quebrados":
        return { colunas: ["Código", "Nome", "Categoria", "Patrimônio", "Situação", "Responsável", "Valor"], linhas: base(eq.filter((e) => e.status === "quebrado")) };
      case "manutencao":
        return { colunas: ["Código", "Nome", "Categoria", "Patrimônio", "Situação", "Responsável", "Valor"], linhas: base(eq.filter((e) => e.status === "manutencao_interna")) };
      case "assistencia":
        return {
          colunas: ["Equipamento", "Empresa", "Protocolo", "Enviado", "Previsão", "Situação", "Orçamento"],
          linhas: (data?.assistencias ?? []).map((a) => ({
            Equipamento: equipamentos.get(a.equipment_id)?.nome ?? "—",
            Empresa: a.empresa,
            Protocolo: a.protocolo ?? "—",
            Enviado: formatarData(a.enviado_em, false),
            Previsão: formatarData(a.previsao_retorno, false),
            Situação: a.status,
            Orçamento: formatarMoeda(a.orcamento),
          })),
        };
      case "atrasadas":
        return {
          colunas: ["Equipamento", "Retirada", "Responsável", "Saída", "Previsão"],
          linhas: (data?.checkouts ?? [])
            .filter((c) => c.status === "aberta" && c.previsao_devolucao && new Date(c.previsao_devolucao).getTime() < Date.now())
            .map((c) => ({
              Equipamento: equipamentos.get(c.equipment_id)?.nome ?? "—",
              Retirada: c.numero,
              Responsável: c.responsavel_nome,
              Saída: formatarData(c.retirada_em),
              Previsão: formatarData(c.previsao_devolucao),
            })),
        };
      case "historico_equipamento":
        return {
          colunas: ["Equipamento", "Tipo", "Data", "Responsável", "Situação", "Detalhes"],
          linhas: (data?.movimentos ?? [])
            .filter((m) => noPeriodo(m.created_at))
            .map((m) => ({
              Equipamento: m.equipment_id ? equipamentos.get(m.equipment_id)?.nome ?? "—" : "—",
              Tipo: m.tipo,
              Data: formatarData(m.created_at),
              Responsável: m.responsavel_nome ?? "—",
              Situação: statusLabel(m.status),
              Detalhes: m.detalhes ?? "—",
            })),
        };
      case "historico_usuario":
        return {
          colunas: ["Responsável", "Equipamento", "Retirada", "Saída", "Previsão", "Situação"],
          linhas: (data?.checkouts ?? [])
            .filter((c) => noPeriodo(c.retirada_em))
            .map((c) => ({
              Responsável: c.responsavel_nome,
              Equipamento: equipamentos.get(c.equipment_id)?.nome ?? "—",
              Retirada: c.numero,
              Saída: formatarData(c.retirada_em),
              Previsão: formatarData(c.previsao_devolucao),
              Situação: c.status,
            })),
        };
      case "gastos": {
        const linhas: Linha[] = [
          ...(data?.manutencoes ?? [])
            .filter((m) => noPeriodo(m.created_at))
            .map((m) => ({
              Tipo: "Manutenção interna",
              Equipamento: equipamentos.get(m.equipment_id)?.nome ?? "—",
              Referência: m.numero,
              Data: formatarData(m.created_at, false),
              Valor: formatarMoeda(m.custo_total),
            })),
          ...(data?.assistencias ?? [])
            .filter((a) => noPeriodo(a.created_at))
            .map((a) => ({
              Tipo: "Assistência técnica",
              Equipamento: equipamentos.get(a.equipment_id)?.nome ?? "—",
              Referência: a.empresa,
              Data: formatarData(a.enviado_em, false),
              Valor: formatarMoeda(a.valor_aprovado ?? a.orcamento),
            })),
        ];
        return { colunas: ["Tipo", "Equipamento", "Referência", "Data", "Valor"], linhas };
      }
      case "ocorrencias": {
        const contagem = new Map<string, number>();
        (data?.manutencoes ?? []).forEach((m) =>
          contagem.set(m.equipment_id, (contagem.get(m.equipment_id) ?? 0) + 1),
        );
        return {
          colunas: ["Equipamento", "Código", "Ocorrências"],
          linhas: [...contagem.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([id, total]) => ({
              Equipamento: equipamentos.get(id)?.nome ?? "—",
              Código: equipamentos.get(id)?.codigo ?? "—",
              Ocorrências: String(total),
            })),
        };
      }
      case "sem_movimentacao": {
        const comMovimento = new Set(
          (data?.movimentos ?? []).filter((m) => noPeriodo(m.created_at)).map((m) => m.equipment_id),
        );
        return {
          colunas: ["Código", "Nome", "Categoria", "Patrimônio", "Situação", "Responsável", "Valor"],
          linhas: base(eq.filter((e) => !comMovimento.has(e.id))),
        };
      }
      case "revisoes":
        return {
          colunas: ["Código", "Nome", "Última revisão", "Próxima revisão", "Situação"],
          linhas: eq
            .filter((e) => e.proxima_revisao)
            .sort((a, b) => String(a.proxima_revisao).localeCompare(String(b.proxima_revisao)))
            .map((e) => ({
              Código: e.codigo,
              Nome: e.nome,
              "Última revisão": formatarData(e.ultima_revisao, false),
              "Próxima revisão": formatarData(e.proxima_revisao, false),
              Situação: statusLabel(e.status),
            })),
        };
      case "baixados":
        return {
          colunas: ["Código", "Nome", "Categoria", "Patrimônio", "Situação", "Responsável", "Valor"],
          linhas: base(eq.filter((e) => ["baixado", "extraviado", "inativo"].includes(e.status))),
        };
      default:
        return { colunas: ["Código", "Nome", "Categoria", "Patrimônio", "Situação", "Responsável", "Valor"], linhas: base(eq) };
    }
  }

  const { colunas, linhas } = montar();
  const nomeRelatorio = RELATORIOS.find((r) => r.id === relatorio)?.label ?? "Relatório";

  function baixar(extensao: "csv" | "xls") {
    const cabecalho = colunas.join(";");
    const corpo = linhas.map((l) => colunas.map((c) => `"${(l[c] ?? "").replaceAll('"', "'")}"`).join(";")).join("\n");
    const conteudo = `\uFEFF${cabecalho}\n${corpo}`;
    const blob = new Blob([conteudo], { type: extensao === "csv" ? "text/csv;charset=utf-8" : "application/vnd.ms-excel" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${nomeRelatorio.toLowerCase().replaceAll(" ", "-")}.${extensao}`;
    link.click();
  }

  return (
    <AppShell titulo="Relatórios" descricao="Filtre, visualize e exporte os dados do parque de equipamentos">
      <div className="space-y-4">
        <Card className="print:hidden">
          <CardContent className="space-y-3 p-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Início do período</Label>
                <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Fim do período</Label>
                <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {RELATORIOS.map((r) => (
                <Button
                  key={r.id}
                  size="sm"
                  variant={relatorio === r.id ? "default" : "outline"}
                  onClick={() => setRelatorio(r.id)}
                >
                  {r.label}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => baixar("csv")}>
                <Download className="h-4 w-4" /> CSV
              </Button>
              <Button size="sm" variant="secondary" onClick={() => baixar("xls")}>
                <Download className="h-4 w-4" /> Excel
              </Button>
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> PDF / imprimir
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="mb-3 text-base font-bold">
              {nomeRelatorio} <span className="text-sm font-normal text-muted-foreground">({linhas.length} registro(s))</span>
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {colunas.map((c) => (
                      <th key={c} className="px-2 py-2 font-semibold">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l, i) => (
                    <tr key={i} className="border-b border-border/60">
                      {colunas.map((c) => (
                        <td key={c} className="px-2 py-2">
                          {l[c] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {linhas.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum registro para este relatório.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
