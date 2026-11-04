import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PInput, PPageHeader } from "@/producao/components/ui";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { StorageImage } from "@/producao/components/StorageImage";
import { STATUS_BLOQUEADOS_RETIRADA, statusLabel, situacao, formatarData } from "@/producao/lib/constants";

type Equip = { id: string; nome: string; codigo: string; status: string; foto_url: string | null; quantidade: number; quantidade_disponivel: number; marca: string | null; modelo: string | null };

export function RetirarIndexPage({ onRetirar }: { onRetirar: (id: string) => void }) {
  const [busca, setBusca] = useState("");
  const [equipamentos, setEquipamentos] = useState<Equip[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      const { data } = await supabase.from("equipment").select("id, nome, codigo, status, foto_url, quantidade, quantidade_disponivel, marca, modelo").order("nome");
      if (!c) { setEquipamentos((data ?? []) as Equip[]); setCarregando(false); }
    })();
    return () => { c = true; };
  }, []);

  const lista = equipamentos.filter((e) => {
    const t = busca.trim().toLowerCase();
    const combina = !t || [e.nome, e.codigo, e.marca, e.modelo].filter(Boolean).some((v) => String(v).toLowerCase().includes(t));
    const bloqueado = STATUS_BLOQUEADOS_RETIRADA.includes(e.status);
    const semEstoque = e.quantidade_disponivel <= 0;
    return combina && !bloqueado && !semEstoque;
  });

  return (
    <div>
      <PPageHeader title="Pegar equipamento" description="Selecione o equipamento que você vai retirar" />
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <PInput className="pl-9" placeholder="Buscar equipamento..." value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {carregando ? <p className="py-10 text-center text-sm text-slate-500">Carregando...</p> : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((e) => (
            <button key={e.id} onClick={() => onRetirar(e.id)} className="block text-left">
              <PCard className="h-full transition-shadow hover:shadow-md"><PCardBody className="flex gap-3 p-4">
                <StorageImage caminho={e.foto_url} alt={e.nome} className="h-16 w-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{e.nome}</p>
                  <p className="text-xs text-slate-500">{e.codigo}</p>
                  <div className="mt-2 flex items-center gap-2"><StatusBadge {...situacao(e.status)} /><span className="text-xs text-slate-500">{e.quantidade > 1 ? `${e.quantidade_disponivel} disp.` : ""}</span></div>
                </div>
              </PCardBody></PCard>
            </button>
          ))}
          {lista.length === 0 && <p className="py-10 text-center text-sm text-slate-500 sm:col-span-2">Nenhum equipamento disponível para retirada.</p>}
        </div>
      )}
    </div>
  );
}
