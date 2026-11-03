import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PhotoUpload } from "@/components/PhotoUpload";
import { SignaturePad } from "@/components/SignaturePad";
import { StatusBadge } from "@/components/StatusBadge";
import { StorageImage } from "@/components/StorageImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ESTADOS_CONSERVACAO,
  MINISTERIO,
  STATUS_BLOQUEADOS_RETIRADA,
  statusLabel,
  statusTom,
} from "@/lib/constants";
import { nomeUsuario, useAuth } from "@/lib/auth";
import { ajustarDisponivel, criarNotificacao, registrarAuditoria, registrarMovimento } from "@/lib/registros";

export const Route = createFileRoute("/_authenticated/retirar/$id")({
  head: () => ({
    meta: [
      { title: "Registrar retirada — MMV Produção" },
      {
        name: "description",
        content: "Registro de retirada com conferência de acessórios, fotos, termo de responsabilidade e assinatura.",
      },
      { property: "og:title", content: "Registrar retirada — MMV Produção" },
      { property: "og:description", content: "Registro de retirada de equipamento audiovisual." },
    ],
  }),
  component: Retirar,
});

function Retirar() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user, perfil, ehGestor } = useAuth();
  const [salvando, setSalvando] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [termo, setTermo] = useState(false);
  const [conferidos, setConferidos] = useState<Record<string, boolean>>({});
  const [quantidadeRetirada, setQuantidadeRetirada] = useState("1");
  const [form, setForm] = useState({
    responsavel_nome: "",
    finalidade: "",
    evento: "",
    destino: "",
    previsao_devolucao: "",
    estado_saida: "bom",
    observacoes: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["retirar", id],
    queryFn: async () => {
      const [equipamento, acessorios] = await Promise.all([
        supabase.from("equipment").select("*").eq("id", id).maybeSingle(),
        supabase.from("equipment_accessories").select("*").eq("equipment_id", id),
      ]);
      return { equipamento: equipamento.data, acessorios: acessorios.data ?? [] };
    },
  });

  const e = data?.equipamento;
  const meuNome = nomeUsuario(perfil, user);

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!e) return;
    if (fotos.length === 0) {
      toast.error("Anexe pelo menos uma foto do equipamento na saída");
      return;
    }
    if (!termo) {
      toast.error("É necessário aceitar o termo de responsabilidade");
      return;
    }
    if (!assinatura) {
      toast.error("Assine o termo antes de concluir");
      return;
    }
    const multi = e.quantidade > 1;
    const qtd = multi ? Math.max(1, Math.floor(Number(quantidadeRetirada) || 1)) : 1;
    if (multi && qtd > e.quantidade_disponivel) {
      toast.error(`Só há ${e.quantidade_disponivel} unidade(s) disponível(is)`);
      return;
    }
    setSalvando(true);
    try {
      if (!multi) {
        const { data: aberta } = await supabase
          .from("checkouts")
          .select("id")
          .eq("equipment_id", id)
          .eq("status", "aberta")
          .maybeSingle();
        if (aberta) {
          toast.error("Este equipamento já possui uma retirada em aberto");
          setSalvando(false);
          return;
        }
      }

      const precisaAutorizacao = !ehGestor;
      const acessoriosRegistro = (data?.acessorios ?? []).map((a) => ({
        nome: a.nome,
        quantidade: a.quantidade,
        conferido: Boolean(conferidos[a.id]),
      }));

      const { data: retirada, error } = await supabase
        .from("checkouts")
        .insert({
          equipment_id: id,
          quantidade: qtd,
          responsavel_id: user?.id ?? null,
          responsavel_nome: form.responsavel_nome || meuNome,
          autorizado_por_id: precisaAutorizacao ? null : user?.id ?? null,
          autorizado_por_nome: precisaAutorizacao ? null : meuNome,
          finalidade: form.finalidade || null,
          evento: form.evento || null,
          destino: form.destino || null,
          unit_id: e.unit_id,
          previsao_devolucao: form.previsao_devolucao ? new Date(form.previsao_devolucao).toISOString() : null,
          estado_saida: form.estado_saida,
          acessorios: acessoriosRegistro,
          fotos,
          observacoes: form.observacoes || null,
          termo_aceito: true,
          assinatura,
          status: precisaAutorizacao ? "aguardando_autorizacao" : "aberta",
        })
        .select()
        .single();
      if (error) throw error;

      const novoStatus = precisaAutorizacao ? "aguardando_autorizacao" : "retirado";
      if (multi) {
        await ajustarDisponivel(id, -qtd, novoStatus);
      } else {
        await supabase
          .from("equipment")
          .update({
            status: novoStatus,
            quantidade_disponivel: 0,
            responsavel_atual_id: user?.id ?? null,
            responsavel_atual_nome: form.responsavel_nome || meuNome,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      }

      await registrarMovimento({
        equipment_id: id,
        tipo: "retirada",
        responsavel_id: user?.id ?? null,
        responsavel_nome: form.responsavel_nome || meuNome,
        destino: form.destino || null,
        status: novoStatus,
        detalhes: `${retirada.numero}${qtd > 1 || e.quantidade > 1 ? ` • ${qtd} un.` : ""}${form.evento ? ` • ${form.evento}` : ""}`,
      });
      await registrarAuditoria({
        user_id: user?.id ?? null,
        user_nome: meuNome,
        tabela: "checkouts",
        registro_id: retirada.id,
        acao: "retirada",
        detalhes: { equipamento: e.codigo, numero: retirada.numero },
      });
      if (precisaAutorizacao) {
        await criarNotificacao({
          titulo: `Retirada aguardando autorização — ${e.nome}`,
          mensagem: `${meuNome} solicitou a retirada ${retirada.numero}.`,
          tipo: "atencao",
        });
        toast.success("Solicitação enviada para autorização da coordenação");
      } else {
        toast.success(`Retirada ${retirada.numero} registrada`);
      }
      navigate({ to: "/equipamento/$id", params: { id } });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível registrar a retirada");
    } finally {
      setSalvando(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell titulo="Registrar retirada">
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando equipamento...</p>
      </AppShell>
    );
  }
  if (!e) {
    return (
      <AppShell titulo="Equipamento não encontrado">
        <Link to="/inventario" className="text-sm font-semibold text-primary">
          Voltar ao inventário
        </Link>
      </AppShell>
    );
  }
  if (STATUS_BLOQUEADOS_RETIRADA.includes(e.status)) {
    return (
      <AppShell titulo="Retirada bloqueada" descricao={e.nome}>
        <Card>
          <CardContent className="space-y-3 p-6 text-center">
            <StatusBadge label={statusLabel(e.status)} tom={statusTom(e.status)} />
            <p className="text-sm text-muted-foreground">
              Este equipamento não pode ser retirado enquanto estiver em: {statusLabel(e.status)}.
            </p>
            <Button asChild variant="secondary">
              <Link to="/equipamento/$id" params={{ id }}>
                Ver ficha do equipamento
              </Link>
            </Button>
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell titulo="Registrar retirada" descricao={`${e.nome} • ${e.codigo}`}>
      <form className="space-y-4" onSubmit={(ev) => void salvar(ev)}>
        <Card>
          <CardContent className="flex gap-3 p-4">
            <StorageImage caminho={e.foto_url} alt={e.nome} className="h-20 w-20 shrink-0 rounded-xl" />
            <div>
              <p className="font-bold">{e.nome}</p>
              <p className="text-xs text-muted-foreground">
                {e.codigo} • Patrimônio {e.patrimonio ?? "—"}
              </p>
              <StatusBadge label={statusLabel(e.status)} tom={statusTom(e.status)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dados da saída</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {e.quantidade > 1 && (
              <div className="space-y-2 sm:col-span-2">
                <Label>
                  Quantas unidades vai retirar? ({e.quantidade_disponivel} de {e.quantidade} disponíveis)
                </Label>
                <Input
                  type="number"
                  min={1}
                  max={e.quantidade_disponivel}
                  required
                  value={quantidadeRetirada}
                  onChange={(ev) => setQuantidadeRetirada(ev.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Responsável pela retirada</Label>
              <Input
                placeholder={meuNome}
                value={form.responsavel_nome}
                onChange={(ev) => setForm({ ...form, responsavel_nome: ev.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Evento / culto / gravação</Label>
              <Input value={form.evento} onChange={(ev) => setForm({ ...form, evento: ev.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Finalidade do uso</Label>
              <Input value={form.finalidade} onChange={(ev) => setForm({ ...form, finalidade: ev.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Destino / local de uso</Label>
              <Input value={form.destino} onChange={(ev) => setForm({ ...form, destino: ev.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Previsão de devolução *</Label>
              <Input
                type="datetime-local"
                required
                value={form.previsao_devolucao}
                onChange={(ev) => setForm({ ...form, previsao_devolucao: ev.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Estado do equipamento na saída</Label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={form.estado_saida}
                onChange={(ev) => setForm({ ...form, estado_saida: ev.target.value })}
              >
                {ESTADOS_CONSERVACAO.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conferência de acessórios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(data?.acessorios ?? []).length === 0 && (
              <p className="text-sm text-muted-foreground">Este equipamento não tem acessórios cadastrados.</p>
            )}
            {(data?.acessorios ?? []).map((a) => (
              <label key={a.id} className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm">
                <Checkbox
                  checked={Boolean(conferidos[a.id])}
                  onCheckedChange={(v) => setConferidos({ ...conferidos, [a.id]: Boolean(v) })}
                />
                <span>
                  {a.nome} <span className="text-muted-foreground">({a.quantidade})</span>
                </span>
              </label>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fotos obrigatórias na saída</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <PhotoUpload pasta="retiradas" valor={fotos} onChange={setFotos} titulo="Fotos do equipamento" obrigatorio />
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(ev) => setForm({ ...form, observacoes: ev.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Termo de responsabilidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              Declaro que recebi o equipamento acima, do {MINISTERIO}, em bom estado de conservação, comprometendo-me a
              utilizá-lo exclusivamente para as atividades da Produção e Comunicação Audiovisual, zelar pela sua
              integridade, devolvê-lo na data prevista e comunicar imediatamente qualquer dano, perda ou falha.
            </p>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={termo} onCheckedChange={(v) => setTermo(Boolean(v))} />
              <span>Li e aceito o termo de responsabilidade</span>
            </label>
            <SignaturePad valor={assinatura} onChange={setAssinatura} />
          </CardContent>
        </Card>

        {!ehGestor && (
          <p className="rounded-xl bg-info/15 p-3 text-xs">
            Sua retirada será enviada para autorização da coordenação de produção.
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          Concluir retirada
        </Button>
      </form>
    </AppShell>
  );
}
