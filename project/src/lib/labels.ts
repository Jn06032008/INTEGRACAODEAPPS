export const PROBLEM_STATUS: Record<string, string> = {
  identified: 'Identificado',
  in_analysis: 'Em análise',
  awaiting_diagnosis: 'Aguardando diagnóstico',
  solution_proposed: 'Solução proposta',
  awaiting_authorization: 'Aguardando autorização',
  authorized: 'Autorizado para execução',
  in_execution: 'Em execução',
  in_test: 'Em teste',
  resolved_pending_validation: 'Resolvido, aguardando validação',
  resolved_validated: 'Resolvido e validado',
  rejected: 'Rejeitado',
  suspended: 'Suspenso',
  reopened: 'Reaberto',
};

export const PROBLEM_STATUS_KEYS = Object.keys(PROBLEM_STATUS);

export const IMPACT_LABELS: Record<string, string> = {
  low: 'Baixo',
  moderate: 'Moderado',
  high: 'Alto',
  critical: 'Crítico',
};

export const URGENCY_LABELS: Record<string, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  immediate: 'Imediata',
};

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export const SEVERITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export const ERROR_CATEGORIES = [
  'Áudio', 'Vídeo', 'Iluminação', 'Transmissão', 'Gravação',
  'Equipamentos', 'Comunicação', 'Procedimentos', 'Infraestrutura', 'Outros',
];

export const ANALYSIS_STAGE_LABELS: Record<string, string> = {
  observed: 'Erro observado',
  suspected_cause: 'Causa suspeita',
  confirmed_cause: 'Causa confirmada',
  corrective_action: 'Ação corretiva',
  recurring: 'Problema recorrente',
};

export const OCCURRENCE_TYPES: Record<string, string> = {
  comportamento: 'Comportamento',
  atraso: 'Atraso / falta',
  procedimento: 'Procedimento',
  conduta: 'Conduta',
  outros: 'Outros',
};

export const OCCURRENCE_STATUS: Record<string, string> = {
  open: 'Aberta',
  in_review: 'Em análise',
  resolved: 'Resolvida',
  closed: 'Encerrada',
};

export const WEEKDAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

export const APPROVAL_STATUS: Record<string, string> = {
  pending: 'Aguardando',
  approved: 'Aprovado',
  rejected: 'Rejeitado',
};

export const TASK_STATUS: Record<string, string> = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  blocked: 'Bloqueada',
};

export const EVENT_STATUS: Record<string, string> = {
  scheduled: 'Agendado',
  preparing: 'Em preparação',
  in_progress: 'Em andamento',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

export const REPORT_STATUS: Record<string, string> = {
  draft: 'Rascunho',
  in_review: 'Em revisão',
  finalized: 'Finalizado',
};

export const SCHEDULE_STATUS: Record<string, string> = {
  draft: 'Rascunho',
  published: 'Publicada',
  closed: 'Encerrada',
};

export const READINESS_STATES: Record<string, string> = {
  waiting: 'Aguardando confirmação',
  ready: 'Pronto',
  ready_with_caveats: 'Pronto com ressalvas',
  not_ready: 'Não pronto',
  needs_assistance: 'Necessita de assistência',
};

export const MEDIA_STATUS: Record<string, string> = {
  awaiting_edit: 'Aguardando edição',
  in_edit: 'Em edição',
  awaiting_publication: 'Aguardando publicação',
  published: 'Publicado',
  not_found: 'Não encontrado',
  reported_lost: 'Informado como perdido',
  in_recovery: 'Em recuperação',
  archived: 'Arquivado',
};

export const MEDIA_STATUS_KEYS = Object.keys(MEDIA_STATUS);

export const RECORD_TYPE_LABELS: Record<string, string> = {
  recording: 'Gravação',
  transmission: 'Transmissão',
  both: 'Gravação e transmissão',
};

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  inactive: 'Inativa',
  awaiting_activation: 'Aguardando ativação',
  suspended: 'Suspensa',
};

export const REPORT_SECTIONS = [
  { key: 'summary', label: 'Resumo geral' },
  { key: 'studio_ops', label: 'Operação do estúdio' },
  { key: 'transmission', label: 'Transmissão online' },
  { key: 'in_person', label: 'Culto presencial e demais áreas' },
  { key: 'team', label: 'Equipe e procedimentos' },
  { key: 'closing', label: 'Encerramento' },
] as const;

export const SECTOR_NAMES = [
  'Áudio', 'Vídeo e câmeras', 'Transmissão', 'Iluminação',
  'Informática e sistemas', 'Infraestrutura', 'Organização presencial',
];

export const ROLE_LABELS: Record<string, string> = {
  member: 'Membro da equipe',
  sector_lead: 'Responsável de setor',
  studio_lead: 'Liderança do estúdio',
  senior_lead: 'Liderança superior',
  sysadmin: 'Administrador do sistema',
};

export const POST_EXAMPLES = [
  'Operação de áudio',
  'Operação de câmeras',
  'Direção de transmissão',
  'Operação de vMix',
  'Iluminação',
  'Gravação',
  'Apoio técnico',
];
