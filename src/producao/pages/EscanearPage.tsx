import { useState } from "react";
import { QrCode, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PInput, PButton, PPageHeader } from "@/producao/components/ui";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { statusLabel, situacao } from "@/producao/lib/constants";
import { toast } from "@/producao/lib/toast";

type Equip = { id: string; nome: string; codigo: string; status: string; foto_url: string | null };

export function EscanearPage({ onNavigate }: { onNavigate: (k: string) => void }) {
  const [busca, setBusca] = useState("");
  const [equip, setEquip] = useState<Equip | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function buscar() {
    const t = busca.trim();
    if (!t) return;
    setCarregando(true);
    const { data } = await supabase.from("equipment").select("id, nome, codigo, status, foto_url").or(`codigo.ilike.%${t}%,patrimonio.ilike.%${t}%,numero_serie.ilike.%${t}%`).maybeSingle();
    setEquip((data as Equip) ?? null);
    setCarregando(false);
    if (!data) toast("Equipamento não encontrado.", "warning");
  }

  return (
    <div>
      <PPageHeader title="Ler QR Code" description="Digite o código do equipamento para buscá-lo" />
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <PInput className="pl-9" placeholder="Código, patrimônio ou série..." value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => e.key === "Enter" && buscar()} />
        </div>
        <PButton className="mt-2" onClick={() => void buscar()} loading={carregando}><QrCode className="h-4 w-4" /> Buscar</PButton>
      </div>
      {equip && (
        <PCard><PCardBody className="p-4">
          <p className="font-bold">{equip.nome}</p>
          <p className="text-sm text-slate-500">{equip.codigo}</p>
          <div className="mt-2 mb-3"><StatusBadge {...situacao(equip.status)} /></div>
          <div className="flex gap-2">
            <PButton size="sm" onClick={() => onNavigate("retirar")}>Pegar</PButton>
            <PButton size="sm" variant="secondary" onClick={() => onNavigate("devolver")}>Devolver</PButton>
          </div>
        </PCardBody></PCard>
      )}
    </div>
  );
}
