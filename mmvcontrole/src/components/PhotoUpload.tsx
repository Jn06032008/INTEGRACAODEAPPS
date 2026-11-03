import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StorageImage } from "@/components/StorageImage";
import { enviarArquivos } from "@/lib/storage";

export function PhotoUpload({
  pasta,
  valor,
  onChange,
  titulo = "Fotos",
  obrigatorio = false,
}: {
  pasta: string;
  valor: string[];
  onChange: (caminhos: string[]) => void;
  titulo?: string;
  obrigatorio?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  async function selecionar(arquivos: FileList | null) {
    if (!arquivos || arquivos.length === 0) return;
    setEnviando(true);
    try {
      const caminhos = await enviarArquivos(Array.from(arquivos), pasta);
      onChange([...valor, ...caminhos]);
      toast.success("Foto anexada");
    } catch {
      toast.error("Não foi possível anexar a foto");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {titulo}
          {obrigatorio && <span className="text-danger"> *</span>}
        </span>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={enviando}
          onClick={() => inputRef.current?.click()}
        >
          {enviando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
          Adicionar foto
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => void selecionar(e.target.files)}
      />
      {valor.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
          Nenhuma foto anexada
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {valor.map((caminho) => (
            <div key={caminho} className="relative">
              <StorageImage caminho={caminho} alt="Foto do equipamento" className="h-24 w-full rounded-xl" />
              <button
                type="button"
                aria-label="Remover foto"
                onClick={() => onChange(valor.filter((c) => c !== caminho))}
                className="absolute right-1 top-1 rounded-full bg-danger p-1 text-danger-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
