-- Producao 0005: qualquer membro autenticado pode cadastrar equipamento (antes restrito a gestores).
-- Politica recriada com auth.uid() IS NOT NULL. Na 0008 ela passa a exigir membro ativo.

DROP POLICY IF EXISTS "cadastrar equipamentos" ON public.equipment;
CREATE POLICY "cadastrar equipamentos" ON public.equipment FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
