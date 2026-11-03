import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { analisarDevolucao } from "@/lib/analise-ia.functions";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PhotoUpload } from "@/components/PhotoUpload";
import { SignaturePad } from "@/components/SignaturePad";
import { StorageImage } from "@/components/StorageImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CONDICOES_DEVOLUCAO, formatarData } from "@/lib/constants";
import { nomeUsuario, useAuth } from "@/lib/auth";
import { ajustarDisponivel, criarNotificacao, registrarAuditoria, registrarMovimento } from "@/lib/registros";

export const Route = createFileRoute("/_authenticated/devolver/$id")({
  validateSearch: (s: Record<string, unknown>): { retirada?: string } =>
    typeof s['retirada'] === "string" ? { retirada: s['retirada'] } : {},
  head: () => ({
    meta: [
      { title: "Registrar devolução — MMV Produção" },
      {
        name: "description",
        content: "Registro de devolução com fotos atuais, conferência de acessórios, condição e assinatura.",
      },
      { property: "og:title", content: "Registrar devolução — MMV Produção" },
      { property: "og:description", content: "Registro de devolução de equipamento audiovisual." },
    ],
  }),
  component: Devolver,
});

type AcessorioSaida = { nome?: string; quantidade?: number; conferido?: boolean };

function Devolver() {
  const { id } = Route.useParams();
  const { retirada: retiradaEscolhida } = Route.useSearch();
  const [selecionada, setSelecionada] = useState<string | undefined>(retiradaEscolhida);
  const navigate = useNavigate();
  const { user, perfil } = useAuth();
  const [salvando, setSalvando] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [analisando, setAnalisando] = useState(false);
  const [relatorioIA, setRelatorioIA] = useState<string | null>(null);
  const analisarFn = useServerFn(analisarDevolucao);
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [condicao, setCondicao] = useState("perfeito");
  const [conferidos, setConferidos] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({
    devolvido_por_nome: "",
    recebido_por_nome: "",
    relato: "",
    acessorios_faltando: "",
    observacoes: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["devolver", id],
    queryFn: async () => {
      const [equipamento, retiradas] = await Promise.all([
        supabase.from("equipment").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("checkouts")
          .select("*")
          .eq("equipment_id", id)
          .in("status", ["aberta", "aguardando_autorizacao"])
          .order("retirada_em", { ascending: false }),
      ]);
      return { equipamento: equipamento.data, retiradas: retiradas.data ?? [] };
    },
  });

  const e = data?.equipamento;
  const retiradas = data?.retiradas ?? [];
  const retirada = retiradas.find((r) => r.id === selecionada) ?? retiradas[0];
  const acessoriosSaida = (retirada?.acessorios as AcessorioSaida[] | null) ?? [];
  const meuNome = nomeUsuario(perfil, user);

  async function analisar() {
    if (!e) return;
    setAnalisando(true);
    try {
      const r = await analisarFn({
        data: { equipamento: `${e.nome} (${e.codigo})`, descricao: form.relato, fotos: fotos.slice(0, 6) },
      });
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      setRelatorioIA(r.relatorio);
      if (r.gravidade.startsWith("grave") && condicao === "perfeito") {
        toast.warning("A IA encontrou dano grave. Revise a condição informada.");
      }
    } catch {
      toast.error("A análise automática falhou. Tente novamente.");
    } finally {
      setAnalisando(false);
    }
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!e || !retirada) return;
    if (fotos.length === 0) {
      toast.error("Anexe pelo menos uma foto atual do equipamento");
      return;
    }
    if (!assinatura) {
      toast.error("Assine a devolução antes de concluir");
      return;
    }
    setSalvando(true);
    try {
      const info = CONDICOES_DEVOLUCAO[condicao];
      const { data: devolucao, error } = await supabase
        .from("returns")
        .insert({
          checkout_id: retirada.id,
          equipment_id: id,
          devolvido_por_id: user?.id ?? null,
          devolvido_por_nome: form.devolvido_por_nome || meuNome,
          recebido_por_nome: form.recebido_por_nome || null,
          condicao,
          relato: form.relato || null,
          acessorios: acessoriosSaida.map((a, i) => ({
            nome: a.nome,
            quantidade: a.quantidade,
            conferido: Boolean(conferidos[String(i)]),
          })),
          acessorios_faltando: form.acessorios_faltando || null,
          fotos,
          relatorio_ia: relatorioIA,
          observacoes: form.observacoes || null,
          assinatura,
          status: "aguardando_conferencia",
        })
        .select()
        .single();
      if (error) throw error;

      await supabase
        .from("checkouts")
        .update({ status: "encerrada" })
        .eq("id", retirada.id);

      if (e.quantidade > 1) {
        await ajustarDisponivel(id, retirada.quantidade ?? 1);
      } else {
        await supabase
          .from("equipment")
          .update({
            status: "aguardando_conferencia",
            quantidade_disponivel: 1,
            responsavel_atual_id: null,
            responsavel_atual_nome: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      }

      if (info?.pendencia) {
        await supabase.from("maintenance_orders").insert({
          equipment_id: id,
          problema: `${info.label}${form.relato ? ` — ${form.relato}` : ""}`,
          relatado_por_id: user?.id ?? null,
          relatado_por_nome: form.devolvido_por_nome || meuNome,
          prioridade: condicao === "quebrado" ? "alta" : "normal",
          fotos,
          status: "aguardando_avaliacao",
        });
        await criarNotificacao({
          titulo: `Devolução com pendência — ${e.nome}`,
          mensagem: info.label,
          tipo: "atencao",
        });
      }

      await registrarMovimento({
        equipment_id: id,
        tipo: "devolucao",
        responsavel_id: user?.id ?? null,
        responsavel_nome: form.devolvido_por_nome || meuNome,
        status: "aguardando_conferencia",
        detalhes: `${retirada.numero}${e.quantidade > 1 ? ` • ${retirada.quantidade} un.` : ""} • ${info?.label ?? condicao}`,
      });
      await registrarAuditoria({
        user_id: user?.id ?? null,
        user_nome: meuNome,
        tabela: "returns",
        registro_id: devolucao.id,
        acao: "devolucao",
        detalhes: { equipamento: e.codigo, condicao },
      });
      await criarNotificacao({
        titulo: `Devolução aguardando conferência — ${e.nome}`,
        mensagem: `Registrada por ${form.devolvido_por_nome || meuNome}.`,
        tipo: "info",
      });

      toast.success("Devolução registrada. Aguardando conferência da coordenação.");
      navigate({ to: "/equipamento/$id", params: { id } });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível registrar a devolução");
    } finally {
      setSalvando(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell titulo="Registrar devolução">
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando dados da saída...</p>
      </AppShell>
    );
  }
  if (!e || !retirada) {
    return (
      <AppShell titulo="Nenhuma retirada em aberto" descricao={e?.nome ?? ""}>
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Não existe retirada em aberto para este equipamento, então não há devolução a registrar.
            </p>
            <Button asChild variant="secondary">
              <Link to="/inventario">Voltar ao inventário</Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell titulo="Registrar devolução" descricao={`${e.nome} • ${e.codigo}`}>
      <form className="space-y-4" onSubmit={(ev) => void salvar(ev)}>
        {retiradas.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Qual retirada está sendo devolvida?</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={retirada.id}
                onChange={(ev) => setSelecionada(ev.target.value)}
              >
                {retiradas.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.numero} • {r.responsavel_nome} • {r.quantidade} un.
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dados da retirada</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 p-4 pt-0">
            <StorageImage caminho={e.foto_url} alt={e.nome} className="h-20 w-20 shrink-0 rounded-xl" />
            <div className="text-xs text-muted-foreground">
              <p className="text-sm font-bold text-foreground">{retirada.numero}</p>
              {e.quantidade > 1 && <p>Quantidade: {retirada.quantidade} unidade(s)</p>}
              <p>Responsável: {retirada.responsavel_nome}</p>
              <p>Saída: {formatarData(retirada.retirada_em)}</p>
              <p>Previsão: {formatarData(retirada.previsao_devolucao)}</p>
              <p>Evento: {retirada.evento ?? "—"}</p>
              <p>Estado na saída: {retirada.estado_saida ?? "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Condição na devolução</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(CONDICOES_DEVOLUCAO).map(([valor, info]) => (
              <label
                key={valor}
                className={`flex items-center gap-3 rounded-xl border p-3 text-sm ${
                  condicao === valor ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <input
                  type="radio"
                  name="condicao"
                  value={valor}
                  checked={condicao === valor}
                  onChange={() => setCondicao(valor)}
                />
                <span>{info.label}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conferência de acessórios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {acessoriosSaida.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum acessório saiu com este equipamento.</p>
            )}
            {acessoriosSaida.map((a, i) => (
              <label key={`${a.nome}-${i}`} className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
                <Checkbox
                  checked={Boolean(conferidos[String(i)])}
                  onCheckedChange={(v) => setConferidos({ ...conferidos, [String(i)]: Boolean(v) })}
                />
                <span>{a.nome}</span>
              </label>
            ))}
            <div className="space-y-2">
              <Label>Acessórios faltando</Label>
              <Input
                value={form.acessorios_faltando}
                onChange={(ev) => setForm({ ...form, acessorios_faltando: ev.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fotos atuais obrigatórias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PhotoUpload pasta="devolucoes" valor={fotos} onChange={setFotos} titulo="Fotos na devolução" obrigatorio />
            <div className="space-y-2">
              <Label>Descrição do estado do equipamento</Label>
              <Textarea
                placeholder="Ex.: lente com pequeno risco, tampa traseira solta..."
                value={form.relato}
                onChange={(ev) => setForm({ ...form, relato: ev.target.value })}
              />
            </div>
            <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                disabled={analisando || fotos.length === 0}
                onClick={() => void analisar()}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {analisando ? "Analisando fotos..." : relatorioIA ? "Analisar de novo" : "Analisar danos com IA"}
              </Button>
              {fotos.length === 0 && (
                <p className="text-xs text-muted-foreground">Coloque ao menos uma foto para analisar.</p>
              )}
              {relatorioIA && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-primary">Relatório de condição (IA) — confira antes de salvar</p>
                  <pre className="whitespace-pre-wrap rounded-lg bg-card p-3 font-sans text-sm">{relatorioIA}</pre>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(ev) => setForm({ ...form, observacoes: ev.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quem devolve e quem recebe</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Quem está devolvendo</Label>
              <Input
                placeholder={meuNome}
                value={form.devolvido_por_nome}
                onChange={(ev) => setForm({ ...form, devolvido_por_nome: ev.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Quem está recebendo</Label>
              <Input
                value={form.recebido_por_nome}
                onChange={(ev) => setForm({ ...form, recebido_por_nome: ev.target.value })}
              />
            </div>
            <div className="sm:col-span-2">
              <SignaturePad valor={assinatura} onChange={setAssinatura} titulo="Assinatura de quem devolve" />
            </div>
          </CardContent>
        </Card>

        <p className="rounded-xl bg-info/15 p-3 text-xs">
          Após registrar, o equipamento fica em “Aguardando conferência” até a coordenação aprovar.
        </p>

        <Button type="submit" size="lg" className="w-full" disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          Concluir devolução
        </Button>
      </form>
    </AppShell>
  );
}
