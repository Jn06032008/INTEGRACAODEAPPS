-- Producao 0006: quantidade disponivel por equipamento e quantidade em retiradas.
-- A carga inicial de quantidade_disponivel roda somente quando a coluna e criada, para nao sobrescrever dados em reexecucoes.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'equipment' AND column_name = 'quantidade_disponivel'
  ) THEN
    ALTER TABLE public.equipment ADD COLUMN quantidade_disponivel integer NOT NULL DEFAULT 1;
    UPDATE public.equipment SET quantidade_disponivel = quantidade;
  END IF;
END $$;

ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS quantidade integer NOT NULL DEFAULT 1;
