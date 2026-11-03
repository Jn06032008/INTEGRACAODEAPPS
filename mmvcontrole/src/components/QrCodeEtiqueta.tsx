import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { APP_NOME } from "@/lib/constants";

export function conteudoQr(id: string) {
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  return `${origem}/equipamento/${id}`;
}

export function useQrDataUrl(id: string, tamanho = 320) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  useEffect(() => {
    let ativo = true;
    void QRCode.toDataURL(conteudoQr(id), { width: tamanho, margin: 1 }).then((url) => {
      if (ativo) setDataUrl(url);
    });
    return () => {
      ativo = false;
    };
  }, [id, tamanho]);
  return dataUrl;
}

export function QrCodeEtiqueta({
  id,
  nome,
  codigo,
  tamanho = 160,
}: {
  id: string;
  nome: string;
  codigo: string;
  tamanho?: number;
}) {
  const dataUrl = useQrDataUrl(id, tamanho * 2);
  return (
    <div className="flex w-full flex-col items-center gap-1 rounded-xl border border-border bg-card p-3 text-center">
      {dataUrl ? (
        <img src={dataUrl} alt={`QR Code de ${nome}`} style={{ width: tamanho, height: tamanho }} />
      ) : (
        <div style={{ width: tamanho, height: tamanho }} className="animate-pulse rounded bg-muted" />
      )}
      <p className="text-xs font-bold leading-tight">{nome}</p>
      <p className="text-[11px] text-muted-foreground">{codigo}</p>
      <p className="text-[9px] uppercase tracking-wide text-muted-foreground">{APP_NOME}</p>
    </div>
  );
}
