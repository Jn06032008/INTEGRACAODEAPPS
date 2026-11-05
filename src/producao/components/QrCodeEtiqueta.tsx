import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { APP_NOME } from "@/producao/lib/constants";

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
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void QRCode.toDataURL(id, { width: tamanho * 2, margin: 1 }).then((url) => {
      if (ativo) setDataUrl(url);
    });
    return () => {
      ativo = false;
    };
  }, [id, tamanho]);

  return (
    <div className="flex w-full flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white p-3 text-center">
      {dataUrl ? (
        <img src={dataUrl} alt={`QR Code de ${nome}`} style={{ width: tamanho, height: tamanho }} />
      ) : (
        <div style={{ width: tamanho, height: tamanho }} className="animate-pulse rounded bg-slate-100" />
      )}
      <p className="text-xs font-bold leading-tight text-slate-900">{nome}</p>
      <p className="text-[11px] text-slate-500">{codigo}</p>
      <p className="text-[9px] uppercase tracking-wide text-slate-400">{APP_NOME}</p>
    </div>
  );
}
