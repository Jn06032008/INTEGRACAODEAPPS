-- Producao 0008: exige membro ativo (perfil ativo + ao menos um papel) para ler e escrever nas tabelas de Producao e no bucket.
-- Criada a funcao producao_e_membro (antes is_membro). O loop de ajuste de politicas foi RESTRITO as tabelas de Producao,
-- para nao alterar politicas das tabelas do Estudio (events, notifications, audit_logs, etc.).

CREATE OR REPLACE FUNCTION public.producao_e_membro(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _user_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.producao_perfis WHERE id = _user_id AND ativo)
    AND EXISTS (SELECT 1 FROM public.producao_papeis WHERE user_id = _user_id)
$$;
REVOKE EXECUTE ON FUNCTION public.producao_e_membro(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.producao_e_membro(uuid) TO authenticated;

-- Ajuste automatico das politicas das tabelas de Producao (exceto perfis e papeis, tratados abaixo).
DO $$
DECLARE r record; nq text; nw text; sql text;
BEGIN
  FOR r IN SELECT tablename, policyname, cmd, qual, with_check FROM pg_policies
           WHERE schemaname = 'public'
             AND tablename IN (
               'units','departments','locations','equipment_categories','equipment','equipment_photos',
               'equipment_documents','equipment_accessories','kits','kit_items','reservations','checkouts',
               'checkout_items','returns','return_items','inspections','movements','maintenance_orders',
               'maintenance_expenses','technical_assistance','cleaning_orders','producao_notifications',
               'producao_audit_logs')
  LOOP
    nq := r.qual; nw := r.with_check;
    IF nq IN ('true','(auth.uid() IS NOT NULL)') THEN nq := 'public.producao_e_membro(auth.uid())'; END IF;
    IF nw = '(auth.uid() IS NOT NULL)' THEN nw := 'public.producao_e_membro(auth.uid())'; END IF;
    IF nw = 'true' THEN nw := COALESCE(nq, 'public.producao_e_membro(auth.uid())'); END IF;
    IF nq IS DISTINCT FROM r.qual OR nw IS DISTINCT FROM r.with_check THEN
      sql := format('ALTER POLICY %I ON public.%I', r.policyname, r.tablename);
      IF nq IS NOT NULL AND r.cmd <> 'INSERT' THEN sql := sql || ' USING (' || nq || ')'; END IF;
      IF nw IS NOT NULL AND r.cmd NOT IN ('SELECT','DELETE') THEN sql := sql || ' WITH CHECK (' || nw || ')'; END IF;
      EXECUTE sql;
    END IF;
  END LOOP;
END $$;

-- Perfis e papeis (tabelas renomeadas)
ALTER POLICY "ler perfis" ON public.producao_perfis USING (id = auth.uid() OR public.producao_e_membro(auth.uid()));
ALTER POLICY "ler papeis" ON public.producao_papeis USING (user_id = auth.uid() OR public.producao_e_membro(auth.uid()));

-- Storage (bucket equipamentos)
ALTER POLICY "equipamentos upload autenticado" ON storage.objects
  WITH CHECK (bucket_id = 'equipamentos' AND public.producao_e_membro(auth.uid()));
ALTER POLICY "equipamentos leitura autenticada" ON storage.objects
  USING (bucket_id = 'equipamentos' AND public.producao_e_membro(auth.uid()));
ALTER POLICY "equipamentos update autenticado" ON storage.objects
  USING (bucket_id = 'equipamentos' AND (owner = auth.uid() OR public.producao_e_gestor(auth.uid())))
  WITH CHECK (bucket_id = 'equipamentos' AND (owner = auth.uid() OR public.producao_e_gestor(auth.uid())));
