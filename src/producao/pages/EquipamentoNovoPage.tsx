import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PInput, PLabel, PTextarea, PButton, PPageHeader, PSelect } from "@/producao/components/ui";
import { PhotoUpload } from "@/producao/components/PhotoUpload";
import { ESTADOS_CONSERVACAO, STATUS_EQUIPAMENTO } from "@/producao/lib/constants";
import { useProducaoAuth } from "@/producao/lib/auth";
import { registrarAuditoria } from "@/producao/lib/registros";
import { toast } from "@/producao/lib/toast";

export function EquipamentoNovoPage({ onBack }: { onBack: () => void; onNavigate: (k: string) => void }) {
  const { user } = useProducaoAuth();
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    nome: "", codigo: "", marca: "", modelo: "", patrimonio: "", numero_serie: "",
    category_id: "", location_id: "", status: "disponivel", estado_conservacao: "ótimo",
    valor_estimado: "", quantidade: "1", descricao: "",
  });
  const [fotos, setFotos] = useState<string[]>([]);
  const [categorias, setCategorias] = useState<{ id: string; nome: string }[]>([]);
  const [locais, setLocais] = useState<{ id: string; nome: string }[]>([]);

  useState(() => {
    void (async () => {
      const [c, l] = await Promise.all([
        supabase.from("equipment_categories").select("id, nome").order("nome"),
        supabase.from("locations").select("id, nome").order("nome"),
      ]);
      setCategorias(c.data ?? []); setLocais(l.data ?? []);
    })();
  });

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function salvar() {
    if (!form.nome.trim() || !form.codigo.trim()) return toast("Nome e código são obrigatórios.", "warning");
    setSalvando(true);
    try {
      const { data: eq, error } = await supabase.from("equipment").insert({
        nome: form.nome, codigo: form.codigo, marca: form.marca || null, modelo: form.modelo || null,
        patrimonio: form.patrimonio || null, numero_serie: form.numero_serie || null,
        category_id: form.category_id || null, location_id: form.location_id || null,
        status: form.status, estado_conservacao: form.estado_conservacao,
        valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
        quantidade: Number(form.quantidade) || 1, quantidade_disponivel: Number(form.quantidade) || 1,
        foto_url: fotos[0] ?? null, fotos: fotos, descricao: form.descricao || null,
      }).select().single();
      if (error) throw error;
      if (user) await registrarAuditoria({ user_id: user.id, user_nome: user.email, tabela: "equipment", registro_id: eq.id, acao: "criacao", detalhes: { nome: form.nome, codigo: form.codigo } });
      toast("Equipamento cadastrado!", "success");
      onBack();
    } catch (err) { toast("Erro: " + (err as Error).message, "error"); } finally { setSalvando(false); }
  }

  return (
    <div>
      <div className="mb-4"><PButton variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Voltar</PButton></div>
      <PPageHeader title="Novo equipamento" description="Cadastre um equipamento no inventário" />
      <PCard className="max-w-2xl"><PCardBody className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div><PLabel>Nome *</PLabel><PInput value={form.nome} onChange={(e) => set("nome", e.target.value)} /></div>
          <div><PLabel>Código *</PLabel><PInput value={form.codigo} onChange={(e) => set("codigo", e.target.value)} /></div>
          <div><PLabel>Marca</PLabel><PInput value={form.marca} onChange={(e) => set("marca", e.target.value)} /></div>
          <div><PLabel>Modelo</PLabel><PInput value={form.modelo} onChange={(e) => set("modelo", e.target.value)} /></div>
          <div><PLabel>Patrimônio</PLabel><PInput value={form.patrimonio} onChange={(e) => set("patrimonio", e.target.value)} /></div>
          <div><PLabel>Número de série</PLabel><PInput value={form.numero_serie} onChange={(e) => set("numero_serie", e.target.value)} /></div>
          <div><PLabel>Categoria</PLabel><PSelect value={form.category_id} onChange={(e) => set("category_id", e.target.value)}><option value="">Sem categoria</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</PSelect></div>
          <div><PLabel>Local</PLabel><PSelect value={form.location_id} onChange={(e) => set("location_id", e.target.value)}><option value="">Sem local</option>{locais.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</PSelect></div>
          <div><PLabel>Status</PLabel><PSelect value={form.status} onChange={(e) => set("status", e.target.value)}>{Object.entries(STATUS_EQUIPAMENTO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</PSelect></div>
          <div><PLabel>Estado de conservação</PLabel><PSelect value={form.estado_conservacao} onChange={(e) => set("estado_conservacao", e.target.value)}>{ESTADOS_CONSERVACAO.map((s) => <option key={s} value={s}>{s}</option>)}</PSelect></div>
          <div><PLabel>Valor estimado (R$)</PLabel><PInput type="number" value={form.valor_estimado} onChange={(e) => set("valor_estimado", e.target.value)} /></div>
          <div><PLabel>Quantidade</PLabel><PInput type="number" value={form.quantidade} onChange={(e) => set("quantidade", e.target.value)} /></div>
        </div>
        <div><PLabel>Descrição</PLabel><PTextarea rows={3} value={form.descricao} onChange={(e) => set("descricao", e.target.value)} /></div>
        <PhotoUpload pasta={`equipamentos/novo`} valor={fotos} onChange={setFotos} titulo="Fotos do equipamento" />
        <PButton onClick={() => void salvar()} loading={salvando}>Cadastrar equipamento</PButton>
      </PCardBody></PCard>
    </div>
  );
}
