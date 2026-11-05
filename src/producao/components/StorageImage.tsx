import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { urlAssinada } from "@/producao/lib/storage";

export function StorageImage({ caminho, alt, className }: { caminho?: string | null; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    if (!caminho) {
      setUrl(null);
      return;
    }
    void urlAssinada(caminho).then((assinada) => {
      if (ativo) setUrl(assinada);
    });
    return () => {
      ativo = false;
    };
  }, [caminho]);

  if (!url) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-slate-400 ${className ?? ""}`}>
        <ImageIcon className="h-6 w-6" aria-hidden />
        <span className="sr-only">{alt}</span>
      </div>
    );
  }

  return <img src={url} alt={alt} loading="lazy" decoding="async" className={`object-cover ${className ?? ""}`} />;
}
