import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PButton, PInput, PTextarea, PLabel, PSelect, PPageHeader } from "@/producao/components/ui";
import { StorageImage } from "@/producao/components/StorageImage";
import { PhotoUpload } from "@/producao/components/PhotoUpload";
import { SignaturePad } from "@/producao/components/SignaturePad";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { statusLabel, situacao } from "@/producao/lib/constants";
import { useProducaoAuth, nomeUsuario } from "@/producao/lib/auth";
import { registrarMovimento, ajustarDisponivel, registrarAuditoria, criarNotificacao } from "@/producao/lib/registros";
import { toast } from "@/producao/lib/toast";

type Equip = { id: string; nome: string; codigo: string; status: string; foto_url: string | null; quantidade: number; quantidade_disponivel: number; acessorios_padrao: string[] | null };
type Acessorio = { id: string; nome: string };

export function RetirarFormPage({ equipmentId, onBack }: { equipmentId: string; onBack: () => void; onNavigate: (k: string) => void }) {
  const { user, perfil } = useProducaoAuth();
  const [equip, setEquip] = useState<Equip | null>(null);
  const [acessorios, setAcessorios] = useState<Acessorio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [destino, setDestino] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [previsao, setPrevisao] = useState("");
  const [acessoriosSel, setAcessoriosSel] = useState<Record<string, boolean>>({});
  const [fotos, setFotos] = useState<string[]>([]);
  const [assinatura, setAssinatura] = useState<string | null>(null);
  const [termo, setTermo] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      const [{ data: e }, { data: acc }] = await Promise.all([
        supabase.from("equipment").select("*").eq("id", equipmentId).maybeSingle(),
        supabase.from("equipment_accessories").select("id, nome").eq("equipment_id", equipmentId),
      ]);
      if (c) return;
      setEquip((e as Equip) ?? null);
      setAcessorios((acc ?? []) as Acessorio[]);
      setResponsavel(nomeUsuario(perfil, user));
      setCarregando(false);
    })();
    return () => { c = true; };
  }, [equipmentId]);

  async function salvar() {
    if (!equip || !user) return;
    if (!destino.trim()) return toast("Informe o destino da retirada.", "warning");
    if (!previsao) return toast("Informe a previsão de devolução.", "warning");
    if (!termo) return toast("Você precisa aceitar o termo de responsabilidade.", "warning");
    if (!assinatura) return toast("Assine para confirmar a retirada.", "warning");
    setEnviando(true);
    try {
      const numero = `RET-${Date.now().toString().slice(-6)}`;
      const { data: checkout, error } = await supabase.from("checkouts").insert({
        numero, equipment_id: equip.id, responsavel_id: user.id, responsavel_nome: responsavel,
        destino, previsao_devolucao: previsao, status: "aberta",
        acessorios: Object.entries(acessoriosSel).filter(([, v]) => v).map(([k]) => k),
        fotos_antes: fotos, assinatura_antes: assinatura,
      }).select().single();
      if (error) throw error;
      await ajustarDisponivel(equip.id, -1, "retirado");
      await supabase.from("equipment").update({ status: "retirado", responsavel_atual_id: user.id, responsavel_atual_nome: responsavel }).eq("id", equip.id);
      await registrarMovimento({ equipment_id: equip.id, tipo: "retirada", responsavel_id: user.id, responsavel_nome: responsavel, destino, status: "retirado", detalhes: `Checkout ${numero}` });
      await registrarAuditoria({ user_id: user.id, user_nome: responsavel, tabela: "checkouts", registro_id: checkout.id, acao: "retirada", detalhes: { numero, destino, previsao } });
      await criarNotificacao({ user_id: user.id, titulo: "Retirada registrada", mensagem: `${equip.nome} retirado por ${responsavel}`, tipo: "retirada" });
      toast("Retirada registrada com sucesso!", "success");
      onBack();
    } catch (err) {
      toast("Erro ao registrar retirada: " + (err as Error).message, "error");
    } finally { setEnviando(false); }
  }

  if (carregando) return <p className="py-10 text-center text-sm text-slate-500">Carregando...</p>;
  if (!equip) return <p className="py-10 text-center text-sm text-slate-500">Equipamento não encontrado.</p>;

  return (
    <div>
      <div className="mb-4"><PButton variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Voltar</PButton></div>
      <PPageHeader title="Retirar equipamento" description={equip.nome} />
      <div className="grid gap-4 lg:grid-cols-3">
        <PCard className="lg:col-span-1"><PCardBody>
          <StorageImage caminho={equip.foto_url} alt={equip.nome} className="mb-3 h-40 w-full rounded-xl" />
          <p className="font-bold">{equip.nome}</p>
          <p className="text-sm text-slate-500">{equip.codigo}</p>
          <div className="mt-2"><StatusBadge {...situacao(equip.status)} /></div>
        </PCardBody></PCard>

        <PCard className="lg:col-span-2"><PCardBody className="space-y-4">
          <div><PLabel>Quem está retirando</PLabel><PInput value={responsavel} onChange={(e) => setResponsavel(e.target.value)} /></div>
          <div><PLabel>Destino / finalidade</PLabel><PInput value={destino} onChange={(e) => setDestino(e.target.value)} placeholder="Ex: Culto de domingo" /></div>
          <div><PLabel>Previsão de devolução</PLabel><PInput type="datetime-local" value={previsao} onChange={(e) => setPrevisao(e.target.value)} /></div>

          {acessorios.length > 0 && (
            <div><PLabel>Acessórios inclusos</PLabel>
              <div className="space-y-2">{acessorios.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!acessoriosSel[a.id]} onChange={(e) => setAcessoriosSel((s) => ({ ...s, [a.id]: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-[#8B2635]" />{a.nome}</label>
              ))}</div>
            </div>
          )}

          <PhotoUpload pasta={`checkouts/${equipmentId}`} valor={fotos} onChange={setFotos} titulo="Fotos no momento da retirada" />
          <div><PLabel>Assinatura</PLabel><SignaturePad onChange={setAssinatura} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={termo} onChange={(e) => setTermo(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#8B2635]" />Declaro que estou retirando o equipamento em perfeito estado e me comprometo a devolvê-lo na data prevista.</label>
          <PButton onClick={() => void salvar()} loading={enviando} className="w-full">Confirmar retirada</PButton>
        </PCardBody></PCard>
      </div>
    </div>
  );
}
