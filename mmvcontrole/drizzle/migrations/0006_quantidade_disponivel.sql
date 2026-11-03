ALTER TABLE public.equipment ADD COLUMN IF NOT EXISTS quantidade_disponivel integer NOT NULL DEFAULT 1;
UPDATE public.equipment SET quantidade_disponivel = quantidade;
ALTER TABLE public.checkouts ADD COLUMN IF NOT EXISTS quantidade integer NOT NULL DEFAULT 1;