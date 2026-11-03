import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { StorageImage } from "@/components/StorageImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STATUS_EQUIPAMENTO, formatarMoeda, statusLabel, statusTom, situacao } from "@/lib/constants";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/inventario")({
  head: () => ({
    meta: [
      { title: "Inventário — MMV Produção" },
      {
        name: "description",
        content: "Inventário completo dos equipamentos audiovisuais com busca por nome, patrimônio e número de série.",
      },
      { property: "og:title", content: "Inventário — MMV Produção" },
      { property: "og:description", content: "Inventário completo dos equipamentos audiovisuais." },
    ],
  }),
  component: Inventario,
});

function Inventario() {
  const { ehGestor } = useAuth();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [categoria, setCategoria] = useState("todas");

  const { data, isLoading } = useQuery({
    queryKey: ["inventario"],
    queryFn: async () => {
      const [equipamentos, categorias, locais] = await Promise.all([
        supabase.from("equipment").select("*").order("nome"),
        supabase.from("equipment_categories").select("id, nome").order("nome"),
        supabase.from("locations").select("id, nome"),
      ]);
      return {
        equipamentos: equipamentos.data ?? [],
        categorias: categorias.data ?? [],
        locais: locais.data ?? [],
      };
    },
  });

  const locais = new Map((data?.locais ?? []).map((l) => [l.id, l.nome]));
  const categorias = new Map((data?.categorias ?? []).map((c) => [c.id, c.nome]));

  const lista = (data?.equipamentos ?? []).filter((e) => {
    const termo = busca.trim().toLowerCase();
    const combina =
      !termo ||
      [e.nome, e.codigo, e.patrimonio, e.numero_serie, e.marca, e.modelo]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(termo));
    return (
      combina &&
      (status === "todos" || e.status === status) &&
      (categoria === "todas" || e.category_id === categoria)
    );
  });

  return (
    <AppShell
      titulo="Inventário"
      descricao={`${lista.length} equipamento(s) listado(s)`}
      acoes={
        <>
          <Button asChild size="sm" variant="secondary">
            <Link to="/equipamento/novo">
              <Plus className="h-4 w-4" /> Novo equipamento
            </Link>
          </Button>
          {ehGestor && (
            <Button asChild size="sm" variant="secondary">
              <Link to="/qrcodes">
                <QrCode className="h-4 w-4" /> Imprimir QR Codes
              </Link>
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="relative sm:col-span-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Buscar por nome, patrimônio, série ou código"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              {Object.entries(STATUS_EQUIPAMENTO).map(([valor, info]) => (
                <SelectItem key={valor} value={valor}>
                  {info.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias</SelectItem>
              {(data?.categorias ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />)}</div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {lista.map((e) => (
              <Link key={e.id} to="/equipamento/$id" params={{ id: e.id }} className="block min-w-0">
                <Card className="h-full transition-shadow hover:shadow-md">
                  <CardContent className="flex gap-3 p-4">
                    <StorageImage caminho={e.foto_url} alt={e.nome} className="h-16 w-16 shrink-0 rounded-xl sm:h-20 sm:w-20" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-bold">{e.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.codigo} • {categorias.get(e.category_id ?? "") ?? "Sem categoria"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Local: {locais.get(e.location_id ?? "") ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Responsável: {e.responsavel_atual_nome ?? "—"}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <StatusBadge {...situacao(e.status)} />
                        <span className="text-xs text-muted-foreground">
                          {e.quantidade > 1 ? `${e.quantidade_disponivel} de ${e.quantidade} disponíveis` : formatarMoeda(e.valor_estimado)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {lista.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground sm:col-span-2">
                Nenhum equipamento encontrado com esses filtros.
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
