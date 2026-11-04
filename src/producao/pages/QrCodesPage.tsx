import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PPageHeader, PButton } from "@/producao/components/ui";
import { QrCodeEtiqueta } from "@/producao/components/QrCodeEtiqueta";
import { useProducaoAuth } from "@/producao/lib/auth";

type Equip = { id: string; nome: string; codigo: string };

export function QrCodesPage() {
  const { ehGestor } = useProducaoAuth();
  const [equipamentos, setEquipamentos] = useState<Equip[]>([]);
  const [carregando, setCarregando] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      const { data } = await supabase.from("equipment").select("id, nome, codigo").order("nome");
      if (!c) { setEquipamentos((data ?? []) as Equip[]); setCarregando(false); }
    })();
    return () => { c = true; };
  }, []);

  if (!ehGestor) return (
    <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
      <p className="font-medium text-slate-900">Acesso restrito</p>
      <p className="mt-2 text-sm text-slate-600">Apenas coordenadores e administradores podem imprimir QR Codes.</p>
    </div>
  );

  return (
    <div>
      <PPageHeader title="QR Codes" description="Imprima etiquetas para todos os equipamentos"
        actions={<PButton size="sm" variant="secondary" onClick={() => window.print()}>Imprimir todas</PButton>} />
      {carregando ? <p className="py-10 text-center text-sm text-slate-500">Carregando...</p> : (
        <div ref={printRef} className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {equipamentos.map((e) => (
            <PCard key={e.id}><PCardBody className="flex flex-col items-center gap-2 p-3">
              <QrCodeEtiqueta id={e.id} nome={e.nome} codigo={e.codigo} tamanho={120} />
            </PCardBody></PCard>
          ))}
          {equipamentos.length === 0 && <p className="py-10 text-center text-sm text-slate-500 sm:col-span-4">Nenhum equipamento cadastrado.</p>}
        </div>
      )}
    </div>
  );
}
