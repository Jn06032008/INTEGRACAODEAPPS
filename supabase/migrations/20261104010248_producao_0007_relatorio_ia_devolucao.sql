-- Producao 0007: campo para o relatorio gerado por IA na devolucao.

ALTER TABLE public.returns ADD COLUMN IF NOT EXISTS relatorio_ia text;
