import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Download,
  Printer,
  Sparkles,
  TriangleAlert,
  Wrench,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { StorageImage } from "@/components/StorageImage";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Camera } from "lucide-react";
import { enviarArquivos } from "@/lib/storage";
import { QrCodeEtiqueta, useQrDataUrl } from "@/components/QrCodeEtiqueta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  STATUS_BLOQUEADOS_RETIRADA,
  STATUS_ASSISTENCIA,
  STATUS_MANUTENCAO,
  formatarData,
  formatarMoeda,
  statusLabel,
  statusTom,
} from "@/lib/constants";
import { useAuth, nomeUsuario } from "@/lib/auth";
import { criarNotificacao, registrarAuditoria, registrarMovimento } from "@/lib/registros";

export const Route = createFileRoute("/_authenticated/equipamento/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do equipamento — MMV Produção" },
      {
        name: "description",
        content: "Ficha completa do equipamento: status, responsável, histórico, manutenções e QR Code.",
      },
      { property: "og:title", content: "Ficha do equipamento — MMV Produção" },
      { property: "og:description", content: "Ficha completa do equipamento audiovisual." },
    ],
  }),
  component: Ficha,
});

function Ficha() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, perfil, ehGestor } = useAuth();
  const qrDataUrl = useQrDataUrl(id, 600);

  const { data, isLoading } = useQuery({
    queryKey: ["equipamento", id],
    queryFn: async () => {
      const equipamento = await supabase.from("equipment").select("*").eq("id", id).maybeSingle();
      if (!equipamento.data) return null;
      const [categoria, local, setor, acessorios, fotos, docs, movimentos, checkouts, manutencoes, assistencias, limpezas] =
        await Promise.all([
          equipamento.data.category_id
            ? supabase.from("equipment_categories").select("nome").eq("id", equipamento.data.category_id).maybeSingle()
            : Promise.resolve({ data: null }),
          equipamento.data.location_id
            ? supabase.from("locations").select("nome").eq("id", equipamento.data.location_id).maybeSingle()
            : Promise.resolve({ data: null }),
          equipamento.data.department_id
            ? supabase.from("departments").select("nome").eq("id", equipamento.data.department_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase.from("equipment_accessories").select("*").eq("equipment_id", id),
          supabase.from("equipment_photos").select("*").eq("equipment_id", id).order("created_at", { ascending: false }),
          supabase.from("equipment_documents").select("*").eq("equipment_id", id),
          supabase.from("movements").select("*").eq("equipment_id", id).order("created_at", { ascending: false }).limit(30),
          supabase.from("checkouts").select("*").eq("equipment_id", id).order("retirada_em", { ascending: false }),
          supabase.from("maintenance_orders").select("*").eq("equipment_id", id).order("created_at", { ascending: false }),
          supabase.from("technical_assistance").select("*").eq("equipment_id", id).order("created_at", { ascending: false }),
          supabase.from("cleaning_orders").select("*").eq("equipment_id", id).order("created_at", { ascending: false }),
        ]);
      return {
        equipamento: equipamento.data,
        categoria: categoria.data?.nome ?? null,
        local: local.data?.nome ?? null,
        setor: setor.data?.nome ?? null,
        acessorios: acessorios.data ?? [],
        fotos: fotos.data ?? [],
        documentos: docs.data ?? [],
        movimentos: movimentos.data ?? [],
        checkouts: checkouts.data ?? [],
        manutencoes: manutencoes.data ?? [],
        assistencias: assistencias.data ?? [],
        limpezas: limpezas.data ?? [],
      };
    },
  });

  const alterarStatus = useMutation({
    mutationFn: async ({ status, detalhe }: { status: string; detalhe: string }) => {
      const { error } = await supabase.from("equipment").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      await registrarMovimento({
        equipment_id: id,
        tipo: "status",
        responsavel_id: user?.id ?? null,
        responsavel_nome: nomeUsuario(perfil, user),
        status,
        detalhes: detalhe,
      });
      await registrarAuditoria({
        user_id: user?.id ?? null,
        user_nome: nomeUsuario(perfil, user),
        tabela: "equipment",
        registro_id: id,
        acao: "alteracao_status",
        detalhes: { status, detalhe },
      });
    },
    onSuccess: () => {
      toast.success("Situação do equipamento atualizada");
      void queryClient.invalidateQueries();
    },
    onError: () => toast.error("Não foi possível atualizar"),
  });

  async function informarProblema() {
    const problema = window.prompt("Descreva o problema encontrado:");
    if (!problema) return;
    const { data: ordem, error } = await supabase
      .from("maintenance_orders")
      .insert({
        equipment_id: id,
        problema,
        relatado_por_id: user?.id ?? null,
        relatado_por_nome: nomeUsuario(perfil, user),
        prioridade: "normal",
        status: "aguardando_avaliacao",
      })
      .select()
      .single();
    if (error) {
      toast.error("Não foi possível registrar o problema");
      return;
    }
    await alterarStatus.mutateAsync({ status: "danificado", detalhe: `Problema informado: ${problema}` });
    await criarNotificacao({
      titulo: `Problema informado — ${data?.equipamento.nome ?? ""}`,
      mensagem: `Ordem ${ordem.numero}: ${problema}`,
      tipo: "atencao",
    });
    toast.success(`Ordem de manutenção ${ordem.numero} aberta`);
  }

  async function enviarParaFila(tipo: "limpeza" | "revisao") {
    const { error } = await supabase.from("cleaning_orders").insert({
      equipment_id: id,
      tipo,
      motivo: tipo === "limpeza" ? "Solicitação de limpeza" : "Solicitação de revisão",
      responsavel_nome: nomeUsuario(perfil, user),
      status: "aguardando",
    });
    if (error) {
      toast.error("Não foi possível abrir a solicitação");
      return;
    }
    await alterarStatus.mutateAsync({
      status: tipo === "limpeza" ? "precisa_limpeza" : "precisa_revisao",
      detalhe: `Enviado para ${tipo}`,
    });
  }

  if (isLoading) {
    return (
      <AppShell titulo="Ficha do equipamento">
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando ficha...</p>
      </AppShell>
    );
  }
  if (!data) {
    return (
      <AppShell titulo="Equipamento não encontrado">
        <p className="text-sm text-muted-foreground">
          Este equipamento não existe ou foi removido.{" "}
          <Link to="/inventario" className="font-semibold text-primary">
            Voltar ao inventário
          </Link>
        </p>
      </AppShell>
    );
  }

  const e = data.equipamento;
  const retiradaAberta = data.checkouts.find((c) => c.status === "aberta");
  const podeRetirar = !STATUS_BLOQUEADOS_RETIRADA.includes(e.status);
  const gastos = data.manutencoes.reduce((soma, m) => soma + Number(m.custo_total ?? 0), 0);

  return (
    <AppShell titulo={e.nome} descricao={`${e.codigo} • ${data.categoria ?? "Sem categoria"}`}>
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="flex gap-3">
              <label className="flex w-24 shrink-0 cursor-pointer flex-col items-center gap-1">
                <StorageImage caminho={e.foto_url} alt={e.nome} className="h-24 w-24 rounded-2xl" />
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary px-2 py-1 text-xs font-medium text-primary-foreground">
                  <Camera className="h-3 w-3" />
                  {e.foto_url ? "Trocar foto" : "COLOCAR FOTO"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (ev) => {
                    const arquivo = ev.target.files?.[0];
                    ev.target.value = "";
                    if (!arquivo) return;
                    const t = toast.loading("Enviando foto...");
                    try {
                      const [caminho] = await enviarArquivos([arquivo], `equipamentos/${id}`);
                      if (!caminho) throw new Error("upload");
                      await supabase.from("equipment_photos").insert({ equipment_id: id, url: caminho, tipo: "cadastro", created_by: user?.id ?? null });
                      const { error } = await supabase.from("equipment").update({ foto_url: caminho }).eq("id", id);
                      if (error) throw error;
                      toast.success("Foto salva", { id: t });
                      void queryClient.invalidateQueries();
                    } catch {
                      toast.error("Não foi possível salvar a foto", { id: t });
                    }
                  }}
                />
              </label>
              <div className="min-w-0 flex-1 space-y-1">
                <StatusBadge label={statusLabel(e.status)} tom={statusTom(e.status)} />
                <p className="text-sm text-muted-foreground">
                  {e.marca ?? "—"} {e.modelo ?? ""}
                </p>
                <p className="text-xs text-muted-foreground">Patrimônio: {e.patrimonio ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Série: {e.numero_serie ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Local: {data.local ?? "—"}</p>
                <p className="text-xs text-muted-foreground">
                  Responsável atual: {e.responsavel_atual_nome ?? "Na base"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                size="lg"
                disabled={!podeRetirar}
                onClick={() => navigate({ to: "/retirar/$id", params: { id } })}
              >
                <ArrowUpFromLine className="h-4 w-4" /> Retirar
              </Button>
              <Button
                size="lg"
                variant="secondary"
                disabled={!retiradaAberta}
                onClick={() => navigate({ to: "/devolver/$id", params: { id } })}
              >
                <ArrowDownToLine className="h-4 w-4" /> Devolver
              </Button>
              <Button variant="outline" onClick={() => void informarProblema()}>
                <TriangleAlert className="h-4 w-4" /> Informar problema
              </Button>
              <Button variant="outline" onClick={() => void enviarParaFila("limpeza")}>
                <Sparkles className="h-4 w-4" /> Limpeza
              </Button>
              <Button variant="outline" onClick={() => void enviarParaFila("revisao")}>
                <Wrench className="h-4 w-4" /> Revisão
              </Button>
              {ehGestor && e.status === "aguardando_conferencia" && (
                <Button variant="outline" onClick={() => navigate({ to: "/conferencia" })}>
                  Conferir devolução
                </Button>
              )}
            </div>
            {!podeRetirar && (
              <p className="rounded-xl bg-warning/15 p-3 text-xs text-foreground">
                Retirada bloqueada porque o equipamento está em: {statusLabel(e.status)}.
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="dados">
          <TabsList className="w-full overflow-x-auto">
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="manutencao">Manutenção</TabsTrigger>
            <TabsTrigger value="qrcode">QR Code</TabsTrigger>
          </TabsList>

          <TabsContent value="dados" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Informações do patrimônio</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                <Linha titulo="Setor" valor={data.setor} />
                <Linha titulo="Quantidade" valor={e.quantidade > 1 ? `${e.quantidade_disponivel} de ${e.quantidade} disponíveis` : String(e.quantidade)} />
                <Linha titulo="Estado de conservação" valor={e.estado_conservacao} />
                <Linha titulo="Valor estimado" valor={formatarMoeda(e.valor_estimado)} />
                <Linha titulo="Data da compra" valor={formatarData(e.data_compra, false)} />
                <Linha titulo="Fornecedor" valor={e.fornecedor} />
                <Linha titulo="Nota fiscal" valor={e.nota_fiscal} />
                <Linha titulo="Garantia até" valor={formatarData(e.garantia_vencimento, false)} />
                <Linha titulo="Última revisão" valor={formatarData(e.ultima_revisao, false)} />
                <Linha titulo="Próxima revisão" valor={formatarData(e.proxima_revisao, false)} />
                <Linha titulo="Gastos acumulados" valor={formatarMoeda(gastos)} />
                <Linha titulo="Cadastrado em" valor={formatarData(e.created_at)} />
                <div className="sm:col-span-2">
                  <Linha titulo="Descrição" valor={e.descricao} />
                  <Linha titulo="Observações" valor={e.observacoes} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Acessórios</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {data.acessorios.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum acessório cadastrado.</p>
                )}
                {data.acessorios.map((a) => (
                  <span key={a.id} className="rounded-full bg-muted px-3 py-1 text-xs">
                    {a.nome} ({a.quantidade})
                  </span>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Fotos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.fotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {data.fotos.map((f) => (
                      <StorageImage key={f.id} caminho={f.url} alt={e.nome} className="aspect-square w-full rounded-xl" />
                    ))}
                  </div>
                )}
                <PhotoUpload
                  pasta={`equipamentos/${id}`}
                  valor={[]}
                  titulo="Adicionar fotos do equipamento"
                  onChange={async (caminhos) => {
                    const { error } = await supabase.from("equipment_photos").insert(
                      caminhos.map((url) => ({ equipment_id: id, url, tipo: "cadastro", created_by: user?.id ?? null })),
                    );
                    if (error) {
                      toast.error("Não foi possível salvar a foto");
                      return;
                    }
                    if (!e.foto_url && caminhos[0]) {
                      await supabase.from("equipment").update({ foto_url: caminhos[0] }).eq("id", id);
                    }
                    toast.success("Foto salva no equipamento");
                    void queryClient.invalidateQueries();
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Linha do tempo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.movimentos.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sem movimentações registradas.</p>
                )}
                {data.movimentos.map((m) => (
                  <div key={m.id} className="border-l-2 border-primary/30 pl-3">
                    <p className="text-sm font-semibold capitalize">{m.tipo.replaceAll("_", " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarData(m.created_at)} • {m.responsavel_nome ?? "—"}
                    </p>
                    {m.detalhes && <p className="text-xs text-muted-foreground">{m.detalhes}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Retiradas e devoluções</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.checkouts.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma retirada registrada.</p>
                )}
                {data.checkouts.map((c) => (
                  <div key={c.id} className="rounded-xl border border-border p-3 text-sm">
                    <p className="font-semibold">
                      {c.numero} • {c.responsavel_nome}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Saída: {formatarData(c.retirada_em)} • Previsão: {formatarData(c.previsao_devolucao)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {c.evento ? `Evento: ${c.evento} • ` : ""}Situação: {c.status === "aberta" ? "Em aberto" : "Encerrada"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manutencao" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ordens de manutenção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.manutencoes.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma manutenção registrada.</p>
                )}
                {data.manutencoes.map((m) => (
                  <Link key={m.id} to="/manutencao" className="block rounded-xl border border-border p-3 text-sm">
                    <p className="font-semibold">
                      {m.numero} — {STATUS_MANUTENCAO[m.status]?.label ?? m.status}
                    </p>
                    <p className="text-xs text-muted-foreground">{m.problema}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarData(m.created_at)} • Custo: {formatarMoeda(m.custo_total)}
                    </p>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Assistência técnica</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.assistencias.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum envio para assistência.</p>
                )}
                {data.assistencias.map((a) => (
                  <div key={a.id} className="rounded-xl border border-border p-3 text-sm">
                    <p className="font-semibold">
                      {a.empresa} — {STATUS_ASSISTENCIA[a.status]?.label ?? a.status}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Protocolo {a.protocolo ?? "—"} • Enviado em {formatarData(a.enviado_em, false)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Previsão de retorno: {formatarData(a.previsao_retorno, false)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Limpezas e revisões</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {data.limpezas.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhuma limpeza registrada.</p>
                )}
                {data.limpezas.map((l) => (
                  <div key={l.id} className="rounded-xl border border-border p-3 text-sm">
                    <p className="font-semibold capitalize">{l.tipo}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarData(l.solicitado_em)} • {l.status}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qrcode">
            <Card>
              <CardContent className="flex flex-col items-center gap-4 p-6">
                <div className="w-48">
                  <QrCodeEtiqueta id={e.id} nome={e.nome} codigo={e.codigo} tamanho={176} />
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button variant="secondary" onClick={() => window.print()}>
                    <Printer className="h-4 w-4" /> Imprimir etiqueta
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!qrDataUrl) return;
                      const link = document.createElement("a");
                      link.href = qrDataUrl;
                      link.download = `${e.codigo}.png`;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4" /> Baixar PNG
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/qrcodes">Imprimir vários em A4</Link>
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Ao ler este QR Code, a ficha resumida do equipamento abre direto no aplicativo.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

function Linha({ titulo, valor }: { titulo: string; valor?: string | null }) {
  return (
    <p className="flex flex-wrap gap-1">
      <span className="text-muted-foreground">{titulo}:</span>
      <span className="font-medium">{valor || "—"}</span>
    </p>
  );
}
