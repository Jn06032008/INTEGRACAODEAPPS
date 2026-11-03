CREATE POLICY "equipamentos leitura autenticada" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'equipamentos');
CREATE POLICY "equipamentos upload autenticado" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'equipamentos');
CREATE POLICY "equipamentos update autenticado" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'equipamentos') WITH CHECK (bucket_id = 'equipamentos');
CREATE POLICY "equipamentos delete admin" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'equipamentos' AND public.has_role(auth.uid(),'admin'));
