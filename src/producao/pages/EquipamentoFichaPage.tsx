import { useEffect, useState } from "react";
import { ArrowLeft, Edit2, History, Wrench, QrCode } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PButton, PInput, PLabel, PSelect, PPageHeader, PTextarea } from "@/producao/components/ui";
import { StorageImage } from "@/producao/components/StorageImage";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { QrCodeEtiqueta } from "@/producao/components/QrCodeEtiqueta";
import { STATUS_EQUIPAMENTO, situacao, formatarData, formatarMoeda, statusLabel } from "@/producao/lib/constants";
import { useProducaoAuth } from "@/producao/lib/auth";
import { toast } from "@/producao/lib/toast";

type Equip = Record<string, unknown> & { id: string; nome: string; codigo: string; status: string; foto_url: string | null; marca: string | null; modelo: string | null; patrimonio: string | null; numero_serie: string | null; category_id: string | null; location_id: string | null; estado_conservacao: string | null; valor_estimado: number | null; quantidade: number; quantidade_disponivel: number; descricao: string | null };

type Tab = "dados" | "historico" | "manutencao" | "qrcode";

export function EquipamentoFichaPage({ equipmentId, onBack }: { equipmentId: string; onBack: () => void; onNavigate: (k: string) => void }) {
  const { ehGestor } = useProducaoAuth();
  const [equip, setEquip] = useState<Equip | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [tab, setTab] = useState<Tab>("dados");
  const [editando, setEditando] = useState(false);
  const [movimentos, setMovimentos] = useState<{ id: string; tipo: string; responsavel_nome: string | null; destino: string | null; status: string | null; created_at: string }[]>([]);
  const [manutencoes, setManutencoes] = useState<{ id: string; status: string; descricao_problema: string | null; created_at: string }[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [locais, setLocais] = useState<{ id: string; nome: string }[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      const [e, m, man, cat, loc] = await Promise.all([
        supabase.from("equipment").select("*").eq("id", equipmentId).maybeSingle(),
        supabase.from("movements").select("*").eq("equipment_id", equipmentId).order("created_at", { ascending: false }).limit(50),
        supabase.from("maintenance_orders").select("*").eq("equipment_id", equipmentId).order("created_at", { ascending: false }),
        supabase.from("equipment_categories").select("id, nome"),
        supabase.from("locations").select("id, nome"),
      ]);
      if (c) return;
      const eq = e.data as Equip | null;
      setEquip(eq); setMovimentos((m.data ?? []) as typeof movimentos); setManutencoes((man.data ?? []) as typeof manutencoes);
      setCategorias(cat.data ?? []); setLocais(loc.data ?? []);
      if (eq) setForm({ nome: eq.nome, codigo: eq.codigo, marca: eq.marca ?? "", modelo: eq.modelo ?? "", patrimonio: eq.patrimonio ?? "", numero_serie: eq.numero_serie ?? "", category_id: eq.category_id ?? "", location_id: eq.location_id ?? "", status: eq.status, estado_conservacao: eq.estado_conservacao ?? "ótimo", valor_estimado: String(eq.valor_estimado ?? ""), descricao: eq.descricao ?? "" });
      setCarregando(false);
    })();
    return () => { c = true; };
  }, [equipmentId]);

  async function salvarEdicao() {
    if (!equip) return;
    setSalvando(true);
    const { error } = await supabase.from("equipment").update({
      nome: form.nome, codigo: form.codigo, marca: form.marca || null, modelo: form.modelo || null,
      patrimonio: form.patrimonio || null, numero_serie: form.numero_serie || null,
      category_id: form.category_id || null, location_id: form.location_id || null,
      status: form.status, estado_conservacao: form.estado_conservacao, valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null, descricao: form.descricao || null,
    }).eq("id", equip.id);
    setSalvando(false);
    if (error) return toast("Erro: " + error.message, "error");
    toast("Equipamento atualizado!", "success");
    setEditando(false);
    setEquip({ ...equip, nome: form.nome, codigo: form.codigo, status: form.status });
  }

  if (carregando) return <p className="py-10 text-center text-sm text-slate-500">Carregando...</p>;
  if (!equip) return <p className="py-10 text-center text-sm text-slate-500">Equipamento não encontrado.</p>;

  const tabs: { key: Tab; label: string; icon: typeof Edit2 }[] = [
    { key: "dados", label: "Dados", icon: Edit2 },
    { key: "historico", label: "Histórico", icon: History },
    { key: "manutencao", label: "Manutenção", icon: Wrench },
    { key: "qrcode", label: "QR Code", icon: QrCode },
  ];

  return (
    <div>
      <div className="mb-4"><PButton variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Voltar</PButton></div>
      <div className="mb-6 flex gap-4">
        <StorageImage caminho={equip.foto_url} alt={equip.nome} className="h-24 w-24 shrink-0 rounded-xl" />
        <div className="min-w-0 flex-1"><h1 className="text-xl font-semibold text-slate-900">{equip.nome}</h1><p className="text-sm text-slate-500">{equip.codigo}</p><div className="mt-2"><StatusBadge {...situacao(equip.status)} /></div></div>
      </div>
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {tabs.map((t) => <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t.key ? "border-[#8B2635] text-[#8B2635]" : "border-transparent text-slate-500 hover:text-slate-700"}`}><t.icon className="h-4 w-4" />{t.label}</button>)}
      </div>
      {tab === "dados" && (
        <PCard className="max-w-2xl"><PCardBody className="space-y-3">
          {editando ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><PLabel>Nome</PLabel><PInput value={form.nome ?? ""} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} /></div>
                <div><PLabel>Código</PLabel><PInput value={form.codigo ?? ""} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} /></div>
                <div><PLabel>Marca</PLabel><PInput value={form.marca ?? ""} onChange={(e) => setForm((f) => ({ ...f, marca: e.target.value }))} /></div>
                <div><PLabel>Modelo</PLabel><PInput value={form.modelo ?? ""} onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))} /></div>
                <div><PLabel>Patrimônio</PLabel><PInput value={form.patrimonio ?? ""} onChange={(e) => setForm((f) => ({ ...f, patrimonio: e.target.value }))} /></div>
                <div><PLabel>Número de série</PLabel><PInput value={form.numero_serie ?? ""} onChange={(e) => setForm((f) => ({ ...f, numero_serie: e.target.value }))} /></div>
                <div><PLabel>Categoria</PLabel><PSelect value={form.category_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}><option value="">Sem categoria</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</PSelect></div>
                <div><PLabel>Local</PLabel><PSelect value={form.location_id ?? ""} onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}><option value="">Sem local</option>{locais.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</PSelect></div>
                <div><PLabel>Status</PLabel><PSelect value={form.status ?? ""} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>{Object.entries(STATUS_EQUIPAMENTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</PSelect></div>
                <div><PLabel>Valor estimado</PLabel><PInput type="number" value={form.valor_estimado ?? ""} onChange={(e) => setForm((f) => ({ ...f, valor_estimado: e.target.value }))} /></div>
              </div>
              <div><PLabel>Descrição</PLabel><PTextarea rows={3} value={form.descricao ?? ""} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} /></div>
              <div className="flex gap-2"><PButton onClick={() => void salvarEdicao()} loading={salvando}>Salvar</PButton><PButton variant="secondary" onClick={() => setEditando(false)}>Cancelar</PButton></div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">Marca:</span> <span className="font-medium">{equip.marca ?? "—"}</span></div>
                <div><span className="text-slate-400">Modelo:</span> <span className="font-medium">{equip.modelo ?? "—"}</span></div>
                <div><span className="text-slate-400">Patrimônio:</span> <span className="font-medium">{equip.patrimonio ?? "—"}</span></div>
                <div><span className="text-slate-400">Série:</span> <span className="font-medium">{equip.numero_serie ?? "—"}</span></div>
                <div><span className="text-slate-400">Estado:</span> <span className="font-medium">{equip.estado_conservacao ?? "—"}</span></div>
                <div><span className="text-slate-400">Valor:</span> <span className="font-medium">{formatarMoeda(equip.valor_estimado)}</span></div>
                <div><span className="text-slate-400">Quantidade:</span> <span className="font-medium">{equip.quantidade_disponivel} de {equip.quantidade}</span></div>
                <div><span className="text-slate-400">Status:</span> <span className="font-medium">{statusLabel(equip.status)}</span></div>
              </div>
              {equip.descricao && <p className="text-sm text-slate-600">{equip.descricao}</p>}
              {ehGestor && <PButton size="sm" variant="secondary" onClick={() => setEditando(true)}><Edit2 className="h-4 w-4" /> Editar</PButton>}
            </>
          )}
        </PCardBody></PCard>
      )}
      {tab === "historico" && (
        <div className="space-y-2">{movimentos.map((m) => (
          <PCard key={m.id}><PCardBody className="p-3 text-sm"><p className="font-semibold">{m.tipo}</p><p className="text-xs text-slate-500">{m.responsavel_nome ?? "—"} • {formatarData(m.created_at)}{m.destino ? ` • ${m.destino}` : ""}</p></PCardBody></PCard>
        ))}{movimentos.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Sem movimentações registradas.</p>}</div>
      )}
      {tab === "manutencao" && (
        <div className="space-y-2">{manutencoes.map((m) => (
          <PCard key={m.id}><PCardBody className="p-3 text-sm"><p className="font-semibold">{statusLabel(m.status)}</p>{m.descricao_problema && <p className="text-xs text-slate-500">{m.descricao_problema}</p>}<p className="text-xs text-slate-400">{formatarData(m.created_at)}</p></PCardBody></PCard>
        ))}{manutencoes.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Sem ordens de manutenção.</p>}</div>
      )}
      {tab === "qrcode" && (
        <div className="flex flex-col items-center gap-4">
          <QrCodeEtiqueta id={equip.id} nome={equip.nome} codigo={equip.codigo} tamanho={180} />
          <PButton variant="secondary" onClick={() => window.print()}>Imprimir etiqueta</PButton>
        </div>
      )}
    </div>
  );
}
