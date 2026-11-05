import { supabase } from "@/lib/supabase";

export async function registrarMovimento(dados: {
  equipment_id: string;
  tipo: string;
  responsavel_id?: string | null;
  responsavel_nome?: string | null;
  destino?: string | null;
  status?: string | null;
  detalhes?: string | null;
}) {
  const { error } = await supabase.from("movements").insert(dados);
  if (error) throw error;
}

export async function registrarAuditoria(dados: {
  user_id?: string | null;
  user_nome?: string | null;
  tabela: string;
  registro_id?: string | null;
  acao: string;
  detalhes?: Record<string, unknown> | null;
}) {
  const { error } = await supabase.from("producao_auditoria").insert(dados);
  if (error) throw error;
}

export async function criarNotificacao(dados: {
  user_id?: string | null;
  titulo: string;
  mensagem?: string;
  tipo?: string;
}) {
  const { error } = await supabase.from("producao_notificacoes").insert(dados);
  if (error) throw error;
}

/** Soma (delta > 0) ou subtrai (delta < 0) unidades disponíveis de um item com várias unidades. */
export async function ajustarDisponivel(equipmentId: string, delta: number, statusSemEstoque = "retirado") {
  const { data: e, error: erroBusca } = await supabase
    .from("equipment")
    .select("quantidade, quantidade_disponivel, status")
    .eq("id", equipmentId)
    .maybeSingle();
  if (erroBusca) throw erroBusca;
  if (!e) return;
  const novo = Math.max(0, Math.min(e.quantidade, e.quantidade_disponivel + delta));
  const livre = ["disponivel", "retirado", "aguardando_autorizacao"].includes(e.status);
  const { error } = await supabase
    .from("equipment")
    .update({
      quantidade_disponivel: novo,
      ...(livre ? { status: novo > 0 ? "disponivel" : statusSemEstoque } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", equipmentId);
  if (error) throw error;
}
