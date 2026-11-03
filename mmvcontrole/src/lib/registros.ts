import { supabase } from "@/integrations/supabase/client";

export async function registrarMovimento(dados: {
  equipment_id: string;
  tipo: string;
  responsavel_id?: string | null;
  responsavel_nome?: string | null;
  destino?: string | null;
  status?: string | null;
  detalhes?: string | null;
}) {
  await supabase.from("movements").insert(dados);
}

export async function registrarAuditoria(dados: {
  user_id?: string | null;
  user_nome?: string | null;
  tabela: string;
  registro_id?: string | null;
  acao: string;
  detalhes?: Record<string, unknown> | null;
}) {
  await supabase.from("audit_logs").insert(dados as never);
}

export async function criarNotificacao(dados: {
  user_id?: string | null;
  titulo: string;
  mensagem?: string;
  tipo?: string;
}) {
  await supabase.from("notifications").insert(dados);
}

/** Soma (delta > 0) ou subtrai (delta < 0) unidades disponíveis de um item com várias unidades. */
export async function ajustarDisponivel(equipmentId: string, delta: number, statusSemEstoque = "retirado") {
  const { data: e } = await supabase
    .from("equipment")
    .select("quantidade, quantidade_disponivel, status")
    .eq("id", equipmentId)
    .maybeSingle();
  if (!e) return;
  const novo = Math.max(0, Math.min(e.quantidade, e.quantidade_disponivel + delta));
  const livre = ["disponivel", "retirado", "aguardando_autorizacao"].includes(e.status);
  await supabase
    .from("equipment")
    .update({
      quantidade_disponivel: novo,
      ...(livre ? { status: novo > 0 ? "disponivel" : statusSemEstoque } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", equipmentId);
}
