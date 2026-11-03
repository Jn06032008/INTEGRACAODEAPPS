import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatarData, statusLabel } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/movimentacoes")({
  head: () => ({
    meta: [
      { title: "Movimentações — MMV Produção" },
      { name: "description", content: "Histórico completo de retiradas, devoluções, conferências e mudanças de situação." },
      { property: "og:title", content: "Movimentações — MMV Produção" },
      { property: "og:description", content: "Histórico completo das movimentações de equipamentos." },
    ],
  }),
  component: Movimentacoes,
});

const TIPOS = ["todos", "retirada", "devolucao", "conferencia", "status", "cadastro", "manutencao"];

function Movimentacoes() {
  const [tipo, setTipo] = useState("todos");
  const [busca, setBusca] = useState("");

  const { data } = useQuery({
    queryKey: ["movimentacoes"],
    queryFn: async () => {
      const { data: movimentos } = await supabase
        .from("movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      const ids = [...new Set((movimentos ?? []).map((m) => m.equipment_id).filter(Boolean))] as string[];
      const { data: equipamentos } = ids.length
        ? await supabase.from("equipment").select("id, nome, codigo").in("id", ids)
        : { data: [] };
      return { movimentos: movimentos ?? [], equipamentos: equipamentos ?? [] };
    },
  });

  const mapa = new Map((data?.equipamentos ?? []).map((e) => [e.id, e]));
  const termo = busca.trim().toLowerCase();
  const lista = (data?.movimentos ?? []).filter((m) => {
    const e = m.equipment_id ? mapa.get(m.equipment_id) : null;
    const combina =
      !termo ||
      [e?.nome, e?.codigo, m.responsavel_nome, m.detalhes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termo));
    return combina && (tipo === "todos" || m.tipo === tipo);
  });

  return (
    <AppShell titulo="Movimentações" descricao={`${lista.length} registro(s) no histórico`}>
      <div className="space-y-4">
        <Input placeholder="Buscar por equipamento, responsável ou detalhe" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <div className="flex flex-wrap gap-2">
          {TIPOS.map((t) => (
            <Button key={t} size="sm" variant={tipo === t ? "default" : "outline"} onClick={() => setTipo(t)}>
              {t === "todos" ? "Todos" : t.charAt(0).toUpperCase() + t.slice(1)}
            </Button>
          ))}
        </div>
        <div className="space-y-2">
          {lista.map((m) => {
            const e = m.equipment_id ? mapa.get(m.equipment_id) : null;
            return (
              <Card key={m.id}>
                <CardContent className="p-3">
                  {e ? (
                    <Link to="/equipamento/$id" params={{ id: e.id }} className="text-sm font-bold hover:underline">
                      {e.nome}
                    </Link>
                  ) : (
                    <p className="text-sm font-bold">Equipamento removido</p>
                  )}
                  <p className="text-xs capitalize text-muted-foreground">
                    {m.tipo.replaceAll("_", " ")} • {formatarData(m.created_at)} • {m.responsavel_nome ?? "—"}
                  </p>
                  {m.status && <p className="text-xs text-muted-foreground">Situação: {statusLabel(m.status)}</p>}
                  {m.detalhes && <p className="text-xs text-muted-foreground">{m.detalhes}</p>}
                </CardContent>
              </Card>
            );
          })}
          {lista.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma movimentação encontrada.</p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
