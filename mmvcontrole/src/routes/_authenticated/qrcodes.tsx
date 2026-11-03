import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { QrCodeEtiqueta } from "@/components/QrCodeEtiqueta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/qrcodes")({
  head: () => ({
    meta: [
      { title: "Etiquetas QR Code — MMV Produção" },
      {
        name: "description",
        content: "Gere e imprima etiquetas QR Code dos equipamentos em folha A4, no tamanho que precisar.",
      },
      { property: "og:title", content: "Etiquetas QR Code — MMV Produção" },
      { property: "og:description", content: "Impressão de etiquetas QR Code dos equipamentos." },
    ],
  }),
  component: QrCodes,
});

const TAMANHOS = [
  { valor: 96, label: "Pequeno" },
  { valor: 128, label: "Médio" },
  { valor: 176, label: "Grande" },
];

function QrCodes() {
  const [selecionados, setSelecionados] = useState<Record<string, boolean>>({});
  const [tamanho, setTamanho] = useState(128);

  const { data } = useQuery({
    queryKey: ["qrcodes"],
    queryFn: async () => {
      const { data } = await supabase.from("equipment").select("id, nome, codigo").order("nome");
      return data ?? [];
    },
  });

  const lista = data ?? [];
  const marcados = lista.filter((e) => selecionados[e.id]);

  return (
    <AppShell
      titulo="Etiquetas QR Code"
      descricao="Selecione os equipamentos e imprima em folha A4"
      acoes={
        <Button size="sm" variant="secondary" onClick={() => window.print()} disabled={marcados.length === 0}>
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
      }
    >
      <div className="space-y-4">
        <Card className="print:hidden">
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="mr-2">Tamanho da etiqueta:</Label>
              {TAMANHOS.map((t) => (
                <Button
                  key={t.valor}
                  size="sm"
                  variant={tamanho === t.valor ? "default" : "outline"}
                  onClick={() => setTamanho(t.valor)}
                >
                  {t.label}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setSelecionados(Object.fromEntries(lista.map((e) => [e.id, true])))
                }
              >
                Selecionar todos
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelecionados({})}>
                Limpar seleção
              </Button>
            </div>
            <div className="grid max-h-72 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
              {lista.map((e) => (
                <label key={e.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-border p-2 text-sm">
                  <Checkbox
                    checked={Boolean(selecionados[e.id])}
                    onCheckedChange={(v) => setSelecionados({ ...selecionados, [e.id]: Boolean(v) })}
                  />
                  <span className="truncate">
                    {e.codigo} — {e.nome}
                  </span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        {marcados.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground print:hidden">
            Selecione ao menos um equipamento para montar a folha de etiquetas.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {marcados.map((e) => (
              <QrCodeEtiqueta key={e.id} id={e.id} nome={e.nome} codigo={e.codigo} tamanho={tamanho} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
