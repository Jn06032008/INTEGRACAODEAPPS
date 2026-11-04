import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PButton, PTextarea, PLabel, PSelect, PPageHeader } from "@/producao/components/ui";
import { StorageImage } from "@/producao/components/StorageImage";
import { PhotoUpload } from "@/producao/components/PhotoUpload";
import { SignaturePad } from "@/producao/components/SignaturePad";
import { StatusBadge } from "@/producao/components/StatusBadge";
import { CONDICOES_DEVOLUCAO, statusLabel } from "@/producao/lib/constants";
import { useProducaoAuth, nomeUsuario } from "@/producao/lib/auth";
import { registrarMovimento, ajustarDisponivel, registrarAuditoria, criarNotificacao } from "@/producao/lib/registros";
import { toast } from "@/producao/lib/toast";
import { formatarData } from "@/producao/lib/constants";

type Checkout = { id: string; numero: string; equipment_id: string; responsavel_nome: string | null; destino: string | null; previsao_devolucao: string | null; status: string; acessorios: string[] | null; fotos_antes: string[] | null };
type Equip = { id: string; nome: string; codigo: string; foto_url: string | null; status: string };

export function DevolverFormPage({ checkoutId, onBack }: { checkoutId: string; onBack: () => void; onNavigate: (k: string) => void }) {
  const { user, perfil } = useProducaoAuth();
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const [equip, setEquip] = useState<Equip | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [condicao, setCondicao] = useState("perfeito");
  const [observacoes, setObservacoes] = useState("");
  const [fotos, setFotos] = useState<string[]>([]);
  const [assinatura, setAssinatura] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    (async () => {
      const { data: co } = await supabase.from("checkouts").select("*").eq("id", checkoutId).maybeSingle();
      if (c || !co) return;
      setCheckout(co as Checkout);
      const { data: e } = await supabase.from("equipment").select("id, nome, codigo, foto_url, status").eq("id", co.equipment_id).maybeSingle();
      if (!c) { setEquip((e as Equip) ?? null); setCarregando(false); }
    })();
    return () => { c = true; };
  }, [checkoutId]);

  async function salvar() {
    if (!checkout || !equip || !user) return;
    if (!assinatura) return toast("Assine para confirmar a devolução.", "warning");
    setEnviando(true);
    try {
      const cfg = CONDICOES_DEVOLUCAO[condicao];
      const { data: ret } = await supabase.from("returns").insert({
        checkout_id: checkout.id, equipment_id: equip.id, devolvido_por_id: user.id, devolvido_por_nome: nomeUsuario(perfil, user),
        condicao, status: cfg?.pendencia ? "aguardando_conferencia" : "concluida", observacoes, fotos_depois: fotos, assinatura_devolucao: assinatura, devolvido_em: new Date().toISOString(),
      }).select().single();
      await supabase.from("checkouts").update({ status: "fechada" }).eq("id", checkout.id);
      await ajustarDisponivel(equip.id, 1, cfg?.statusEquipamento ?? "disponivel");
      await supabase.from("equipment").update({ status: cfg?.statusEquipamento ?? "disponivel", responsavel_atual_id: null, responsavel_atual_nome: null }).eq("id", equip.id);
      await registrarMovimento({ equipment_id: equip.id, tipo: "devolucao", responsavel_id: user.id, responsavel_nome: nomeUsuario(perfil, user), status: cfg?.statusEquipamento ?? "disponivel", detalhes: `Devolução ${ret?.id ?? ""}` });
      await registrarAuditoria({ user_id: user.id, user_nome: nomeUsuario(perfil, user), tabela: "returns", registro_id: ret?.id, acao: "devolucao", detalhes: { condicao, observacoes } });
      await criarNotificacao({ user_id: user.id, titulo: "Devolução registrada", mensagem: `${equip.nome} devolvido por ${nomeUsuario(perfil, user)}`, tipo: "devolucao" });
      toast("Devolução registrada!", "success");
      onBack();
    } catch (err) { toast("Erro: " + (err as Error).message, "error"); } finally { setEnviando(false); }
  }

  if (carregando) return <p className="py-10 text-center text-sm text-slate-500">Carregando...</p>;
  if (!checkout || !equip) return <p className="py-10 text-center text-sm text-slate-500">Retirada não encontrada.</p>;

  return (
    <div>
      <div className="mb-4"><PButton variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Voltar</PButton></div>
      <PPageHeader title="Devolver equipamento" description={equip.nome} />
      <div className="grid gap-4 lg:grid-cols-3">
        <PCard className="lg:col-span-1"><PCardBody>
          <StorageImage caminho={equip.foto_url} alt={equip.nome} className="mb-3 h-40 w-full rounded-xl" />
          <p className="font-bold">{equip.nome}</p>
          <p className="text-sm text-slate-500">{equip.codigo}</p>
          <p className="mt-2 text-xs text-slate-500">Retirada: {checkout.numero}</p>
          <p className="text-xs text-slate-500">Prevista: {formatarData(checkout.previsao_devolucao)}</p>
        </PCardBody></PCard>
        <PCard className="lg:col-span-2"><PCardBody className="space-y-4">
          <div><PLabel>Condição da devolução</PLabel>
            <PSelect value={condicao} onChange={(e) => setCondicao(e.target.value)}>
              {Object.entries(CONDICOES_DEVOLUCAO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </PSelect>
          </div>
          <div><PLabel>Observações</PLabel><PTextarea rows={3} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} placeholder="Descreva qualquer detalhe sobre a devolução..." /></div>
          <PhotoUpload pasta={`devolucoes/${checkout.id}`} valor={fotos} onChange={setFotos} titulo="Fotos no momento da devolução" />
          <div><PLabel>Assinatura</PLabel><SignaturePad onChange={setAssinatura} /></div>
          <PButton onClick={() => void salvar()} loading={enviando} className="w-full">Confirmar devolução</PButton>
        </PCardBody></PCard>
      </div>
    </div>
  );
}
