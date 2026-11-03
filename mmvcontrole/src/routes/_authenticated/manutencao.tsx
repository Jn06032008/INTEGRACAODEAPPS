import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { StorageImage } from "@/components/StorageImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PRIORIDADES, STATUS_MANUTENCAO, formatarData, formatarMoeda } from "@/lib/constants";
import { nomeUsuario, useAuth } from "@/lib/auth";
import { registrarAuditoria, registrarMovimento } from "@/lib/registros";

export const Route = createFileRoute("/_authenticated/manutencao")({
  head: () => ({
    meta: [
      { title: "Manutenção — MMV Produção" },
      { name: "description", content: "Ordens de manutenção com diagnóstico, peças, custos e liberação para conferência." },
      { property: "og:title", content: "Manutenção — MMV Produção" },
      { property: "og:description", content: "Ordens de manutenção dos equipamentos audiovisuais." },
    ],
  }),
  component: Manutencao,
});

function Manutencao() {
  const queryClient = useQueryClient();
  const { user, perfil } = useAuth();
  const [aberta, setAberta] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["manutencao"],
    queryFn: async () => {
      const { data: ordens } = await supabase
        .from("maintenance_orders")
        .select("*")
        .order("created_at", { ascending: false });
      const ids = [...new Set((ordens ?? []).map((o) => o.equipment_id))];
      const { data: equipamentos } = ids.length
        ? await supabase.from("equipment").select("id, nome, codigo, foto_url").in("id", ids)
        : { data: [] };
      return { ordens: ordens ?? [], equipamentos: equipamentos ?? [] };
    },
  });

  const mapa = new Map((data?.equipamentos ?? []).map((e) => [e.id, e]));
  const meuNome = nomeUsuario(perfil, user);

  async function salvar(ordem: { id: string; equipment_id: string; numero: string }, novoStatus?: string) {
    const valorPecas = Number(form["valor_pecas"] ?? 0);
    const valorMaoObra = Number(form["valor_mao_obra"] ?? 0);
    const atualizacao: Record<string, unknown> = {
      diagnostico: form["diagnostico"] || undefined,
      solucao: form["solucao"] || undefined,
      pecas: form["pecas"] || undefined,
      responsavel_analise: meuNome,
      valor_pecas: valorPecas,
      valor_mao_obra: valorMaoObra,
      custo_total: valorPecas + valorMaoObra,
      observacoes: form["observacoes"] || undefined,
    };
    if (novoStatus) atualizacao["status"] = novoStatus;
    if (novoStatus === "concluida") atualizacao["conclusao"] = new Date().toISOString().slice(0, 10);

    const { error } = await supabase.from("maintenance_orders").update(atualizacao as never).eq("id", ordem.id);
    if (error) {
      toast.error("Não foi possível salvar a ordem");
      return;
    }
    if (novoStatus === "concluida") {
      await supabase
        .from("equipment")
        .update({ status: "aguardando_conferencia", updated_at: new Date().toISOString() })
        .eq("id", ordem.equipment_id);
      await registrarMovimento({
        equipment_id: ordem.equipment_id,
        tipo: "manutencao",
        responsavel_id: user?.id ?? null,
        responsavel_nome: meuNome,
        status: "aguardando_conferencia",
        detalhes: `${ordem.numero} reparada, liberada para conferência`,
      });
    } else if (novoStatus === "em_manutencao") {
      await supabase
        .from("equipment")
        .update({ status: "manutencao_interna", updated_at: new Date().toISOString() })
        .eq("id", ordem.equipment_id);
    }
    await registrarAuditoria({
      user_id: user?.id ?? null,
      user_nome: meuNome,
      tabela: "maintenance_orders",
      registro_id: ordem.id,
      acao: novoStatus ? `status_${novoStatus}` : "atualizacao",
    });
    toast.success("Ordem de manutenção atualizada");
    setAberta(null);
    setForm({});
    void queryClient.invalidateQueries();
  }

  return (
    <AppShell titulo="Manutenção" descricao="Ordens de serviço internas dos equipamentos">
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando ordens...</p>
      ) : (data?.ordens ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <Wrench className="h-8 w-8 text-success" />
            <p className="text-sm text-muted-foreground">Nenhuma ordem de manutenção aberta.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(data?.ordens ?? []).map((o) => {
            const e = mapa.get(o.equipment_id);
            const editando = aberta === o.id;
            return (
              <Card key={o.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex gap-3">
                    <StorageImage caminho={e?.foto_url ?? null} alt={e?.nome ?? ""} className="h-16 w-16 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{o.numero}</p>
                      <Link to="/equipamento/$id" params={{ id: o.equipment_id }} className="text-sm hover:underline">
                        {e?.nome ?? "Equipamento"} • {e?.codigo}
                      </Link>
                      <p className="text-xs text-muted-foreground">{o.problema}</p>
                      <p className="text-xs text-muted-foreground">
                        Relatado por {o.relatado_por_nome ?? "—"} em {formatarData(o.created_at)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <StatusBadge
                          label={STATUS_MANUTENCAO[o.status]?.label ?? o.status}
                          tom={STATUS_MANUTENCAO[o.status]?.tom ?? "neutral"}
                        />
                        <StatusBadge
                          label={`Prioridade ${PRIORIDADES[o.prioridade]?.label ?? o.prioridade}`}
                          tom={PRIORIDADES[o.prioridade]?.tom ?? "neutral"}
                        />
                        <span className="text-xs text-muted-foreground">Custo: {formatarMoeda(o.custo_total)}</span>
                      </div>
                      {o.diagnostico && <p className="mt-1 text-xs text-muted-foreground">Diagnóstico: {o.diagnostico}</p>}
                      {o.solucao && <p className="text-xs text-muted-foreground">Solução: {o.solucao}</p>}
                    </div>
                  </div>

                  {editando ? (
                    <div className="space-y-3 rounded-xl bg-muted/50 p-3">
                      <div className="space-y-2">
                        <Label>Diagnóstico técnico</Label>
                        <Textarea
                          value={form["diagnostico"] ?? o.diagnostico ?? ""}
                          onChange={(ev) => setForm({ ...form, diagnostico: ev.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Solução aplicada</Label>
                        <Textarea
                          value={form["solucao"] ?? o.solucao ?? ""}
                          onChange={(ev) => setForm({ ...form, solucao: ev.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Peças utilizadas</Label>
                        <Input
                          value={form["pecas"] ?? o.pecas ?? ""}
                          onChange={(ev) => setForm({ ...form, pecas: ev.target.value })}
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Valor das peças (R$)</Label>
                          <Input
                            type="number"
                            value={form["valor_pecas"] ?? String(o.valor_pecas ?? "")}
                            onChange={(ev) => setForm({ ...form, valor_pecas: ev.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Valor da mão de obra (R$)</Label>
                          <Input
                            type="number"
                            value={form["valor_mao_obra"] ?? String(o.valor_mao_obra ?? "")}
                            onChange={(ev) => setForm({ ...form, valor_mao_obra: ev.target.value })}
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => void salvar(o)}>
                          Salvar
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void salvar(o, "em_manutencao")}>
                          Iniciar manutenção
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void salvar(o, "aguardando_peca")}>
                          Aguardando peça
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void salvar(o, "concluida")}>
                          Reparado — liberar p/ conferência
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => void salvar(o, "sem_reparo")}>
                          Sem reparo
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setAberta(null)}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setAberta(o.id);
                        setForm({});
                      }}
                    >
                      Registrar diagnóstico e manutenção
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
