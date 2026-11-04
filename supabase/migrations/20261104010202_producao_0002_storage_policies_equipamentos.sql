-- Producao 0002: cria o bucket privado 'equipamentos' (fotos e documentos; o app usa URLs assinadas) e as politicas de storage.
-- has_role renomeado para producao_tem_papel.

INSERT INTO storage.buckets (id, name, public)
VALUES ('equipamentos', 'equipamentos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "equipamentos leitura autenticada" ON storage.objects;
CREATE POLICY "equipamentos leitura autenticada" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'equipamentos');

DROP POLICY IF EXISTS "equipamentos upload autenticado" ON storage.objects;
CREATE POLICY "equipamentos upload autenticado" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'equipamentos');

DROP POLICY IF EXISTS "equipamentos update autenticado" ON storage.objects;
CREATE POLICY "equipamentos update autenticado" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'equipamentos') WITH CHECK (bucket_id = 'equipamentos');

DROP POLICY IF EXISTS "equipamentos delete admin" ON storage.objects;
CREATE POLICY "equipamentos delete admin" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'equipamentos' AND public.producao_tem_papel(auth.uid(),'admin'));
