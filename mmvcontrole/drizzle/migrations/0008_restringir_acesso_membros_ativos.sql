CREATE OR REPLACE FUNCTION public.is_membro(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND ativo)
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.is_membro(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_membro(uuid) TO authenticated, service_role;

DO $$
DECLARE r record; nq text; nw text; sql text;
BEGIN
  FOR r IN SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
           WHERE schemaname = 'public' AND tablename NOT IN ('profiles','user_roles')
  LOOP
    nq := r.qual; nw := r.with_check;
    IF nq IN ('true','(auth.uid() IS NOT NULL)') THEN nq := 'public.is_membro(auth.uid())'; END IF;
    IF nw = '(auth.uid() IS NOT NULL)' THEN nw := 'public.is_membro(auth.uid())'; END IF;
    IF nw = 'true' THEN nw := COALESCE(nq, 'public.is_membro(auth.uid())'); END IF;
    IF nq IS DISTINCT FROM r.qual OR nw IS DISTINCT FROM r.with_check THEN
      sql := format('ALTER POLICY %I ON public.%I', r.policyname, r.tablename);
      IF nq IS NOT NULL AND r.cmd <> 'INSERT' THEN sql := sql || ' USING (' || nq || ')'; END IF;
      IF nw IS NOT NULL AND r.cmd NOT IN ('SELECT','DELETE') THEN sql := sql || ' WITH CHECK (' || nw || ')'; END IF;
      EXECUTE sql;
    END IF;
  END LOOP;
END $$;

ALTER POLICY "ler perfis" ON public.profiles USING (id = auth.uid() OR public.is_membro(auth.uid()));
ALTER POLICY "ler papeis" ON public.user_roles USING (user_id = auth.uid() OR public.is_membro(auth.uid()));

ALTER POLICY "equipamentos upload autenticado" ON storage.objects
  WITH CHECK (bucket_id = 'equipamentos' AND public.is_membro(auth.uid()));
ALTER POLICY "equipamentos leitura autenticada" ON storage.objects
  USING (bucket_id = 'equipamentos' AND public.is_membro(auth.uid()));
ALTER POLICY "equipamentos update autenticado" ON storage.objects
  USING (bucket_id = 'equipamentos' AND (owner = auth.uid() OR public.is_gestor(auth.uid())))
  WITH CHECK (bucket_id = 'equipamentos' AND (owner = auth.uid() OR public.is_gestor(auth.uid())));