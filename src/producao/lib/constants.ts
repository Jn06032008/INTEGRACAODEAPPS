export const MINISTERIO = "Ministério Mudança de Vida";
export const UNIDADE = "Taquari – Bairro da Mooca, São Paulo/SP";
export const APP_NOME = "MMV Produção";
export const APP_SUBTITULO = "Controle de Equipamentos Audiovisuais";

export type Tom = "success" | "info" | "warning" | "danger" | "neutral" | "primary";

export const STATUS_EQUIPAMENTO: Record<string, { label: string; tom: Tom }> = {
  disponivel: { label: "Disponível", tom: "success" },
  reservado: { label: "Reservado", tom: "info" },
  aguardando_autorizacao: { label: "Aguardando autorização", tom: "warning" },
  retirado: { label: "Retirado", tom: "info" },
  em_uso: { label: "Em uso", tom: "info" },
  aguardando_devolucao: { label: "Aguardando devolução", tom: "warning" },
  devolucao_atrasada: { label: "Devolução atrasada", tom: "danger" },
  aguardando_conferencia: { label: "Aguardando conferência", tom: "warning" },
  precisa_limpeza: { label: "Precisa de limpeza", tom: "warning" },
  precisa_revisao: { label: "Precisa de revisão", tom: "warning" },
  danificado: { label: "Danificado", tom: "danger" },
  quebrado: { label: "Quebrado", tom: "danger" },
  manutencao_interna: { label: "Em manutenção interna", tom: "warning" },
  aguardando_envio_assistencia: { label: "Aguardando envio para assistência", tom: "warning" },
  enviado_assistencia: { label: "Enviado para assistência", tom: "danger" },
  aguardando_retorno_assistencia: { label: "Aguardando retorno da assistência", tom: "warning" },
  retornou_assistencia: { label: "Retornou da assistência", tom: "info" },
  aguardando_liberacao: { label: "Aguardando liberação", tom: "warning" },
  inativo: { label: "Inativo", tom: "neutral" },
  baixado: { label: "Baixado do patrimônio", tom: "neutral" },
  extraviado: { label: "Extraviado", tom: "danger" },
};

export const STATUS_BLOQUEADOS_RETIRADA = [
  "quebrado",
  "danificado",
  "manutencao_interna",
  "aguardando_envio_assistencia",
  "enviado_assistencia",
  "aguardando_retorno_assistencia",
  "inativo",
  "baixado",
  "extraviado",
  "retirado",
  "em_uso",
  "aguardando_conferencia",
];

export const CONDICOES_DEVOLUCAO: Record<string, { label: string; statusEquipamento: string; pendencia: boolean }> = {
  perfeito: { label: "Devolvido em perfeito estado", statusEquipamento: "aguardando_conferencia", pendencia: false },
  precisa_limpeza: { label: "Devolvido e precisa de limpeza", statusEquipamento: "precisa_limpeza", pendencia: true },
  precisa_revisao: { label: "Devolvido e precisa de revisão", statusEquipamento: "precisa_revisao", pendencia: true },
  avaria: { label: "Devolvido com avaria", statusEquipamento: "danificado", pendencia: true },
  quebrado: { label: "Devolvido quebrado", statusEquipamento: "quebrado", pendencia: true },
  acessorio_faltando: { label: "Acessório faltando", statusEquipamento: "aguardando_conferencia", pendencia: true },
  incompleto: { label: "Equipamento incompleto", statusEquipamento: "aguardando_conferencia", pendencia: true },
  avaliacao_tecnica: { label: "Necessita de avaliação técnica", statusEquipamento: "danificado", pendencia: true },
};

export const ESTADOS_CONSERVACAO = ["ótimo", "bom", "regular", "ruim"];

export const PRIORIDADES: Record<string, { label: string; tom: Tom }> = {
  baixa: { label: "Baixa", tom: "neutral" },
  normal: { label: "Normal", tom: "info" },
  alta: { label: "Alta", tom: "warning" },
  urgente: { label: "Urgente", tom: "danger" },
};

export const STATUS_MANUTENCAO: Record<string, { label: string; tom: Tom }> = {
  aguardando_avaliacao: { label: "Aguardando avaliação", tom: "warning" },
  avaliacao_iniciada: { label: "Avaliação iniciada", tom: "info" },
  aguardando_aprovacao: { label: "Aguardando aprovação", tom: "warning" },
  aguardando_peca: { label: "Aguardando peça", tom: "warning" },
  em_manutencao: { label: "Em manutenção", tom: "info" },
  concluida: { label: "Manutenção concluída", tom: "success" },
  sem_reparo: { label: "Não foi possível reparar", tom: "danger" },
  aguardando_baixa: { label: "Aguardando baixa", tom: "danger" },
};

export const STATUS_ASSISTENCIA: Record<string, { label: string; tom: Tom }> = {
  aguardando_envio: { label: "Aguardando envio", tom: "warning" },
  enviado: { label: "Enviado", tom: "info" },
  recebido: { label: "Recebido pela assistência", tom: "info" },
  em_avaliacao: { label: "Em avaliação", tom: "info" },
  aguardando_orcamento: { label: "Aguardando orçamento", tom: "warning" },
  aguardando_aprovacao: { label: "Aguardando aprovação", tom: "warning" },
  em_reparo: { label: "Em reparo", tom: "info" },
  aguardando_peca: { label: "Aguardando peça", tom: "warning" },
  pronto_retirada: { label: "Pronto para retirada", tom: "success" },
  retornou: { label: "Retornou", tom: "info" },
  em_conferencia: { label: "Em conferência", tom: "warning" },
  liberado: { label: "Liberado para uso", tom: "success" },
  sem_conserto: { label: "Sem conserto", tom: "danger" },
};

export const STATUS_RESERVA: Record<string, { label: string; tom: Tom }> = {
  confirmada: { label: "Confirmada", tom: "info" },
  em_uso: { label: "Em uso", tom: "primary" },
  concluida: { label: "Concluída", tom: "success" },
  cancelada: { label: "Cancelada", tom: "neutral" },
};

export const PAPEIS: Record<string, string> = {
  admin: "Administrador geral",
  coordenador: "Coordenador de produção",
  operador: "Operador / membro da equipe",
  tecnico: "Técnico de manutenção",
};

export function statusLabel(status?: string | null) {
  if (!status) return "—";
  return STATUS_EQUIPAMENTO[status]?.label ?? status;
}

export function statusTom(status?: string | null): Tom {
  if (!status) return "neutral";
  return STATUS_EQUIPAMENTO[status]?.tom ?? "neutral";
}

/** Situação simplificada (4 grupos) para listas rápidas. */
export function situacao(status?: string | null): { label: string; tom: Tom } {
  if (status === "disponivel" || status === "reservado") return { label: "Disponível", tom: "success" };
  if (["retirado", "em_uso", "aguardando_devolucao", "aguardando_autorizacao"].includes(status ?? ""))
    return { label: "Em uso", tom: "info" };
  if (status === "devolucao_atrasada") return { label: "Em uso (atrasado)", tom: "danger" };
  if (
    ["quebrado", "danificado", "enviado_assistencia", "aguardando_envio_assistencia", "aguardando_retorno_assistencia", "extraviado", "inativo", "baixado"].includes(status ?? "")
  )
    return { label: "Fora de uso", tom: "danger" };
  return { label: "Em cuidado", tom: "warning" };
}

export function formatarData(valor?: string | null, comHora = true) {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(comHora ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

export function formatarMoeda(valor?: number | string | null) {
  const n = typeof valor === "string" ? Number(valor) : valor;
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
