import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { StorageImage } from "@/components/StorageImage";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { STATUS_BLOQUEADOS_RETIRADA, statusLabel, statusTom, situacao } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/retirar/")({
  head: () => ({
    meta: [
      { title: "Retirar equipamento — MMV Produção" },
      { name: "description", content: "Escolha o equipamento disponível para registrar a retirada com termo de responsabilidade." },
      { property: "og:title", content: "Retirar equipamento — MMV Produção" },
      { property: "og:description", content: "Escolha o equipamento para registrar a retirada." },
    ],
  }),
  component: EscolherRetirada,
});

function EscolherRetirada() {
  const [busca, setBusca] = useState("");
  const { data } = useQuery({
    queryKey: ["equipamentos-retirada"],
    queryFn: async () => {
      const { data } = await supabase
        .from("equipment")
        .select("id, nome, codigo, patrimonio, status, foto_url")
        .order("nome");
      return data ?? [];
    },
  });

  const termo = busca.trim().toLowerCase();
  const lista = (data ?? [])
    .filter((e) => !STATUS_BLOQUEADOS_RETIRADA.includes(e.status))
    .filter((e) =>
      !termo || [e.nome, e.codigo, e.patrimonio].filter(Boolean).some((v) => String(v).toLowerCase().includes(termo)),
    );

  return (
    <AppShell titulo="Retirar equipamento" descricao="Somente equipamentos liberados aparecem nesta lista">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar equipamento"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        {lista.map((e) => (
          <Link key={e.id} to="/retirar/$id" params={{ id: e.id }}>
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-3">
                <StorageImage caminho={e.foto_url} alt={e.nome} className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{e.nome}</p>
                  <p className="text-xs text-muted-foreground">{e.codigo}</p>
                </div>
                <StatusBadge {...situacao(e.status)} />
              </CardContent>
            </Card>
          </Link>
        ))}
        {lista.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nenhum equipamento disponível para retirada agora.
          </p>
        )}
      </div>
    </AppShell>
  );
}
