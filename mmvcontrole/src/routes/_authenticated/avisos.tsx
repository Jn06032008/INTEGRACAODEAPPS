import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { formatarData } from "@/lib/constants";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/avisos")({
  head: () => ({
    meta: [
      { title: "Avisos — MMV Produção" },
      {
        name: "description",
        content: "Central de avisos do controle de equipamentos: autorizações, devoluções, conferências e manutenções.",
      },
      { property: "og:title", content: "Avisos — MMV Produção" },
      { property: "og:description", content: "Central de avisos do controle de equipamentos." },
    ],
  }),
  component: Avisos,
});

function tomDoTipo(tipo: string) {
  if (tipo === "alerta" || tipo === "erro") return "danger" as const;
  if (tipo === "atencao") return "warning" as const;
  if (tipo === "sucesso") return "success" as const;
  return "info" as const;
}

function Avisos() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["avisos", user?.id],
    queryFn: async () => {
      const { data: avisos } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return avisos ?? [];
    },
  });

  const marcarLido = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      await supabase.from("notifications").update({ lida: true }).in("id", ids);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["avisos"] });
      void queryClient.invalidateQueries({ queryKey: ["avisos-nao-lidos"] });
    },
  });

  const lista = data ?? [];
  const meus = lista.filter((a) => a.user_id === user?.id);
  const naoLidos = meus.filter((a) => !a.lida);

  return (
    <AppShell
      titulo="Avisos"
      descricao={`${naoLidos.length} aviso(s) não lido(s)`}
      acoes={
        naoLidos.length > 0 ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => marcarLido.mutate(naoLidos.map((a) => a.id))}
            disabled={marcarLido.isPending}
          >
            <CheckCheck className="h-4 w-4" /> Marcar todos como lidos
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando avisos...</p>
      ) : (
        <div className="space-y-2">
          {lista.map((a) => {
            const meu = a.user_id === user?.id;
            return (
              <Card key={a.id} className={a.lida ? undefined : "border-primary/40 bg-primary/5"}>
                <CardContent className="flex flex-wrap items-start gap-3 p-4">
                  <BellRing
                    className={`mt-0.5 h-5 w-5 shrink-0 ${a.lida ? "text-muted-foreground" : "text-primary"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{a.titulo}</p>
                    {a.mensagem && <p className="text-sm text-muted-foreground">{a.mensagem}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatarData(a.created_at)}
                      {a.user_id ? "" : " • Aviso geral da equipe"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge label={a.tipo} tom={tomDoTipo(a.tipo)} />
                    {meu && !a.lida && (
                      <Button size="sm" variant="ghost" onClick={() => marcarLido.mutate([a.id])}>
                        Marcar lido
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {lista.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum aviso por aqui. Novos avisos aparecem quando houver autorização pendente,
              devolução com problema ou conferência a fazer.
            </p>
          )}
        </div>
      )}
    </AppShell>
  );
}
