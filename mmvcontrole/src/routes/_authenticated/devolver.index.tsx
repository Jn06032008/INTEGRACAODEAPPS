import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StorageImage } from "@/components/StorageImage";
import { Card, CardContent } from "@/components/ui/card";
import { formatarData } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/devolver/")({
  head: () => ({
    meta: [
      { title: "Devolver equipamento — MMV Produção" },
      { name: "description", content: "Equipamentos com retirada em aberto, prontos para registrar a devolução." },
      { property: "og:title", content: "Devolver equipamento — MMV Produção" },
      { property: "og:description", content: "Equipamentos com retirada em aberto." },
    ],
  }),
  component: EscolherDevolucao,
});

function EscolherDevolucao() {
  const { data } = useQuery({
    queryKey: ["retiradas-abertas"],
    queryFn: async () => {
      const { data: checkouts } = await supabase
        .from("checkouts")
        .select("*")
        .eq("status", "aberta")
        .order("previsao_devolucao");
      const ids = [...new Set((checkouts ?? []).map((c) => c.equipment_id))];
      const { data: equipamentos } = ids.length
        ? await supabase.from("equipment").select("id, nome, codigo, foto_url").in("id", ids)
        : { data: [] };
      return { checkouts: checkouts ?? [], equipamentos: equipamentos ?? [] };
    },
  });

  const mapa = new Map((data?.equipamentos ?? []).map((e) => [e.id, e]));
  const agora = Date.now();

  return (
    <AppShell titulo="Devolver equipamento" descricao="Retiradas em aberto aguardando devolução">
      <div className="space-y-3">
        {(data?.checkouts ?? []).map((c) => {
          const atrasado = c.previsao_devolucao && new Date(c.previsao_devolucao).getTime() < agora;
          const e = mapa.get(c.equipment_id);
          return (
            <Link key={c.id} to="/devolver/$id" params={{ id: c.equipment_id }} search={{ retirada: c.id }}>
              <Card className={atrasado ? "border-danger/50" : undefined}>
                <CardContent className="flex items-center gap-3 p-3">
                  <StorageImage caminho={e?.foto_url ?? null} alt={e?.nome ?? ""} className="h-14 w-14 shrink-0 rounded-xl" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{e?.nome ?? "Equipamento"}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.numero} • {c.responsavel_nome}{c.quantidade > 1 ? ` • ${c.quantidade} un.` : ""}
                    </p>
                    <p className={`text-xs ${atrasado ? "font-semibold text-danger" : "text-muted-foreground"}`}>
                      Previsão: {formatarData(c.previsao_devolucao)} {atrasado ? "• atrasada" : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {(data?.checkouts ?? []).length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma retirada em aberto.</p>
        )}
      </div>
    </AppShell>
  );
}
