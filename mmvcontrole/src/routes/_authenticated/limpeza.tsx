import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PhotoUpload } from "@/components/PhotoUpload";
import { StorageImage } from "@/components/StorageImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { formatarData } from "@/lib/constants";
import { nomeUsuario, useAuth } from "@/lib/auth";
import { registrarAuditoria, registrarMovimento } from "@/lib/registros";

export const Route = createFileRoute("/_authenticated/limpeza")({
  head: () => ({
    meta: [
      { title: "Limpeza e revisão — MMV Produção" },
      { name: "description", content: "Fila de limpeza e revisão dos equipamentos com fotos antes e depois e aprovação." },
      { property: "og:title", content: "Limpeza e revisão — MMV Produção" },
      { property: "og:description", content: "Fila de limpeza e revisão dos equipamentos." },
    ],
  }),
  component: Limpeza,
});

function Limpeza() {
  const queryClient = useQueryClient();
  const { user, perfil, ehGestor } = useAuth();
  const [fotosDepois, setFotosDepois] = useState<Record<string, string[]>>({});
  const [procedimentos, setProcedimentos] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["limpeza"],
    queryFn: async () => {
      const { data: ordens } = await supabase
        .from("cleaning_orders")
        .select("*")
        .order("solicitado_em", { ascending: false });
      const ids = [...new Set((ordens ?? []).map((o) => o.equipment_id))];
      const { data: equipamentos } = ids.length
        ? await supabase.from("equipment").select("id, nome, codigo, foto_url").in("id", ids)
        : { data: [] };
      return { ordens: ordens ?? [], equipamentos: equipamentos ?? [] };
    },
  });

  const mapa = new Map((data?.equipamentos ?? []).map((e) => [e.id, e]));
  const meuNome = nomeUsuario(perfil, user);

  async function concluir(ordem: { id: string; equipment_id: string; tipo: string }) {
    const fotos = fotosDepois[ordem.id] ?? [];
    if (fotos.length === 0) {
      toast.error("Anexe as fotos do equipamento depois da limpeza");
      return;
    }
    await supabase
      .from("cleaning_orders")
      .update({
        fotos_depois: fotos,
        procedimentos: procedimentos[ordem.id] ?? null,
        concluido_em: new Date().toISOString(),
        responsavel_nome: meuNome,
        status: "aguardando_aprovacao",
      })
      .eq("id", ordem.id);
    await supabase
      .from("equipment")
      .update({ status: "aguardando_conferencia", updated_at: new Date().toISOString() })
      .eq("id", ordem.equipment_id);
    await registrarMovimento({
      equipment_id: ordem.equipment_id,
      tipo: ordem.tipo === "revisao" ? "revisao" : "limpeza",
      responsavel_id: user?.id ?? null,
      responsavel_nome: meuNome,
      status: "aguardando_conferencia",
      detalhes: `${ordem.tipo} concluída, aguardando aprovação`,
    });
    toast.success("Registrado. Aguardando aprovação da coordenação.");
    void queryClient.invalidateQueries();
  }

  async function aprovar(ordem: { id: string; equipment_id: string }) {
    if (!ehGestor) {
      toast.error("Somente coordenação ou administração pode aprovar");
      return;
    }
    await supabase
      .from("cleaning_orders")
      .update({ status: "concluida", aprovado_por: meuNome })
      .eq("id", ordem.id);
    await supabase
      .from("equipment")
      .update({ status: "disponivel", updated_at: new Date().toISOString() })
      .eq("id", ordem.equipment_id);
    await registrarMovimento({
      equipment_id: ordem.equipment_id,
      tipo: "liberacao",
      responsavel_id: user?.id ?? null,
      responsavel_nome: meuNome,
      status: "disponivel",
      detalhes: "Limpeza/revisão aprovada e equipamento liberado",
    });
    await registrarAuditoria({
      user_id: user?.id ?? null,
      user_nome: meuNome,
      tabela: "cleaning_orders",
      registro_id: ordem.id,
      acao: "aprovacao_limpeza",
    });
    toast.success("Equipamento liberado como disponível");
    void queryClient.invalidateQueries();
  }

  const abertas = (data?.ordens ?? []).filter((o) => o.status !== "concluida");
  const concluidas = (data?.ordens ?? []).filter((o) => o.status === "concluida");

  return (
    <AppShell titulo="Limpeza e revisão" descricao="Fila de limpeza, revisão e liberação dos equipamentos">
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando fila...</p>
      ) : (
        <div className="space-y-4">
          {abertas.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
                <Sparkles className="h-8 w-8 text-success" />
                <p className="text-sm text-muted-foreground">Nenhuma limpeza ou revisão na fila.</p>
              </CardContent>
            </Card>
          )}

          {abertas.map((o) => {
            const e = mapa.get(o.equipment_id);
            const antes = (o.fotos_antes as string[] | null) ?? [];
            return (
              <Card key={o.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex gap-3">
                    <StorageImage caminho={e?.foto_url ?? null} alt={e?.nome ?? ""} className="h-16 w-16 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <Link to="/equipamento/$id" params={{ id: o.equipment_id }} className="font-bold hover:underline">
                        {e?.nome ?? "Equipamento"}
                      </Link>
                      <p className="text-xs text-muted-foreground">{e?.codigo}</p>
                      <p className="text-xs capitalize text-muted-foreground">
                        {o.tipo} • solicitado em {formatarData(o.solicitado_em)}
                      </p>
                      {o.motivo && <p className="text-xs text-muted-foreground">Motivo: {o.motivo}</p>}
                      <p className="text-xs font-semibold">Situação: {o.status.replaceAll("_", " ")}</p>
                    </div>
                  </div>

                  {antes.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {antes.map((f) => (
                        <StorageImage key={f} caminho={f} alt="Antes" className="aspect-square w-full rounded-lg" />
                      ))}
                    </div>
                  )}

                  {o.status === "aguardando_aprovacao" ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Concluída por {o.responsavel_nome ?? "—"} em {formatarData(o.concluido_em)}
                      </p>
                      <Button size="sm" disabled={!ehGestor} onClick={() => void aprovar(o)}>
                        Aprovar e liberar
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <PhotoUpload
                        pasta="limpeza"
                        valor={fotosDepois[o.id] ?? []}
                        onChange={(v) => setFotosDepois({ ...fotosDepois, [o.id]: v })}
                        titulo="Fotos depois da limpeza"
                      />
                      <Textarea
                        placeholder="Produtos e procedimentos utilizados"
                        value={procedimentos[o.id] ?? ""}
                        onChange={(ev) => setProcedimentos({ ...procedimentos, [o.id]: ev.target.value })}
                      />
                      <Button size="sm" onClick={() => void concluir(o)}>
                        Concluir limpeza
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {concluidas.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Histórico concluído</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {concluidas.map((o) => (
                  <div key={o.id} className="rounded-xl border border-border p-3 text-sm">
                    <p className="font-semibold">{mapa.get(o.equipment_id)?.nome ?? "Equipamento"}</p>
                    <p className="text-xs capitalize text-muted-foreground">
                      {o.tipo} • aprovado por {o.aprovado_por ?? "—"} • {formatarData(o.concluido_em)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
