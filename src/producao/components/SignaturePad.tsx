import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Eraser } from "lucide-react";
import { PButton, PLabel } from "@/producao/components/ui";

export function SignaturePad({
  valor,
  onChange,
  titulo = "Assinatura digital",
}: {
  valor: string | null;
  onChange: (dataUrl: string | null) => void;
  titulo?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const [temTraco, setTemTraco] = useState(Boolean(valor));

  function contexto(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1f2937";
    return ctx;
  }

  function posicao(evento: ReactPointerEvent<HTMLCanvasElement>) {
    const rect = evento.currentTarget.getBoundingClientRect();
    return { x: evento.clientX - rect.left, y: evento.clientY - rect.top };
  }

  function limpar() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTemTraco(false);
    onChange(null);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <PLabel>{titulo}</PLabel>
        <PButton variant="ghost" size="sm" onClick={limpar}>
          <Eraser className="h-4 w-4" /> Limpar
        </PButton>
      </div>
      <canvas
        ref={(el) => {
          canvasRef.current = el;
          if (el && el.width === 0) {
            el.width = el.offsetWidth * 2;
            el.height = el.offsetHeight * 2;
            const ctx = el.getContext("2d");
            ctx?.scale(2, 2);
            contexto(el);
          }
        }}
        className="h-36 w-full touch-none rounded-xl border border-dashed border-slate-300 bg-white"
        onPointerDown={(e) => {
          desenhando.current = true;
          const ctx = contexto(e.currentTarget);
          const p = posicao(e);
          ctx?.beginPath();
          ctx?.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!desenhando.current) return;
          const ctx = contexto(e.currentTarget);
          const p = posicao(e);
          ctx?.lineTo(p.x, p.y);
          ctx?.stroke();
          setTemTraco(true);
        }}
        onPointerUp={(e) => {
          if (!desenhando.current) return;
          desenhando.current = false;
          onChange(e.currentTarget.toDataURL("image/png"));
        }}
        onPointerLeave={(e) => {
          if (!desenhando.current) return;
          desenhando.current = false;
          onChange(e.currentTarget.toDataURL("image/png"));
        }}
      />
      <p className="text-xs text-slate-500">
        {temTraco || valor ? "Assinatura registrada." : "Assine com o dedo ou com o mouse no espaço acima."}
      </p>
    </div>
  );
}
