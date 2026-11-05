import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { PButton } from "@/producao/components/ui";
import { StorageImage } from "@/producao/components/StorageImage";
import { enviarArquivos } from "@/producao/lib/storage";
import { toast } from "@/producao/lib/toast";

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
      toast("Foto anexada");
    } catch {
      toast("Não foi possível anexar a foto", "error");
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">
          {titulo}
          {obrigatorio && <span className="text-red-700"> *</span>}
        </span>
        <PButton variant="secondary" size="sm" disabled={enviando} onClick={() => inputRef.current?.click()}>
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          Adicionar foto
        </PButton>
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
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
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
                className="absolute right-1 top-1 rounded-full bg-red-700 p-1 text-white"
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
