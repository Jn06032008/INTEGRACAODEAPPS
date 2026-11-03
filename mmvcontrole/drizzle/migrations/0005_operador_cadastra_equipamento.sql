DROP POLICY IF EXISTS "cadastrar equipamentos" ON public.equipment;
CREATE POLICY "cadastrar equipamentos" ON public.equipment FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);