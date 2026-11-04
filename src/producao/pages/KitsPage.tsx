import { useEffect, useState } from "react";
import { Plus, Boxes } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PButton, PInput, PLabel, PPageHeader, PSelect } from "@/producao/components/ui";
import { toast } from "@/producao/lib/toast";

type Kit = { id: string; nome: string; descricao: string | null };
type Equip = { id: string; nome: string; codigo: string };

export function KitsPage() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [equipamentos, setEquipamentos] = useState<Equip[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novaDesc, setNovaDesc] = useState("");
  const [itensSel, setItensSel] = useState<Record<string, boolean>>({});

  async function carregar() {
    const [{ data: k }, { data: e }] = await Promise.all([
      supabase.from("kits").select("*").order("nome"),
      supabase.from("equipment").select("id, nome, codigo").order("nome"),
    ]);
    setKits((k ?? []) as Kit[]); setEquipamentos((e ?? []) as Equip[]); setCarregando(false);
  }

  useEffect(() => { void carregar(); }, []);

  async function criarKit() {
    if (!novoNome.trim()) return toast("Informe o nome do kit.", "warning");
    const { data: kit, error } = await supabase.from("kits").insert({ nome: novoNome, descricao: novaDesc }).select().single();
    if (error) return toast("Erro: " + error.message, "error");
    const itens = Object.entries(itensSel).filter(([, v]) => v).map(([eqId]) => ({ kit_id: (kit as Kit).id, equipment_id: eqId }));
    if (itens.length > 0) await supabase.from("kit_items").insert(itens);
    toast("Kit criado!", "success");
    setNovoNome(""); setNovaDesc(""); setItensSel({}); setMostrarForm(false);
    void carregar();
  }

  if (carregando) return <p className="py-10 text-center text-sm text-slate-500">Carregando...</p>;

  return (
    <div>
      <PPageHeader title="Kits" description={`${kits.length} kit(s) cadastrado(s)`}
        actions={<PButton size="sm" onClick={() => setMostrarForm(!mostrarForm)}><Plus className="h-4 w-4" /> Novo kit</PButton>} />
      {mostrarForm && (
        <PCard className="mb-4"><PCardBody className="space-y-3">
          <div><PLabel>Nome do kit</PLabel><PInput value={novoNome} onChange={(e) => setNovoNome(e.target.value)} /></div>
          <div><PLabel>Descrição</PLabel><PInput value={novaDesc} onChange={(e) => setNovaDesc(e.target.value)} /></div>
          <div><PLabel>Equipamentos inclusos</PLabel>
            <div className="max-h-48 space-y-1 overflow-y-auto">{equipamentos.map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!itensSel[e.id]} onChange={(ev) => setItensSel((s) => ({ ...s, [e.id]: ev.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-[#8B2635]" />{e.nome} ({e.codigo})</label>
            ))}</div>
          </div>
          <PButton onClick={() => void criarKit()}>Criar kit</PButton>
        </PCardBody></PCard>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kits.map((k) => (
          <PCard key={k.id}><PCardBody className="p-4">
            <div className="flex items-center gap-2"><Boxes className="h-5 w-5 text-[#8B2635]" /><p className="font-bold">{k.nome}</p></div>
            {k.descricao && <p className="mt-1 text-sm text-slate-500">{k.descricao}</p>}
          </PCardBody></PCard>
        ))}
        {kits.length === 0 && <p className="py-10 text-center text-sm text-slate-500 sm:col-span-3">Nenhum kit cadastrado.</p>}
      </div>
    </div>
  );
}
