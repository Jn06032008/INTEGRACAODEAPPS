import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { AlertTriangle, ArrowRight, ArrowUpFromLine, ArrowDownToLine, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  STATUS_EQUIPAMENTO,
  formatarData,
  formatarMoeda,
  statusLabel,
  statusTom,
} from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Dashboard — MMV Produção" },
      {
        name: "description",
        content: "Situação em tempo real dos equipamentos audiovisuais do Ministério Mudança de Vida.",
      },
      { property: "og:title", content: "Dashboard — MMV Produção" },
      { property: "og:description", content: "Situação em tempo real dos equipamentos." },
    ],
  }),
  component: Painel,
});

const CARDS: { status: string }[] = [
  { status: "disponivel" },
  { status: "em_uso" },
  { status: "retirado" },
  { status: "aguardando_liberacao" },
  { status: "aguardando_conferencia" },
  { status: "precisa_limpeza" },
  { status: "precisa_revisao" },
  { status: "danificado" },
  { status: "quebrado" },
  { status: "manutencao_interna" },
  { status: "aguardando_envio_assistencia" },
  { status: "enviado_assistencia" },
  { status: "aguardando_retorno_assistencia" },
  { status: "inativo" },
  { status: "extraviado" },
];

function Painel() {
  const { data, isLoading } = useQuery({
    queryKey: ["painel"],
    queryFn: async () => {
      const [equipamentos, categorias, retiradas, devolucoes, movimentos, manutencoes, assistencias] =
        await Promise.all([
          supabase.from("equipment").select("id, nome, codigo, status, category_id, ativo"),
          supabase.from("equipment_categories").select("id, nome"),
          supabase
            .from("checkouts")
            .select("id, numero, equipment_id, responsavel_nome, previsao_devolucao, status, destino")
            .eq("status", "aberta"),
          supabase.from("returns").select("id, equipment_id, devolvido_por_nome, condicao, status, devolvido_em"),
          supabase
            .from("movements")
            .select("id, tipo, responsavel_nome, destino, status, created_at, equipment_id")
            .order("created_at", { ascending: false })
            .limit(200),
          supabase.from("maintenance_orders").select("id, status, custo_total, created_at, equipment_id, numero, prioridade"),
          supabase.from("technical_assistance").select("id, status, previsao_retorno, equipment_id, empresa"),
        ]);
      return {
        equipamentos: equipamentos.data ?? [],
        categorias: categorias.data ?? [],
        retiradas: retiradas.data ?? [],
        devolucoes: devolucoes.data ?? [],
        movimentos: movimentos.data ?? [],
        manutencoes: manutencoes.data ?? [],
        assistencias: assistencias.data ?? [],
      };
    },
  });

  const equipamentos = data?.equipamentos ?? [];
  const nomePorId = new Map(equipamentos.map((e) => [e.id, `${e.nome} (${e.codigo})`]));
  const contagem = (status: string) => equipamentos.filter((e) => e.status === status).length;

  const agora = Date.now();
  const atrasadas = (data?.retiradas ?? []).filter(
    (r) => r.previsao_devolucao && new Date(r.previsao_devolucao).getTime() < agora,
  );
  const semPrevisao = (data?.retiradas ?? []).filter((r) => !r.previsao_devolucao);
  const devolvidasComAvaria = (data?.devolucoes ?? []).filter(
    (d) => d.status === "aguardando_conferencia" && d.condicao !== "perfeito",
  );
  const assistenciaVencida = (data?.assistencias ?? []).filter(
    (a) =>
      a.previsao_retorno &&
      new Date(a.previsao_retorno).getTime() < agora &&
      !["retornou", "liberado", "sem_conserto"].includes(a.status),
  );
  const devolvidosHoje = (data?.devolucoes ?? []).filter(
    (d) => new Date(d.devolvido_em).toDateString() === new Date().toDateString(),
  );

  const porCategoria = (data?.categorias ?? [])
    .map((c) => ({
      nome: c.nome,
      total: equipamentos.filter((e) => e.category_id === c.id).length,
    }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const ultimos30 = Array.from({ length: 30 }, (_, i) => {
    const dia = new Date();
    dia.setDate(dia.getDate() - (29 - i));
    const chave = dia.toDateString();
    return {
      dia: dia.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      total: (data?.movimentos ?? []).filter(
        (m) => new Date(m.created_at).toDateString() === chave,
      ).length,
    };
  });

  const CORES_SITUACAO: Record<string, string> = {
    success: "var(--success)",
    info: "var(--info)",
    warning: "var(--warning)",
    danger: "var(--danger)",
    primary: "var(--primary)",
    neutral: "var(--muted-foreground)",
  };

  const porSituacao = Object.keys(STATUS_EQUIPAMENTO)
    .map((s) => ({
      nome: STATUS_EQUIPAMENTO[s]!.label,
      total: contagem(s),
      cor: CORES_SITUACAO[STATUS_EQUIPAMENTO[s]!.tom] ?? "var(--primary)",
    }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);

  const gastosPorMes = Array.from({ length: 6 }, (_, i) => {
    const mes = new Date();
    mes.setDate(1);
    mes.setMonth(mes.getMonth() - (5 - i));
    const chave = `${mes.getFullYear()}-${mes.getMonth()}`;
    const total = (data?.manutencoes ?? [])
      .filter((m) => {
        const d = new Date(m.created_at);
        return `${d.getFullYear()}-${d.getMonth()}` === chave;
      })
      .reduce((soma, m) => soma + Number(m.custo_total ?? 0), 0);
    return {
      mes: mes.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }),
      total: Number(total.toFixed(2)),
    };
  });

  return (
    <AppShell titulo="Início" descricao="O que você precisa agora?">
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { to: "/retirar", label: "Pegar", icon: ArrowUpFromLine, cls: "bg-primary text-primary-foreground" },
          { to: "/devolver", label: "Devolver", icon: ArrowDownToLine, cls: "bg-success text-success-foreground" },
          { to: "/escanear", label: "Ler QR", icon: QrCode, cls: "bg-info text-info-foreground" },
        ].map((b) => (
          <Link
            key={b.to}
            to={b.to}
            className={`flex flex-col items-center justify-center gap-2 rounded-3xl py-6 text-base font-extrabold shadow-md active:scale-95 ${b.cls}`}
          >
            <b.icon className="h-9 w-9" />
            {b.label}
          </Link>
        ))}
      </div>
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando informações...</p>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Card className="border-primary/20 bg-primary text-primary-foreground">
              <CardContent className="p-4">
                <p className="text-xs font-medium opacity-80">Total de equipamentos</p>
                <p className="mt-1 text-3xl font-extrabold">{equipamentos.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Devolvidos hoje</p>
                <p className="mt-1 text-3xl font-extrabold text-success">{devolvidosHoje.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs font-medium text-muted-foreground">Devolução atrasada</p>
                <p className="mt-1 text-3xl font-extrabold text-danger">{atrasadas.length}</p>
              </CardContent>
            </Card>
            {CARDS.map((c) => (
              <Card key={c.status}>
                <CardContent className="p-4">
                  <p className="text-xs font-medium text-muted-foreground">
                    {STATUS_EQUIPAMENTO[c.status]?.label}
                  </p>
                  <p className="mt-1 text-3xl font-extrabold">{contagem(c.status)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-warning/40">
            <CardHeader className="flex-row items-center gap-2 pb-2">
              <AlertTriangle className="h-5 w-5 text-warning-foreground" />
              <CardTitle className="text-base">Atenção necessária</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Linha
                titulo="Devoluções atrasadas"
                valor={atrasadas.length}
                link="/pendencias"
                tom="danger"
              />
              <Linha
                titulo="Equipamentos sem previsão de retorno"
                valor={semPrevisao.length}
                link="/pendencias"
                tom="warning"
              />
              <Linha
                titulo="Devolvidos com avaria"
                valor={devolvidasComAvaria.length}
                link="/conferencia"
                tom="danger"
              />
              <Linha
                titulo="Aguardando conferência"
                valor={(data?.devolucoes ?? []).filter((d) => d.status === "aguardando_conferencia").length}
                link="/conferencia"
                tom="warning"
              />
              <Linha
                titulo="Parados na assistência (prazo vencido)"
                valor={assistenciaVencida.length}
                link="/assistencia"
                tom="danger"
              />
              <Linha
                titulo="Manutenções em aberto"
                valor={(data?.manutencoes ?? []).filter((m) => m.status !== "concluida").length}
                link="/manutencao"
                tom="warning"
              />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Movimentações nos últimos 30 dias</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ultimos30}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="dia" hide />
                    <YAxis allowDecimals={false} width={24} />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Equipamentos por categoria</CardTitle>
              </CardHeader>
              <CardContent className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porCategoria}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="nome" tick={{ fontSize: 10 }} interval={0} angle={-20} height={48} />
                    <YAxis allowDecimals={false} width={24} />
                    <Tooltip />
                    <Bar dataKey="total" fill="var(--info)" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Equipamentos por situação</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={porSituacao} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="nome" width={140} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="total" radius={6}>
                      {porSituacao.map((s) => (
                        <Cell key={s.nome} fill={s.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Gastos com manutenção (6 meses)</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={gastosPorMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis width={56} tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(v: number | string) => formatarMoeda(Number(v))} />
                    <Bar dataKey="total" fill="var(--warning)" radius={6} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Movimentações recentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.movimentos ?? []).slice(0, 10).map((m) => (
                <div
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {nomePorId.get(m.equipment_id ?? "") ?? "Equipamento"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {m.tipo} • {m.responsavel_nome ?? "—"} • {formatarData(m.created_at)}
                      {m.destino ? ` • ${m.destino}` : ""}
                    </p>
                  </div>
                  <StatusBadge label={statusLabel(m.status)} tom={statusTom(m.status)} />
                </div>
              ))}
              {(data?.movimentos ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma movimentação registrada.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}

function Linha({
  titulo,
  valor,
  link,
  tom,
}: {
  titulo: string;
  valor: number;
  link: string;
  tom: "danger" | "warning";
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2">
      <span>{titulo}</span>
      <div className="flex items-center gap-2">
        <StatusBadge label={String(valor)} tom={valor > 0 ? tom : "neutral"} />
        <Button asChild variant="ghost" size="sm">
          <Link to={link}>
            Ver <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
