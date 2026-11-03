-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'coordenador', 'operador', 'tecnico');

CREATE TABLE public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  endereco text,
  cidade text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;
GRANT ALL ON public.units TO service_role;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;
GRANT ALL ON public.departments TO service_role;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  nome text NOT NULL DEFAULT 'Sem nome',
  email text,
  telefone text,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  must_change_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin','coordenador'))
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_unit uuid;
BEGIN
  SELECT id INTO v_unit FROM public.units ORDER BY created_at LIMIT 1;
  INSERT INTO public.profiles (id, nome, email, unit_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email, v_unit)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'operador'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CATALOGO
CREATE TABLE public.equipment_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_categories TO authenticated;
GRANT ALL ON public.equipment_categories TO service_role;
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;

CREATE SEQUENCE public.equipment_code_seq START 1;

CREATE TABLE public.equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE DEFAULT 'MMV-' || lpad(nextval('public.equipment_code_seq')::text, 4, '0'),
  patrimonio text,
  nome text NOT NULL,
  category_id uuid REFERENCES public.equipment_categories(id) ON DELETE SET NULL,
  marca text,
  modelo text,
  numero_serie text,
  descricao text,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  quantidade integer NOT NULL DEFAULT 1,
  valor_estimado numeric(12,2),
  data_compra date,
  fornecedor text,
  nota_fiscal text,
  garantia_meses integer,
  garantia_vencimento date,
  estado_conservacao text DEFAULT 'bom',
  status text NOT NULL DEFAULT 'disponivel',
  frequencia_revisao_dias integer,
  ultima_revisao date,
  proxima_revisao date,
  foto_url text,
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  responsavel_atual_id uuid,
  responsavel_atual_nome text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;
GRANT ALL ON public.equipment TO service_role;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.equipment_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  url text NOT NULL,
  tipo text NOT NULL DEFAULT 'geral',
  descricao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_photos TO authenticated;
GRANT ALL ON public.equipment_photos TO service_role;
ALTER TABLE public.equipment_photos ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.equipment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  nome text NOT NULL,
  url text NOT NULL,
  tipo text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_documents TO authenticated;
GRANT ALL ON public.equipment_documents TO service_role;
ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.equipment_accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  nome text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  obrigatorio boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_accessories TO authenticated;
GRANT ALL ON public.equipment_accessories TO service_role;
ALTER TABLE public.equipment_accessories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kits TO authenticated;
GRANT ALL ON public.kits TO service_role;
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.kit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  obrigatorio boolean NOT NULL DEFAULT true
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_items TO authenticated;
GRANT ALL ON public.kit_items TO service_role;
ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento text NOT NULL,
  responsavel_id uuid,
  responsavel_nome text,
  equipment_id uuid REFERENCES public.equipment(id) ON DELETE CASCADE,
  kit_id uuid REFERENCES public.kits(id) ON DELETE SET NULL,
  inicio timestamptz NOT NULL,
  fim timestamptz NOT NULL,
  local text,
  observacoes text,
  status text NOT NULL DEFAULT 'aguardando_aprovacao',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reservations TO authenticated;
GRANT ALL ON public.reservations TO service_role;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

-- MOVIMENTACOES
CREATE SEQUENCE public.checkout_number_seq START 1;

CREATE TABLE public.checkouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE DEFAULT 'RET-' || lpad(nextval('public.checkout_number_seq')::text, 5, '0'),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  kit_id uuid REFERENCES public.kits(id) ON DELETE SET NULL,
  responsavel_id uuid,
  responsavel_nome text NOT NULL,
  autorizado_por_id uuid,
  autorizado_por_nome text,
  finalidade text,
  evento text,
  destino text,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  retirada_em timestamptz NOT NULL DEFAULT now(),
  previsao_devolucao timestamptz,
  estado_saida text,
  acessorios jsonb NOT NULL DEFAULT '[]'::jsonb,
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  termo_aceito boolean NOT NULL DEFAULT false,
  assinatura text,
  status text NOT NULL DEFAULT 'aberta',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkouts TO authenticated;
GRANT ALL ON public.checkouts TO service_role;
ALTER TABLE public.checkouts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.checkout_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id uuid NOT NULL REFERENCES public.checkouts(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  conferido boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_items TO authenticated;
GRANT ALL ON public.checkout_items TO service_role;
ALTER TABLE public.checkout_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id uuid NOT NULL REFERENCES public.checkouts(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  devolvido_por_id uuid,
  devolvido_por_nome text NOT NULL,
  recebido_por_nome text,
  condicao text NOT NULL DEFAULT 'perfeito',
  relato text,
  acessorios jsonb NOT NULL DEFAULT '[]'::jsonb,
  acessorios_faltando text,
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
  observacoes text,
  assinatura text,
  devolvido_em timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'aguardando_conferencia',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.returns TO authenticated;
GRANT ALL ON public.returns TO service_role;
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  conferido boolean NOT NULL DEFAULT false,
  observacao text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.return_items TO authenticated;
GRANT ALL ON public.return_items TO service_role;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid REFERENCES public.returns(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  conferido_por_id uuid,
  conferido_por_nome text,
  resultado text NOT NULL,
  destino text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid REFERENCES public.equipment(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  responsavel_id uuid,
  responsavel_nome text,
  destino text,
  status text,
  detalhes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.movements TO authenticated;
GRANT ALL ON public.movements TO service_role;
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;

-- MANUTENCAO / ASSISTENCIA / LIMPEZA
CREATE SEQUENCE public.maintenance_number_seq START 1;

CREATE TABLE public.maintenance_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text NOT NULL UNIQUE DEFAULT 'OS-' || lpad(nextval('public.maintenance_number_seq')::text, 5, '0'),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  problema text NOT NULL,
  relatado_por_id uuid,
  relatado_por_nome text,
  ocorrencia_em timestamptz NOT NULL DEFAULT now(),
  prioridade text NOT NULL DEFAULT 'normal',
  responsavel_analise text,
  diagnostico text,
  solucao text,
  pecas text,
  valor_pecas numeric(12,2) DEFAULT 0,
  valor_mao_obra numeric(12,2) DEFAULT 0,
  custo_total numeric(12,2) DEFAULT 0,
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
  inicio date,
  previsao_conclusao date,
  conclusao date,
  status text NOT NULL DEFAULT 'aguardando_avaliacao',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_orders TO authenticated;
GRANT ALL ON public.maintenance_orders TO service_role;
ALTER TABLE public.maintenance_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.maintenance_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_order_id uuid NOT NULL REFERENCES public.maintenance_orders(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  data date NOT NULL DEFAULT current_date,
  comprovante_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_expenses TO authenticated;
GRANT ALL ON public.maintenance_expenses TO service_role;
ALTER TABLE public.maintenance_expenses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.technical_assistance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  empresa text NOT NULL,
  contato text,
  telefone text,
  endereco text,
  enviado_em date,
  entregue_por text,
  protocolo text,
  defeito text,
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
  orcamento numeric(12,2),
  valor_aprovado numeric(12,2),
  aprovado_por text,
  previsao_retorno date,
  retorno_em date,
  garantia_servico text,
  nota_fiscal text,
  comprovante_url text,
  laudo text,
  status text NOT NULL DEFAULT 'aguardando_envio',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technical_assistance TO authenticated;
GRANT ALL ON public.technical_assistance TO service_role;
ALTER TABLE public.technical_assistance ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.cleaning_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  motivo text,
  tipo text NOT NULL DEFAULT 'limpeza',
  solicitado_em timestamptz NOT NULL DEFAULT now(),
  responsavel_nome text,
  fotos_antes jsonb NOT NULL DEFAULT '[]'::jsonb,
  fotos_depois jsonb NOT NULL DEFAULT '[]'::jsonb,
  procedimentos text,
  concluido_em timestamptz,
  aprovado_por text,
  status text NOT NULL DEFAULT 'aguardando',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cleaning_orders TO authenticated;
GRANT ALL ON public.cleaning_orders TO service_role;
ALTER TABLE public.cleaning_orders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  titulo text NOT NULL,
  mensagem text,
  tipo text NOT NULL DEFAULT 'info',
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_nome text,
  tabela text NOT NULL,
  registro_id uuid,
  acao text NOT NULL,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "ler unidades" ON public.units FOR SELECT TO authenticated USING (true);
CREATE POLICY "gerir unidades" ON public.units FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "ler setores" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "gerir setores" ON public.departments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "ler locais" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "gerir locais" ON public.locations FOR ALL TO authenticated USING (public.is_gestor(auth.uid())) WITH CHECK (public.is_gestor(auth.uid()));

CREATE POLICY "ler perfis" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "editar proprio perfil" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin gerencia perfis" ON public.profiles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "ler papeis" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin gerencia papeis" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "ler categorias" ON public.equipment_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "gerir categorias" ON public.equipment_categories FOR ALL TO authenticated USING (public.is_gestor(auth.uid())) WITH CHECK (public.is_gestor(auth.uid()));

CREATE POLICY "ler equipamentos" ON public.equipment FOR SELECT TO authenticated USING (true);
CREATE POLICY "cadastrar equipamentos" ON public.equipment FOR INSERT TO authenticated WITH CHECK (public.is_gestor(auth.uid()));
CREATE POLICY "atualizar equipamentos" ON public.equipment FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "excluir equipamentos" ON public.equipment FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "ler fotos" ON public.equipment_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "criar fotos" ON public.equipment_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admin apaga fotos" ON public.equipment_photos FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE POLICY "ler documentos" ON public.equipment_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "gerir documentos" ON public.equipment_documents FOR ALL TO authenticated USING (public.is_gestor(auth.uid())) WITH CHECK (public.is_gestor(auth.uid()));

CREATE POLICY "ler acessorios" ON public.equipment_accessories FOR SELECT TO authenticated USING (true);
CREATE POLICY "gerir acessorios" ON public.equipment_accessories FOR ALL TO authenticated USING (public.is_gestor(auth.uid())) WITH CHECK (public.is_gestor(auth.uid()));

CREATE POLICY "ler kits" ON public.kits FOR SELECT TO authenticated USING (true);
CREATE POLICY "gerir kits" ON public.kits FOR ALL TO authenticated USING (public.is_gestor(auth.uid())) WITH CHECK (public.is_gestor(auth.uid()));
CREATE POLICY "ler itens kit" ON public.kit_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "gerir itens kit" ON public.kit_items FOR ALL TO authenticated USING (public.is_gestor(auth.uid())) WITH CHECK (public.is_gestor(auth.uid()));

CREATE POLICY "ler reservas" ON public.reservations FOR SELECT TO authenticated USING (true);
CREATE POLICY "criar reservas" ON public.reservations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "gerir reservas" ON public.reservations FOR UPDATE TO authenticated USING (public.is_gestor(auth.uid()) OR responsavel_id = auth.uid()) WITH CHECK (true);

CREATE POLICY "ler retiradas" ON public.checkouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "criar retiradas" ON public.checkouts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "atualizar retiradas abertas" ON public.checkouts FOR UPDATE TO authenticated USING (public.is_gestor(auth.uid()) OR status <> 'devolvida') WITH CHECK (true);

CREATE POLICY "ler itens retirada" ON public.checkout_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "gerir itens retirada" ON public.checkout_items FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ler devolucoes" ON public.returns FOR SELECT TO authenticated USING (true);
CREATE POLICY "criar devolucoes" ON public.returns FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "conferir devolucoes" ON public.returns FOR UPDATE TO authenticated USING (public.is_gestor(auth.uid())) WITH CHECK (public.is_gestor(auth.uid()));

CREATE POLICY "ler itens devolucao" ON public.return_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "gerir itens devolucao" ON public.return_items FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ler conferencias" ON public.inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "criar conferencias" ON public.inspections FOR INSERT TO authenticated WITH CHECK (public.is_gestor(auth.uid()));

CREATE POLICY "ler movimentacoes" ON public.movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "criar movimentacoes" ON public.movements FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "ler manutencoes" ON public.maintenance_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "criar manutencoes" ON public.maintenance_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "atualizar manutencoes" ON public.maintenance_orders FOR UPDATE TO authenticated USING (public.is_gestor(auth.uid()) OR public.has_role(auth.uid(),'tecnico')) WITH CHECK (true);

CREATE POLICY "ler despesas" ON public.maintenance_expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "gerir despesas" ON public.maintenance_expenses FOR ALL TO authenticated USING (public.is_gestor(auth.uid()) OR public.has_role(auth.uid(),'tecnico')) WITH CHECK (public.is_gestor(auth.uid()) OR public.has_role(auth.uid(),'tecnico'));

CREATE POLICY "ler assistencia" ON public.technical_assistance FOR SELECT TO authenticated USING (true);
CREATE POLICY "gerir assistencia" ON public.technical_assistance FOR ALL TO authenticated USING (public.is_gestor(auth.uid()) OR public.has_role(auth.uid(),'tecnico')) WITH CHECK (public.is_gestor(auth.uid()) OR public.has_role(auth.uid(),'tecnico'));

CREATE POLICY "ler limpeza" ON public.cleaning_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "criar limpeza" ON public.cleaning_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "atualizar limpeza" ON public.cleaning_orders FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (true);

CREATE POLICY "ler proprias notificacoes" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "criar notificacoes" ON public.notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "marcar notificacao lida" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "ler auditoria" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_gestor(auth.uid()));
CREATE POLICY "criar auditoria" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- SEED
INSERT INTO public.units (id, nome, endereco, cidade) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Ministério Mudança de Vida – Taquari', 'Bairro da Mooca', 'São Paulo/SP');

INSERT INTO public.departments (id, unit_id, nome) VALUES
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Produção Audiovisual'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Comunicação'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Transmissão');

INSERT INTO public.locations (id, unit_id, nome, descricao) VALUES
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Sala técnica', 'Armário principal de equipamentos'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Estúdio', 'Estúdio de gravação'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Depósito', 'Cases e tripés');

INSERT INTO public.equipment_categories (nome) VALUES
  ('Câmeras'),('Lentes'),('Tripés'),('Monitores'),('Iluminação'),('Microfones'),('Mesas de som'),
  ('Mesas de corte'),('Conversores'),('Gravadores'),('Computadores'),('Notebooks'),('Cabos'),
  ('Fontes'),('Carregadores'),('Baterias'),('Transmissores'),('Receptores'),('Intercomunicadores'),
  ('Roteadores e rede'),('Suportes'),('Cases e bolsas'),('Ferramentas'),('Acessórios'),('Outros');
