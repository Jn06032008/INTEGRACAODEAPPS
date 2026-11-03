import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatarData, STATUS_RESERVA } from "@/lib/constants";
import { useAuth, nomeUsuario } from "@/lib/auth";
import { registrarAuditoria, registrarMovimento } from "@/lib/registros";

export const Route = createFileRoute("/_authenticated/reservas")({
  head: () => ({
    meta: [
      { title: "Reservas — MMV Produção" },
      {
        name: "description",
        content: "Agende equipamentos para cultos e eventos com bloqueio automático de conflito de horário.",
      },
      { property: "og:title", content: "Reservas — MMV Produção" },
      { property: "og:description", content: "Agende equipamentos para cultos e eventos sem conflito de horário." },
    ],
  }),
  component: Reservas,
});

const VAZIO = {
  equipment_id: "",
  evento: "",
  inicio: "",
  fim: "",
  local: "",
  observacoes: "",
};

function Reservas() {
  const { user, perfil, ehGestor } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ ...VAZIO });
  const [abrirForm, setAbrirForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["reservas"],
    queryFn: async () => {
      const [reservas, equipamentos] = await Promise.all([
        supabase.from("reservations").select("*").order("inicio", { ascending: true }),
        supabase.from("equipment").select("id, nome, codigo, status").eq("ativo", true).order("nome"),
      ]);
      return { reservas: reservas.data ?? [], equipamentos: equipamentos.data ?? [] };
    },
  });

  const equipamentos = data?.equipamentos ?? [];
  const mapa = new Map(equipamentos.map((e) => [e.id, e]));
  const reservas = data?.reservas ?? [];

  function alterar(campo: keyof typeof VAZIO, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  const criar = useMutation({
    mutationFn: async () => {
      if (!form.equipment_id) throw new Error("Escolha o equipamento.");
      if (!form.evento.trim()) throw new Error("Informe o culto ou evento.");
      if (!form.inicio || !form.fim) throw new Error("Informe início e fim da reserva.");
      const inicio = new Date(form.inicio);
      const fim = new Date(form.fim);
      if (fim.getTime() <= inicio.getTime()) throw new Error("O fim deve ser depois do início.");

      const conflito = reservas.find(
        (r) =>
          r.equipment_id === form.equipment_id &&
          r.status !== "cancelada" &&
          r.status !== "concluida" &&
          new Date(r.inicio).getTime() < fim.getTime() &&
          new Date(r.fim).getTime() > inicio.getTime(),
      );
      if (conflito) {
        throw new Error(
          `Já existe reserva para este equipamento em "${conflito.evento}" (${formatarData(conflito.inicio)} até ${formatarData(conflito.fim)}).`,
        );
      }

      const responsavel = nomeUsuario(perfil, user);
      const { data: nova, error } = await supabase
        .from("reservations")
        .insert({
          equipment_id: form.equipment_id,
          evento: form.evento.trim(),
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          local: form.local.trim() || null,
          observacoes: form.observacoes.trim() || null,
          responsavel_id: user?.id ?? null,
          responsavel_nome: responsavel,
          status: "confirmada",
        })
        .select("id")
        .single();
      if (error) throw error;

      await registrarMovimento({
        equipment_id: form.equipment_id,
        tipo: "reserva",
        responsavel_id: user?.id ?? null,
        responsavel_nome: responsavel,
        destino: form.local.trim() || null,
        status: "reservado",
        detalhes: `Reserva para ${form.evento.trim()} — ${formatarData(inicio.toISOString())} até ${formatarData(fim.toISOString())}`,
      });
      await registrarAuditoria({
        user_id: user?.id ?? null,
        user_nome: responsavel,
        tabela: "reservations",
        registro_id: nova?.id ?? null,
        acao: "criar",
        detalhes: { evento: form.evento.trim() },
      });
    },
    onSuccess: () => {
      toast.success("Reserva registrada.");
      setForm({ ...VAZIO });
      setAbrirForm(false);
      void queryClient.invalidateQueries({ queryKey: ["reservas"] });
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  const mudarStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
      if (error) throw error;
      await registrarAuditoria({
        user_id: user?.id ?? null,
        user_nome: nomeUsuario(perfil, user),
        tabela: "reservations",
        registro_id: id,
        acao: "atualizar",
        detalhes: { status },
      });
    },
    onSuccess: () => {
      toast.success("Reserva atualizada.");
      void queryClient.invalidateQueries({ queryKey: ["reservas"] });
    },
    onError: (erro: Error) => toast.error(erro.message),
  });

  const agora = Date.now();
  const proximas = reservas.filter(
    (r) => new Date(r.fim).getTime() >= agora && r.status !== "cancelada" && r.status !== "concluida",
  );
  const encerradas = reservas.filter((r) => !proximas.includes(r));

  return (
    <AppShell
      titulo="Reservas"
      descricao={`${proximas.length} reserva(s) ativa(s)`}
      acoes={
        <Button size="sm" variant="secondary" onClick={() => setAbrirForm((v) => !v)}>
          <CalendarPlus className="h-4 w-4" /> {abrirForm ? "Fechar formulário" : "Nova reserva"}
        </Button>
      }
    >
      <div className="space-y-4">
        {abrirForm && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Nova reserva</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Equipamento</Label>
                <Select
                  value={form.equipment_id}
                  onValueChange={(v) => alterar("equipment_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha o equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipamentos.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome} • {e.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Culto ou evento</Label>
                <Input
                  value={form.evento}
                  onChange={(e) => alterar("evento", e.target.value)}
                  placeholder="Ex.: Culto de domingo à noite"
                />
              </div>
              <div>
                <Label>Início</Label>
                <Input
                  type="datetime-local"
                  value={form.inicio}
                  onChange={(e) => alterar("inicio", e.target.value)}
                />
              </div>
              <div>
                <Label>Fim</Label>
                <Input
                  type="datetime-local"
                  value={form.fim}
                  onChange={(e) => alterar("fim", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Local de uso</Label>
                <Input
                  value={form.local}
                  onChange={(e) => alterar("local", e.target.value)}
                  placeholder="Ex.: Templo principal, House"
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Observações</Label>
                <Textarea
                  value={form.observacoes}
                  onChange={(e) => alterar("observacoes", e.target.value)}
                  placeholder="Informações que ajudem quem vai separar o equipamento"
                />
              </div>
              <div className="sm:col-span-2">
                <Button
                  className="w-full"
                  onClick={() => criar.mutate()}
                  disabled={criar.isPending}
                >
                  {criar.isPending ? "Salvando..." : "Confirmar reserva"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Carregando reservas...</p>
        ) : (
          <>
            <Secao
              titulo="Reservas ativas e futuras"
              lista={proximas}
              mapa={mapa}
              podeGerir={(r) => ehGestor || r.responsavel_id === user?.id}
              onStatus={(id, status) => mudarStatus.mutate({ id, status })}
              ocupado={mudarStatus.isPending}
              vazio="Nenhuma reserva ativa. Use “Nova reserva” para agendar um equipamento."
            />
            <Secao
              titulo="Histórico de reservas"
              lista={encerradas}
              mapa={mapa}
              podeGerir={() => false}
              onStatus={() => undefined}
              ocupado={false}
              vazio="Nenhuma reserva encerrada ainda."
            />
          </>
        )}
      </div>
    </AppShell>
  );
}

type Reserva = {
  id: string;
  equipment_id: string | null;
  evento: string;
  inicio: string;
  fim: string;
  local: string | null;
  observacoes: string | null;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  status: string;
};

function Secao({
  titulo,
  lista,
  mapa,
  podeGerir,
  onStatus,
  ocupado,
  vazio,
}: {
  titulo: string;
  lista: Reserva[];
  mapa: Map<string, { id: string; nome: string; codigo: string }>;
  podeGerir: (r: Reserva) => boolean;
  onStatus: (id: string, status: string) => void;
  ocupado: boolean;
  vazio: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {lista.map((r) => {
          const equipamento = r.equipment_id ? mapa.get(r.equipment_id) : null;
          const info = STATUS_RESERVA[r.status];
          return (
            <div key={r.id} className="rounded-xl border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  {equipamento ? (
                    <Link
                      to="/equipamento/$id"
                      params={{ id: equipamento.id }}
                      className="text-sm font-bold hover:underline"
                    >
                      {equipamento.nome} • {equipamento.codigo}
                    </Link>
                  ) : (
                    <p className="text-sm font-bold">Equipamento não informado</p>
                  )}
                  <p className="text-sm">{r.evento}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatarData(r.inicio)} até {formatarData(r.fim)}
                    {r.local ? ` • ${r.local}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Responsável: {r.responsavel_nome ?? "—"}
                  </p>
                  {r.observacoes && (
                    <p className="mt-1 text-xs text-muted-foreground">{r.observacoes}</p>
                  )}
                </div>
                <StatusBadge label={info?.label ?? r.status} tom={info?.tom ?? "neutral"} />
              </div>
              {podeGerir(r) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {r.equipment_id && (
                    <Button asChild size="sm">
                      <Link to="/retirar/$id" params={{ id: r.equipment_id }}>
                        Retirar agora
                      </Link>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={ocupado}
                    onClick={() => onStatus(r.id, "concluida")}
                  >
                    Concluir
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={ocupado}
                    onClick={() => onStatus(r.id, "cancelada")}
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          );
        })}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">{vazio}</p>}
      </CardContent>
    </Card>
  );
}
