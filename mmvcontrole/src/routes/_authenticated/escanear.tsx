import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Camera, CameraOff, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { statusLabel, statusTom, situacao } from "@/lib/constants";

export const Route = createFileRoute("/_authenticated/escanear")({
  head: () => ({
    meta: [
      { title: "Ler QR Code — MMV Produção" },
      {
        name: "description",
        content: "Leia o QR Code do equipamento para abrir a ficha, retirar ou devolver.",
      },
      { property: "og:title", content: "Ler QR Code — MMV Produção" },
      { property: "og:description", content: "Leitura de QR Code dos equipamentos audiovisuais." },
    ],
  }),
  component: Escanear,
});

function extrairIdentificador(texto: string) {
  const limpo = texto.trim();
  if (limpo.includes("/equipamento/")) {
    return limpo.split("/equipamento/")[1]?.split(/[?#]/)[0] ?? limpo;
  }
  return limpo;
}

function Escanear() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<{ stop: () => void; destroy: () => void } | null>(null);
  const [lendo, setLendo] = useState(false);
  const [busca, setBusca] = useState("");

  const { data: equipamentos } = useQuery({
    queryKey: ["equipamentos-busca"],
    queryFn: async () => {
      const { data } = await supabase
        .from("equipment")
        .select("id, nome, codigo, patrimonio, numero_serie, status")
        .order("nome");
      return data ?? [];
    },
  });

  async function abrirPorIdentificador(valor: string) {
    const identificador = extrairIdentificador(valor);
    const { data } = await supabase
      .from("equipment")
      .select("id")
      .or(`codigo.eq.${identificador},patrimonio.eq.${identificador}`)
      .maybeSingle();
    const id = data?.id ?? (identificador.length === 36 ? identificador : null);
    if (!id) {
      toast.error("Equipamento não encontrado para este código");
      return;
    }
    pararLeitura();
    navigate({ to: "/equipamento/$id", params: { id } });
  }

  function pararLeitura() {
    scannerRef.current?.stop();
    scannerRef.current?.destroy();
    scannerRef.current = null;
    setLendo(false);
  }

  async function iniciarLeitura() {
    try {
      const { default: QrScanner } = await import("qr-scanner");
      if (!videoRef.current) return;
      const scanner = new QrScanner(
        videoRef.current,
        (resultado: { data: string }) => void abrirPorIdentificador(resultado.data),
        { highlightScanRegion: true, highlightCodeOutline: true },
      );
      await scanner.start();
      scannerRef.current = scanner as unknown as { stop: () => void; destroy: () => void };
      setLendo(true);
    } catch {
      toast.error("Não foi possível acessar a câmera. Use a busca manual.");
    }
  }

  useEffect(() => () => pararLeitura(), []);

  const lista = (equipamentos ?? []).filter((e) => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return false;
    return [e.nome, e.codigo, e.patrimonio, e.numero_serie]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(termo));
  });

  return (
    <AppShell titulo="Ler QR Code" descricao="Aponte a câmera para a etiqueta do equipamento">
      <div className="space-y-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="overflow-hidden rounded-2xl bg-brand-deep">
              <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline />
            </div>
            {lendo ? (
              <Button variant="secondary" className="w-full" onClick={pararLeitura}>
                <CameraOff className="h-4 w-4" /> Parar leitura
              </Button>
            ) : (
              <Button className="w-full" size="lg" onClick={() => void iniciarLeitura()}>
                <Camera className="h-4 w-4" /> Ligar câmera
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-4">
            <p className="text-sm font-semibold">Busca manual</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Código, patrimônio, série ou nome"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              {lista.slice(0, 8).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => navigate({ to: "/equipamento/$id", params: { id: e.id } })}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-border p-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{e.nome}</span>
                    <span className="block text-xs text-muted-foreground">{e.codigo}</span>
                  </span>
                  <StatusBadge {...situacao(e.status)} />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
