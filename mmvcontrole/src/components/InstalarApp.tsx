import { useEffect, useState } from "react";
import { Download, Share, X, Smartphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function InstalarApp({ compacto = false }: { compacto?: boolean }) {
  const [evento, setEvento] = useState<PromptEvent | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [ajuda, setAjuda] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalado(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvento(e as PromptEvent);
    };
    const onInstalled = () => setInstalado(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (instalado) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-primary" /> Aplicativo instalado
      </div>
    );
  }

  async function instalar() {
    if (evento) {
      await evento.prompt();
      const r = await evento.userChoice;
      if (r.outcome === "accepted") setInstalado(true);
      setEvento(null);
    } else {
      setAjuda(true);
    }
  }

  if (compacto && !ajuda) {
    return (
      <Button type="button" size="sm" className="w-full" onClick={instalar}>
        <Download className="h-4 w-4" /> Baixar aplicativo
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-3">
        <img src="/icon-192.png" alt="" className="h-12 w-12 rounded-xl" />
        <div className="flex-1 text-left">
          <p className="font-bold text-foreground">Baixe o aplicativo</p>
          <p className="text-xs text-muted-foreground">Acesse direto da tela inicial do celular</p>
        </div>
      </div>
      <Button type="button" size="lg" className="mt-3 w-full" onClick={instalar}>
        <Download className="h-4 w-4" /> Baixar aplicativo
      </Button>

      {ajuda && (
        <div className="relative mt-3 space-y-3 rounded-xl border border-border bg-card p-4 text-left text-sm text-card-foreground shadow-sm">
          <button
            type="button"
            aria-label="Fechar"
            className="absolute right-2 top-2 text-muted-foreground"
            onClick={() => setAjuda(false)}
          >
            <X className="h-4 w-4" />
          </button>
          <div className={ios ? "order-first" : ""}>
            <p className="mb-1 font-bold text-foreground">iPhone</p>
            <ol className="list-decimal space-y-1 pl-4 text-foreground">
              <li>Abra este site no <b>Safari</b>.</li>
              <li>
                Toque em <Share className="inline h-4 w-4" /> <b>Compartilhar</b>.
              </li>
              <li>Escolha <b>"Adicionar à Tela de Início"</b>.</li>
            </ol>
          </div>
          <div>
            <p className="mb-1 font-bold text-foreground">Android</p>
            <ol className="list-decimal space-y-1 pl-4 text-foreground">
              <li>Abra este site no <b>Chrome</b>.</li>
              <li>
                Toque no menu <b>⋮</b> e escolha <b>"Instalar app"</b> ou{" "}
                <b>"Adicionar à tela inicial"</b>.
              </li>
              <li className="flex items-center gap-1">
                <Smartphone className="h-4 w-4" /> O ícone MMV aparece na tela.
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
