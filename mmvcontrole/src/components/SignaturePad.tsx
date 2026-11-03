import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1f2937";
  }, []);

  function posicao(evento: React.PointerEvent<HTMLCanvasElement>) {
    const rect = evento.currentTarget.getBoundingClientRect();
    return { x: evento.clientX - rect.left, y: evento.clientY - rect.top };
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{titulo}</Label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            const ctx = canvasRef.current?.getContext("2d");
            if (ctx && canvasRef.current) {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
            setTemTraco(false);
            onChange(null);
          }}
        >
          <Eraser className="h-4 w-4" /> Limpar
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        className="h-36 w-full touch-none rounded-xl border border-dashed border-border bg-card"
        onPointerDown={(e) => {
          desenhando.current = true;
          const ctx = e.currentTarget.getContext("2d");
          const p = posicao(e);
          ctx?.beginPath();
          ctx?.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!desenhando.current) return;
          const ctx = e.currentTarget.getContext("2d");
          const p = posicao(e);
          ctx?.lineTo(p.x, p.y);
          ctx?.stroke();
          setTemTraco(true);
        }}
        onPointerUp={(e) => {
          desenhando.current = false;
          onChange(e.currentTarget.toDataURL("image/png"));
        }}
        onPointerLeave={(e) => {
          if (!desenhando.current) return;
          desenhando.current = false;
          onChange(e.currentTarget.toDataURL("image/png"));
        }}
      />
      <p className="text-xs text-muted-foreground">
        {temTraco ? "Assinatura registrada." : "Assine com o dedo ou com o mouse no espaço acima."}
      </p>
    </div>
  );
}
