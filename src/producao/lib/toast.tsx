import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type Tom = "success" | "warning" | "error";
type Aviso = { id: number; mensagem: string; tom: Tom };

const EVENTO = "producao:toast";

export function toast(mensagem: string, tom: Tom = "success") {
  window.dispatchEvent(new CustomEvent<{ mensagem: string; tom: Tom }>(EVENTO, { detail: { mensagem, tom } }));
}

const ESTILO: Record<Tom, string> = {
  success: "bg-emerald-700 text-white",
  warning: "bg-amber-500 text-slate-950",
  error: "bg-red-700 text-white",
};

const ICONE: Record<Tom, typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

export function Toaster() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useEffect(() => {
    let proximo = 0;
    function receber(evento: Event) {
      const { mensagem, tom } = (evento as CustomEvent<{ mensagem: string; tom: Tom }>).detail;
      const id = ++proximo;
      setAvisos((atuais) => [...atuais, { id, mensagem, tom }]);
      window.setTimeout(() => setAvisos((atuais) => atuais.filter((a) => a.id !== id)), 3500);
    }
    window.addEventListener(EVENTO, receber);
    return () => window.removeEventListener(EVENTO, receber);
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {avisos.map((aviso) => {
        const Icone = ICONE[aviso.tom];
        return (
          <div
            key={aviso.id}
            role="status"
            className={`pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${ESTILO[aviso.tom]}`}
          >
            <Icone className="h-4 w-4 shrink-0" aria-hidden />
            <span>{aviso.mensagem}</span>
          </div>
        );
      })}
    </div>
  );
}
