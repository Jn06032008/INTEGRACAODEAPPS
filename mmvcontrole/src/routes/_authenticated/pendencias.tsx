import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Clock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { StorageImage } from "@/components/StorageImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarData, statusLabel, statusTom } from "@/lib/constants";
import { nomeUsuario, useAuth } from "@/lib/auth";
import { ajustarDisponivel, criarNotificacao, registrarAuditoria, registrarMovimento } from "@/lib/registros";

export const Route = createFileRoute("/_authenticated/pendencias")({
  head: () => ({
    meta: [
      { title: "Pendências — MMV Produção" },
      {
        name: "description",
        content: "Atrasos, avarias, autorizações e conferências que precisam de atenção da equipe.",
      },
      { property: "og:title", content: "Pendências — MMV Produção" },
      { property: "og:description", content: "Tudo que precisa de atenção no controle de equipamentos." },
    ],
  }),
  component: Pendencias,
});

const STATUS_PROBLEMA = [
  "danificado",
  "quebrado",
  "precisa_limpeza",
  "precisa_revisao",
  "manutencao_interna",
  "aguardando_envio_assistencia",
  "enviado_assistencia",
  "aguardando_retorno_assistencia",
  "aguardando_conferencia",
  "extraviado",
];

function Pendencias() {
  const queryClient = useQueryClient();
  const { user, perfil, ehGestor } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["pendencias"],
    queryFn: async () => {
      const agora = new Date().toISOString();
      const [problemas, atrasadas, autorizacoes, assistencias] = await Promise.all([
        supabase.from("equipment").select("*").in("status", STATUS_PROBLEMA).order("nome"),
        supabase
          .from("checkouts")
          .select("*")
          .eq("status", "aberta")
          .lt("previsao_devolucao", agora)
          .order("previsao_devolucao"),
        supabase
          .from("checkouts")
          .select("*")
          .eq("status", "aguardando_autorizacao")
          .order("created_at", { ascending: false }),
        supabase
          .from("technical_assistance")
          .select("*")
          .not("status", "in", "(liberado,sem_conserto,retornou)")
          .order("previsao_retorno"),
      ]);
      const ids = [
        ...new Set([
          ...(atrasadas.data ?? []).map((c) => c.equipment_id),
          ...(autorizacoes.data ?? []).map((c) => c.equipment_id),
          ...(assistencias.data ?? []).map((a) => a.equipment_id),
        ]),
      ];
      const { data: equipamentos } = ids.length
        ? await supabase.from("equipment").select("id, nome, codigo, foto_url").in("id", ids)
        : { data: [] };
      return {
        problemas: problemas.data ?? [],
        atrasadas: atrasadas.data ?? [],
        autorizacoes: autorizacoes.data ?? [],
        assistencias: assistencias.data ?? [],
        equipamentos: equipamentos ?? [],
      };
    },
  });

  const mapa = new Map((data?.equipamentos ?? []).map((e) => [e.id, e]));

  async function decidirAutorizacao(checkout: { id: string; numero: string; equipment_id: string; responsavel_nome: string; quantidade?: number }, aprovar: boolean) {
    if (!ehGestor) {
      toast.error("Somente coordenação ou administração pode autorizar retiradas");
      return;
    }
    const meuNome = nomeUsuario(perfil, user);
    await supabase
      .from("checkouts")
      .update({
        status: aprovar ? "aberta" : "recusada",
        autorizado_por_id: user?.id ?? null,
        autorizado_por_nome: meuNome,
      })
      .eq("id", checkout.id);
    const { data: eq } = await supabase
      .from("equipment")
      .select("quantidade")
      .eq("id", checkout.equipment_id)
      .maybeSingle();
    if ((eq?.quantidade ?? 1) > 1) {
      if (aprovar) {
        const { data: atual } = await supabase
          .from("equipment")
          .select("quantidade_disponivel, status")
          .eq("id", checkout.equipment_id)
          .maybeSingle();
        if (atual && atual.quantidade_disponivel === 0 && atual.status === "aguardando_autorizacao") {
          await supabase.from("equipment").update({ status: "retirado" }).eq("id", checkout.equipment_id);
        }
      } else {
        await ajustarDisponivel(checkout.equipment_id, checkout.quantidade ?? 1);
      }
    } else {
      await supabase
        .from("equipment")
        .update({
          status: aprovar ? "retirado" : "disponivel",
          quantidade_disponivel: aprovar ? 0 : 1,
          responsavel_atual_nome: aprovar ? checkout.responsavel_nome : null,
          ...(aprovar ? {} : { responsavel_atual_id: null }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", checkout.equipment_id);
    }
    await registrarMovimento({
      equipment_id: checkout.equipment_id,
      tipo: aprovar ? "autorizacao" : "recusa",
      responsavel_id: user?.id ?? null,
      responsavel_nome: meuNome,
      status: aprovar ? "retirado" : "disponivel",
      detalhes: `${checkout.numero} ${aprovar ? "autorizada" : "recusada"}`,
    });
    await registrarAuditoria({
      user_id: user?.id ?? null,
      user_nome: meuNome,
      tabela: "checkouts",
      registro_id: checkout.id,
      acao: aprovar ? "autorizacao" : "recusa",
    });
    await criarNotificacao({
      titulo: aprovar ? "Retirada autorizada" : "Retirada recusada",
      mensagem: `${checkout.numero} • ${checkout.responsavel_nome}`,
      tipo: aprovar ? "sucesso" : "atencao",
    });
    toast.success(aprovar ? "Retirada autorizada" : "Retirada recusada");
    void queryClient.invalidateQueries();
  }

  return (
    <AppShell titulo="Pendências" descricao="Atenção necessária no controle de equipamentos">
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando pendências...</p>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4 text-warning" /> Retiradas aguardando autorização
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.autorizacoes ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
              )}
              {(data?.autorizacoes ?? []).map((c) => (
                <div key={c.id} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">
                    {mapa.get(c.equipment_id)?.nome ?? "Equipamento"} • {c.numero}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Solicitado por {c.responsavel_nome} • Previsão {formatarData(c.previsao_devolucao)}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" disabled={!ehGestor} onClick={() => void decidirAutorizacao(c, true)}>
                      Autorizar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!ehGestor}
                      onClick={() => void decidirAutorizacao(c, false)}
                    >
                      Recusar
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-danger" /> Devoluções atrasadas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.atrasadas ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma devolução atrasada.</p>
              )}
              {(data?.atrasadas ?? []).map((c) => (
                <Link
                  key={c.id}
                  to="/equipamento/$id"
                  params={{ id: c.equipment_id }}
                  className="block rounded-xl border border-danger/40 bg-danger/5 p-3"
                >
                  <p className="text-sm font-semibold">{mapa.get(c.equipment_id)?.nome ?? "Equipamento"}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.responsavel_nome} • previsão vencida em {formatarData(c.previsao_devolucao)}
                  </p>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-warning" /> Equipamentos com pendência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.problemas ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma pendência aberta.</p>
              )}
              {(data?.problemas ?? []).map((e) => (
                <Link
                  key={e.id}
                  to="/equipamento/$id"
                  params={{ id: e.id }}
                  className="flex items-center gap-3 rounded-xl border border-border p-3"
                >
                  <StorageImage caminho={e.foto_url} alt={e.nome} className="h-12 w-12 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{e.nome}</span>
                    <span className="block text-xs text-muted-foreground">{e.codigo}</span>
                  </span>
                  <StatusBadge label={statusLabel(e.status)} tom={statusTom(e.status)} />
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Parados na assistência técnica</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.assistencias ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum equipamento na assistência.</p>
              )}
              {(data?.assistencias ?? []).map((a) => (
                <div key={a.id} className="rounded-xl border border-border p-3">
                  <p className="text-sm font-semibold">{mapa.get(a.equipment_id)?.nome ?? "Equipamento"}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.empresa} • protocolo {a.protocolo ?? "—"} • previsão {formatarData(a.previsao_retorno, false)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
