import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Boxes, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { STATUS_BLOQUEADOS_RETIRADA, statusLabel, statusTom, situacao } from "@/lib/constants";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/kits")({
  head: () => ({
    meta: [
      { title: "Kits de equipamentos — MMV Produção" },
      { name: "description", content: "Monte kits de câmera, transmissão, áudio e iluminação e confira item por item." },
      { property: "og:title", content: "Kits de equipamentos — MMV Produção" },
      { property: "og:description", content: "Kits prontos para retirada da equipe de produção." },
    ],
  }),
  component: Kits,
});

function Kits() {
  const queryClient = useQueryClient();
  const { ehGestor } = useAuth();
  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [itens, setItens] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["kits"],
    queryFn: async () => {
      const [kits, kitItens, equipamentos] = await Promise.all([
        supabase.from("kits").select("*").order("nome"),
        supabase.from("kit_items").select("*"),
        supabase.from("equipment").select("id, nome, codigo, status").order("nome"),
      ]);
      return {
        kits: kits.data ?? [],
        kitItens: kitItens.data ?? [],
        equipamentos: equipamentos.data ?? [],
      };
    },
  });

  const mapa = new Map((data?.equipamentos ?? []).map((e) => [e.id, e]));

  async function criarKit(ev: React.FormEvent) {
    ev.preventDefault();
    const selecionados = Object.entries(itens).filter(([, v]) => v).map(([id]) => id);
    if (selecionados.length === 0) {
      toast.error("Selecione ao menos um equipamento para o kit");
      return;
    }
    const { data: kit, error } = await supabase.from("kits").insert({ nome, descricao: descricao || null }).select().single();
    if (error) {
      toast.error("Não foi possível criar o kit");
      return;
    }
    await supabase.from("kit_items").insert(selecionados.map((equipment_id) => ({ kit_id: kit.id, equipment_id })));
    toast.success("Kit criado");
    setNovo(false);
    setNome("");
    setDescricao("");
    setItens({});
    void queryClient.invalidateQueries();
  }

  return (
    <AppShell
      titulo="Kits"
      descricao="Conjuntos prontos para retirada com conferência item por item"
      acoes={
        ehGestor ? (
          <Button size="sm" variant="secondary" onClick={() => setNovo(!novo)}>
            <Plus className="h-4 w-4" /> Montar kit
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {novo && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Montar novo kit</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={(ev) => void criarKit(ev)}>
                <div className="space-y-2">
                  <Label>Nome do kit *</Label>
                  <Input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Kit Live" />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                </div>
                <div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2">
                  {(data?.equipamentos ?? []).map((e) => (
                    <label key={e.id} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                      <Checkbox
                        checked={Boolean(itens[e.id])}
                        onCheckedChange={(v) => setItens({ ...itens, [e.id]: Boolean(v) })}
                      />
                      <span className="truncate">
                        {e.codigo} — {e.nome}
                      </span>
                    </label>
                  ))}
                </div>
                <Button type="submit">Salvar kit</Button>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Carregando kits...</p>
        ) : (data?.kits ?? []).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <Boxes className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Nenhum kit montado ainda.</p>
            </CardContent>
          </Card>
        ) : (
          (data?.kits ?? []).map((kit) => {
            const listaItens = (data?.kitItens ?? []).filter((i) => i.kit_id === kit.id);
            const indisponiveis = listaItens.filter((i) => {
              const e = mapa.get(i.equipment_id);
              return e && STATUS_BLOQUEADOS_RETIRADA.includes(e.status);
            }).length;
            return (
              <Card key={kit.id}>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <p className="font-bold">{kit.nome}</p>
                    <p className="text-xs text-muted-foreground">{kit.descricao ?? "Sem descrição"}</p>
                    <p className="text-xs text-muted-foreground">
                      {listaItens.length} item(ns) • {indisponiveis} indisponível(is)
                    </p>
                  </div>
                  <div className="space-y-2">
                    {listaItens.map((i) => {
                      const e = mapa.get(i.equipment_id);
                      if (!e) return null;
                      const bloqueado = STATUS_BLOQUEADOS_RETIRADA.includes(e.status);
                      return (
                        <div key={i.id} className="flex items-center gap-2 rounded-xl border border-border p-2">
                          <Link
                            to="/equipamento/$id"
                            params={{ id: e.id }}
                            className="min-w-0 flex-1 truncate text-sm hover:underline"
                          >
                            {e.nome} <span className="text-xs text-muted-foreground">({e.codigo})</span>
                          </Link>
                          <StatusBadge {...situacao(e.status)} />
                          {!bloqueado && (
                            <Button asChild size="sm" variant="outline">
                              <Link to="/retirar/$id" params={{ id: e.id }}>
                                Retirar
                              </Link>
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    A conferência do kit é feita item por item: registre a retirada de cada equipamento da lista.
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
