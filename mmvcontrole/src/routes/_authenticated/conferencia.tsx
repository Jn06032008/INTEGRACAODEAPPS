import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StorageImage } from "@/components/StorageImage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CONDICOES_DEVOLUCAO, formatarData } from "@/lib/constants";
import { nomeUsuario, useAuth } from "@/lib/auth";
import { criarNotificacao, registrarAuditoria, registrarMovimento } from "@/lib/registros";

export const Route = createFileRoute("/_authenticated/conferencia")({
  head: () => ({
    meta: [
      { title: "Conferência de devoluções — MMV Produção" },
      {
        name: "description",
        content: "Segunda etapa do fluxo: a coordenação confere a devolução e libera o equipamento.",
      },
      { property: "og:title", content: "Conferência de devoluções — MMV Produção" },
      { property: "og:description", content: "Conferência das devoluções registradas pela equipe." },
    ],
  }),
  component: Conferencia,
});

const DESTINOS: { valor: string; label: string; status: string }[] = [
  { valor: "disponivel", label: "Aprovar e liberar", status: "disponivel" },
  { valor: "precisa_limpeza", label: "Enviar para limpeza", status: "precisa_limpeza" },
  { valor: "precisa_revisao", label: "Enviar para revisão", status: "precisa_revisao" },
  { valor: "manutencao_interna", label: "Abrir manutenção interna", status: "manutencao_interna" },
  { valor: "aguardando_envio_assistencia", label: "Enviar para assistência", status: "aguardando_envio_assistencia" },
  { valor: "item_faltante", label: "Registrar item faltante", status: "aguardando_liberacao" },
];

function Conferencia() {
  const queryClient = useQueryClient();
  const { user, perfil, ehGestor } = useAuth();
  const [observacoes, setObservacoes] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["conferencia"],
    queryFn: async () => {
      const { data: devolucoes } = await supabase
        .from("returns")
        .select("*")
        .eq("status", "aguardando_conferencia")
        .order("devolvido_em", { ascending: false });
      const ids = [...new Set((devolucoes ?? []).map((d) => d.equipment_id))];
      const { data: equipamentos } = ids.length
        ? await supabase.from("equipment").select("id, nome, codigo, foto_url, status, quantidade").in("id", ids)
        : { data: [] };
      return { devolucoes: devolucoes ?? [], equipamentos: equipamentos ?? [] };
    },
  });

  const mapaEquipamentos = new Map((data?.equipamentos ?? []).map((e) => [e.id, e]));

  async function conferir(
    devolucao: { id: string; equipment_id: string },
    destino: (typeof DESTINOS)[number],
  ) {
    if (!ehGestor) {
      toast.error("Somente coordenação ou administração pode conferir devoluções");
      return;
    }
    const returnId = devolucao.id;
    const equipmentId = devolucao.equipment_id;
    const equipamento = mapaEquipamentos.get(equipmentId);
    const meuNome = nomeUsuario(perfil, user);
    const observacao = observacoes[returnId] ?? null;

    const { error } = await supabase.from("inspections").insert({
      return_id: returnId,
      equipment_id: equipmentId,
      conferido_por_id: user?.id ?? null,
      conferido_por_nome: meuNome,
      resultado: destino.valor === "disponivel" ? "aprovado" : "com_pendencia",
      destino: destino.valor,
      observacoes: observacao,
    });
    if (error) {
      toast.error("Não foi possível registrar a conferência");
      return;
    }

    await supabase.from("returns").update({ status: "conferida" }).eq("id", returnId);
    if ((equipamento?.quantidade ?? 1) <= 1 || destino.valor !== "disponivel") {
      await supabase
        .from("equipment")
        .update({ status: destino.status, updated_at: new Date().toISOString() })
        .eq("id", equipmentId);
    }

    if (destino.valor === "precisa_limpeza" || destino.valor === "precisa_revisao") {
      await supabase.from("cleaning_orders").insert({
        equipment_id: equipmentId,
        tipo: destino.valor === "precisa_limpeza" ? "limpeza" : "revisao",
        motivo: observacao ?? "Definido na conferência da devolução",
        responsavel_nome: meuNome,
        status: "aguardando",
      });
    }
    if (destino.valor === "manutencao_interna" || destino.valor === "aguardando_envio_assistencia") {
      await supabase.from("maintenance_orders").insert({
        equipment_id: equipmentId,
        problema: observacao ?? "Pendência identificada na conferência da devolução",
        relatado_por_id: user?.id ?? null,
        relatado_por_nome: meuNome,
        prioridade: "normal",
        status: "aguardando_avaliacao",
      });
    }

    await registrarMovimento({
      equipment_id: equipmentId,
      tipo: "conferencia",
      responsavel_id: user?.id ?? null,
      responsavel_nome: meuNome,
      status: destino.status,
      detalhes: `${destino.label}${observacao ? ` — ${observacao}` : ""}`,
    });
    await registrarAuditoria({
      user_id: user?.id ?? null,
      user_nome: meuNome,
      tabela: "inspections",
      registro_id: returnId,
      acao: "conferencia",
      detalhes: { destino: destino.valor },
    });
    await criarNotificacao({
      titulo: `Conferência concluída — ${equipamento?.nome ?? ""}`,
      mensagem: destino.label,
      tipo: destino.valor === "disponivel" ? "sucesso" : "atencao",
    });

    toast.success(destino.valor === "disponivel" ? "Equipamento liberado como disponível" : destino.label);
    void queryClient.invalidateQueries();
  }

  return (
    <AppShell
      titulo="Conferência de devoluções"
      descricao="Segunda etapa: a coordenação confere e libera o equipamento"
    >
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando devoluções...</p>
      ) : (data?.devolucoes ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-success" />
            <p className="text-sm text-muted-foreground">Nenhuma devolução aguardando conferência.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(data?.devolucoes ?? []).map((d) => {
            const equipamento = mapaEquipamentos.get(d.equipment_id);
            const condicao = CONDICOES_DEVOLUCAO[d.condicao];
            const fotos = (d.fotos as string[] | null) ?? [];
            return (
              <Card key={d.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex gap-3">
                    <StorageImage
                      caminho={equipamento?.foto_url ?? null}
                      alt={equipamento?.nome ?? ""}
                      className="h-16 w-16 shrink-0 rounded-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/equipamento/$id"
                        params={{ id: d.equipment_id }}
                        className="font-bold hover:underline"
                      >
                        {equipamento?.nome ?? "Equipamento"}
                      </Link>
                      <p className="text-xs text-muted-foreground">{equipamento?.codigo}</p>
                      <p className="text-xs text-muted-foreground">
                        Devolvido por {d.devolvido_por_nome} em {formatarData(d.devolvido_em)}
                      </p>
                      <p className="text-xs font-semibold">{condicao?.label ?? d.condicao}</p>
                      {d.relato && <p className="text-xs text-muted-foreground">Relato: {d.relato}</p>}
                      {d.acessorios_faltando && (
                        <p className="text-xs text-danger">Faltando: {d.acessorios_faltando}</p>
                      )}
                    </div>
                  </div>

                  {fotos.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {fotos.map((f) => (
                        <StorageImage key={f} caminho={f} alt="Foto da devolução" className="aspect-square w-full rounded-lg" />
                      ))}
                    </div>
                  )}

                  <Textarea
                    placeholder="Observações da conferência (obrigatório quando houver pendência)"
                    value={observacoes[d.id] ?? ""}
                    onChange={(ev) => setObservacoes({ ...observacoes, [d.id]: ev.target.value })}
                  />

                  <div className="grid gap-2 sm:grid-cols-3">
                    {DESTINOS.map((destino) => (
                      <Button
                        key={destino.valor}
                        size="sm"
                        variant={destino.valor === "disponivel" ? "default" : "outline"}
                        disabled={!ehGestor}
                        onClick={() => void conferir(d, destino)}
                      >
                        {destino.label}
                      </Button>
                    ))}
                  </div>
                  {!ehGestor && (
                    <p className="text-xs text-muted-foreground">
                      Somente a coordenação de produção ou a administração pode concluir a conferência.
                    </p>
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
