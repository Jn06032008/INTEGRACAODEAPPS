import { useEffect, useState } from "react";
import { Plus, Search, QrCode } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PInput, PSelect, PButton, PPageHeader } from "@/producao/components/ui";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { StorageImage } from "@/producao/components/StorageImage";
import { STATUS_EQUIPAMENTO, formatarMoeda, situacao } from "@/producao/lib/constants";
import { useProducaoAuth } from "@/producao/lib/auth";

type Equip = { id: string; nome: string; codigo: string; status: string; category_id: string | null; location_id: string | null; foto_url: string | null; patrimonio: string | null; numero_serie: string | null; marca: string | null; modelo: string | null; responsavel_atual_nome: string | null; quantidade: number; quantidade_disponivel: number; valor_estimado: number | null };

export function InventarioPage({ onOpenEquipamento, onNavigate }: { onOpenEquipamento: (id: string) => void; onNavigate: (key: string) => void }) {
  const { ehGestor } = useProducaoAuth();
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState("todos");
  const [categoria, setCategoria] = useState("todas");
  const [dados, setDados] = useState<{ equipamentos: Equip[]; categorias: { id: string; nome: string }[]; locais: { id: string; nome: string }[] } | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      const [eq, cat, loc] = await Promise.all([
        supabase.from("equipment").select("*").order("nome"),
        supabase.from("equipment_categories").select("id, nome").order("nome"),
        supabase.from("locations").select("id, nome"),
      ]);
      if (!c) { setDados({ equipamentos: (eq.data ?? []) as Equip[], categorias: cat.data ?? [], locais: loc.data ?? [] }); setCarregando(false); }
    })();
    return () => { c = true; };
  }, []);

  const locais = new Map((dados?.locais ?? []).map((l) => [l.id, l.nome]));
  const categorias = new Map((dados?.categorias ?? []).map((c) => [c.id, c.nome]));

  const lista = (dados?.equipamentos ?? []).filter((e) => {
    const t = busca.trim().toLowerCase();
    const combina = !t || [e.nome, e.codigo, e.patrimonio, e.numero_serie, e.marca, e.modelo].filter(Boolean).some((v) => String(v).toLowerCase().includes(t));
    return combina && (status === "todos" || e.status === status) && (categoria === "todas" || e.category_id === categoria);
  });

  return (
    <div>
      <PPageHeader title="Inventário" description={`${lista.length} equipamento(s) listado(s)`}
        actions={<><PButton size="sm" variant="secondary" onClick={() => onNavigate("equipamento-novo")}><Plus className="h-4 w-4" /> Novo</PButton>{ehGestor && <PButton size="sm" variant="secondary" onClick={() => onNavigate("qrcodes")}><QrCode className="h-4 w-4" /> QR Codes</PButton>}</>}
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div className="relative sm:col-span-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <PInput className="pl-9" placeholder="Buscar por nome, patrimônio, série ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <PSelect value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="todos">Todos os status</option>
          {Object.entries(STATUS_EQUIPAMENTO).map(([v, i]) => <option key={v} value={v}>{i.label}</option>)}
        </PSelect>
        <PSelect value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="todas">Todas as categorias</option>
          {(dados?.categorias ?? []).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
        </PSelect>
      </div>

      {carregando ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((e) => (
            <button key={e.id} onClick={() => onOpenEquipamento(e.id)} className="block min-w-0 text-left">
              <PCard className="h-full transition-shadow hover:shadow-md"><PCardBody className="flex gap-3 p-4">
                <StorageImage caminho={e.foto_url} alt={e.nome} className="h-16 w-16 shrink-0 rounded-xl sm:h-20 sm:w-20" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold">{e.nome}</p>
                  <p className="text-xs text-slate-500">{e.codigo} • {categorias.get(e.category_id ?? "") ?? "Sem categoria"}</p>
                  <p className="mt-1 text-xs text-slate-500">Local: {locais.get(e.location_id ?? "") ?? "—"}</p>
                  <p className="text-xs text-slate-500">Responsável: {e.responsavel_atual_nome ?? "—"}</p>
                  <div className="mt-2 flex items-center gap-2"><StatusBadge {...situacao(e.status)} /><span className="text-xs text-slate-500">{e.quantidade > 1 ? `${e.quantidade_disponivel} de ${e.quantidade} disponíveis` : formatarMoeda(e.valor_estimado)}</span></div>
                </div>
              </PCardBody></PCard>
            </button>
          ))}
          {lista.length === 0 && <p className="py-10 text-center text-sm text-slate-500 sm:col-span-2">Nenhum equipamento encontrado com esses filtros.</p>}
        </div>
      )}
    </div>
  );
}
