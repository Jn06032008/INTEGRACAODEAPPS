-- Producao 0000: esquema de controle de equipamentos (tabelas, sequencias, funcoes, politicas RLS e dados de catalogo).
-- Renomeado para convivir com o Estudio: profiles->producao_perfis, user_roles->producao_papeis, app_role->producao_papel,
-- has_role->producao_tem_papel, is_gestor->producao_e_gestor, handle_new_user->producao_criar_perfil_novo_usuario,
-- on_auth_user_created->producao_on_auth_user_created, audit_logs->producao_audit_logs, notifications->producao_notifications.
-- Politicas FOR ALL foram separadas em uma politica por verbo. Grants apenas para authenticated.

-- ===== ROLES =====
DO $$ BEGIN
  CREATE TYPE public.producao_papel AS ENUM ('admin', 'coordenador', 'operador', 'tecnico');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===== UNIDADES / SETORES / LOCAIS =====
CREATE TABLE IF NOT EXISTS public.units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  endereco text,
  cidade text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.units FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;

CREATE TABLE IF NOT EXISTS public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  nome text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.departments FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.departments TO authenticated;

CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid REFERENCES public.units(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.locations FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;

-- ===== PERFIS E PAPEIS (renomeados) =====
CREATE TABLE IF NOT EXISTS public.producao_perfis (
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
ALTER TABLE public.producao_perfis ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.producao_perfis FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producao_perfis TO authenticated;

CREATE TABLE IF NOT EXISTS public.producao_papeis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.producao_papel NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.producao_papeis ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.producao_papeis FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.producao_papeis TO authenticated;

-- ===== FUNCOES DE PAPEL E CRIACAO DE PERFIL =====
CREATE OR REPLACE FUNCTION public.producao_tem_papel(_user_id uuid, _role public.producao_papel)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.producao_papeis WHERE user_id = _user_id AND role = _role)
$$;
REVOKE EXECUTE ON FUNCTION public.producao_tem_papel(uuid, public.producao_papel) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.producao_tem_papel(uuid, public.producao_papel) TO authenticated;

CREATE OR REPLACE FUNCTION public.producao_e_gestor(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.producao_papeis WHERE user_id = _user_id AND role IN ('admin','coordenador'))
$$;
REVOKE EXECUTE ON FUNCTION public.producao_e_gestor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.producao_e_gestor(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.producao_criar_perfil_novo_usuario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_unit uuid;
BEGIN
  SELECT id INTO v_unit FROM public.units ORDER BY created_at LIMIT 1;
  INSERT INTO public.producao_perfis (id, nome, email, unit_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email,'@',1)), NEW.email, v_unit)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.producao_papeis (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.producao_papel, 'operador'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.producao_criar_perfil_novo_usuario() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS producao_on_auth_user_created ON auth.users;
CREATE TRIGGER producao_on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.producao_criar_perfil_novo_usuario();

-- ===== CATALOGO =====
CREATE TABLE IF NOT EXISTS public.equipment_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_categories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.equipment_categories FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_categories TO authenticated;

CREATE SEQUENCE IF NOT EXISTS public.equipment_code_seq START 1;
REVOKE ALL ON SEQUENCE public.equipment_code_seq FROM PUBLIC, anon;
GRANT USAGE ON SEQUENCE public.equipment_code_seq TO authenticated;

CREATE TABLE IF NOT EXISTS public.equipment (
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
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.equipment FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment TO authenticated;

CREATE TABLE IF NOT EXISTS public.equipment_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  url text NOT NULL,
  tipo text NOT NULL DEFAULT 'geral',
  descricao text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_photos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.equipment_photos FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON public.equipment_photos TO authenticated;

CREATE TABLE IF NOT EXISTS public.equipment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  nome text NOT NULL,
  url text NOT NULL,
  tipo text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.equipment_documents FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_documents TO authenticated;

CREATE TABLE IF NOT EXISTS public.equipment_accessories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  nome text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1,
  obrigatorio boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.equipment_accessories ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.equipment_accessories FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_accessories TO authenticated;

CREATE TABLE IF NOT EXISTS public.kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  descricao text,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kits FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kits TO authenticated;

CREATE TABLE IF NOT EXISTS public.kit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id uuid NOT NULL REFERENCES public.kits(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  obrigatorio boolean NOT NULL DEFAULT true
);
ALTER TABLE public.kit_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.kit_items FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kit_items TO authenticated;

CREATE TABLE IF NOT EXISTS public.reservations (
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
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reservations FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.reservations TO authenticated;

-- ===== MOVIMENTACOES =====
CREATE SEQUENCE IF NOT EXISTS public.checkout_number_seq START 1;
REVOKE ALL ON SEQUENCE public.checkout_number_seq FROM PUBLIC, anon;
GRANT USAGE ON SEQUENCE public.checkout_number_seq TO authenticated;

CREATE TABLE IF NOT EXISTS public.checkouts (
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
ALTER TABLE public.checkouts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkouts FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.checkouts TO authenticated;

CREATE TABLE IF NOT EXISTS public.checkout_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkout_id uuid NOT NULL REFERENCES public.checkouts(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  conferido boolean NOT NULL DEFAULT false
);
ALTER TABLE public.checkout_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_items FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_items TO authenticated;

CREATE TABLE IF NOT EXISTS public.returns (
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
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.returns FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.returns TO authenticated;

CREATE TABLE IF NOT EXISTS public.return_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  conferido boolean NOT NULL DEFAULT false,
  observacao text
);
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.return_items FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.return_items TO authenticated;

CREATE TABLE IF NOT EXISTS public.inspections (
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
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.inspections FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.inspections TO authenticated;

CREATE TABLE IF NOT EXISTS public.movements (
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
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.movements FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.movements TO authenticated;

-- ===== MANUTENCAO / ASSISTENCIA / LIMPEZA =====
CREATE SEQUENCE IF NOT EXISTS public.maintenance_number_seq START 1;
REVOKE ALL ON SEQUENCE public.maintenance_number_seq FROM PUBLIC, anon;
GRANT USAGE ON SEQUENCE public.maintenance_number_seq TO authenticated;

CREATE TABLE IF NOT EXISTS public.maintenance_orders (
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
ALTER TABLE public.maintenance_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.maintenance_orders FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.maintenance_orders TO authenticated;

CREATE TABLE IF NOT EXISTS public.maintenance_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_order_id uuid NOT NULL REFERENCES public.maintenance_orders(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  data date NOT NULL DEFAULT current_date,
  comprovante_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance_expenses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.maintenance_expenses FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_expenses TO authenticated;

CREATE TABLE IF NOT EXISTS public.technical_assistance (
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
ALTER TABLE public.technical_assistance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.technical_assistance FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.technical_assistance TO authenticated;

CREATE TABLE IF NOT EXISTS public.cleaning_orders (
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
ALTER TABLE public.cleaning_orders ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cleaning_orders FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.cleaning_orders TO authenticated;

-- ===== NOTIFICACOES E AUDITORIA (renomeadas: nomes ja usados pelo Estudio) =====
CREATE TABLE IF NOT EXISTS public.producao_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  titulo text NOT NULL,
  mensagem text,
  tipo text NOT NULL DEFAULT 'info',
  lida boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.producao_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.producao_notifications FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON public.producao_notifications TO authenticated;

CREATE TABLE IF NOT EXISTS public.producao_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_nome text,
  tabela text NOT NULL,
  registro_id uuid,
  acao text NOT NULL,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.producao_audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.producao_audit_logs FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.producao_audit_logs TO authenticated;

-- ===== POLITICAS (uma por verbo) =====
-- units
DROP POLICY IF EXISTS "ler unidades" ON public.units;
CREATE POLICY "ler unidades" ON public.units FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gerir unidades inserir" ON public.units;
CREATE POLICY "gerir unidades inserir" ON public.units FOR INSERT TO authenticated WITH CHECK (public.producao_tem_papel(auth.uid(),'admin'));
DROP POLICY IF EXISTS "gerir unidades atualizar" ON public.units;
CREATE POLICY "gerir unidades atualizar" ON public.units FOR UPDATE TO authenticated USING (public.producao_tem_papel(auth.uid(),'admin')) WITH CHECK (public.producao_tem_papel(auth.uid(),'admin'));
DROP POLICY IF EXISTS "gerir unidades excluir" ON public.units;
CREATE POLICY "gerir unidades excluir" ON public.units FOR DELETE TO authenticated USING (public.producao_tem_papel(auth.uid(),'admin'));

-- departments
DROP POLICY IF EXISTS "ler setores" ON public.departments;
CREATE POLICY "ler setores" ON public.departments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gerir setores inserir" ON public.departments;
CREATE POLICY "gerir setores inserir" ON public.departments FOR INSERT TO authenticated WITH CHECK (public.producao_tem_papel(auth.uid(),'admin'));
DROP POLICY IF EXISTS "gerir setores atualizar" ON public.departments;
CREATE POLICY "gerir setores atualizar" ON public.departments FOR UPDATE TO authenticated USING (public.producao_tem_papel(auth.uid(),'admin')) WITH CHECK (public.producao_tem_papel(auth.uid(),'admin'));
DROP POLICY IF EXISTS "gerir setores excluir" ON public.departments;
CREATE POLICY "gerir setores excluir" ON public.departments FOR DELETE TO authenticated USING (public.producao_tem_papel(auth.uid(),'admin'));

-- locations
DROP POLICY IF EXISTS "ler locais" ON public.locations;
CREATE POLICY "ler locais" ON public.locations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gerir locais inserir" ON public.locations;
CREATE POLICY "gerir locais inserir" ON public.locations FOR INSERT TO authenticated WITH CHECK (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "gerir locais atualizar" ON public.locations;
CREATE POLICY "gerir locais atualizar" ON public.locations FOR UPDATE TO authenticated USING (public.producao_e_gestor(auth.uid())) WITH CHECK (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "gerir locais excluir" ON public.locations;
CREATE POLICY "gerir locais excluir" ON public.locations FOR DELETE TO authenticated USING (public.producao_e_gestor(auth.uid()));

-- producao_perfis
DROP POLICY IF EXISTS "ler perfis" ON public.producao_perfis;
CREATE POLICY "ler perfis" ON public.producao_perfis FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "editar proprio perfil" ON public.producao_perfis;
CREATE POLICY "editar proprio perfil" ON public.producao_perfis FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
DROP POLICY IF EXISTS "admin gerencia perfis inserir" ON public.producao_perfis;
CREATE POLICY "admin gerencia perfis inserir" ON public.producao_perfis FOR INSERT TO authenticated WITH CHECK (public.producao_tem_papel(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin gerencia perfis atualizar" ON public.producao_perfis;
CREATE POLICY "admin gerencia perfis atualizar" ON public.producao_perfis FOR UPDATE TO authenticated USING (public.producao_tem_papel(auth.uid(),'admin')) WITH CHECK (public.producao_tem_papel(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin gerencia perfis excluir" ON public.producao_perfis;
CREATE POLICY "admin gerencia perfis excluir" ON public.producao_perfis FOR DELETE TO authenticated USING (public.producao_tem_papel(auth.uid(),'admin'));

-- producao_papeis
DROP POLICY IF EXISTS "ler papeis" ON public.producao_papeis;
CREATE POLICY "ler papeis" ON public.producao_papeis FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "admin gerencia papeis inserir" ON public.producao_papeis;
CREATE POLICY "admin gerencia papeis inserir" ON public.producao_papeis FOR INSERT TO authenticated WITH CHECK (public.producao_tem_papel(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin gerencia papeis atualizar" ON public.producao_papeis;
CREATE POLICY "admin gerencia papeis atualizar" ON public.producao_papeis FOR UPDATE TO authenticated USING (public.producao_tem_papel(auth.uid(),'admin')) WITH CHECK (public.producao_tem_papel(auth.uid(),'admin'));
DROP POLICY IF EXISTS "admin gerencia papeis excluir" ON public.producao_papeis;
CREATE POLICY "admin gerencia papeis excluir" ON public.producao_papeis FOR DELETE TO authenticated USING (public.producao_tem_papel(auth.uid(),'admin'));

-- equipment_categories
DROP POLICY IF EXISTS "ler categorias" ON public.equipment_categories;
CREATE POLICY "ler categorias" ON public.equipment_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gerir categorias inserir" ON public.equipment_categories;
CREATE POLICY "gerir categorias inserir" ON public.equipment_categories FOR INSERT TO authenticated WITH CHECK (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "gerir categorias atualizar" ON public.equipment_categories;
CREATE POLICY "gerir categorias atualizar" ON public.equipment_categories FOR UPDATE TO authenticated USING (public.producao_e_gestor(auth.uid())) WITH CHECK (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "gerir categorias excluir" ON public.equipment_categories;
CREATE POLICY "gerir categorias excluir" ON public.equipment_categories FOR DELETE TO authenticated USING (public.producao_e_gestor(auth.uid()));

-- equipment
DROP POLICY IF EXISTS "ler equipamentos" ON public.equipment;
CREATE POLICY "ler equipamentos" ON public.equipment FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "cadastrar equipamentos" ON public.equipment;
CREATE POLICY "cadastrar equipamentos" ON public.equipment FOR INSERT TO authenticated WITH CHECK (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "atualizar equipamentos" ON public.equipment;
CREATE POLICY "atualizar equipamentos" ON public.equipment FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "excluir equipamentos" ON public.equipment;
CREATE POLICY "excluir equipamentos" ON public.equipment FOR DELETE TO authenticated USING (public.producao_tem_papel(auth.uid(),'admin'));

-- equipment_photos
DROP POLICY IF EXISTS "ler fotos" ON public.equipment_photos;
CREATE POLICY "ler fotos" ON public.equipment_photos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "criar fotos" ON public.equipment_photos;
CREATE POLICY "criar fotos" ON public.equipment_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "admin apaga fotos" ON public.equipment_photos;
CREATE POLICY "admin apaga fotos" ON public.equipment_photos FOR DELETE TO authenticated USING (public.producao_tem_papel(auth.uid(),'admin'));

-- equipment_documents
DROP POLICY IF EXISTS "ler documentos" ON public.equipment_documents;
CREATE POLICY "ler documentos" ON public.equipment_documents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gerir documentos inserir" ON public.equipment_documents;
CREATE POLICY "gerir documentos inserir" ON public.equipment_documents FOR INSERT TO authenticated WITH CHECK (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "gerir documentos atualizar" ON public.equipment_documents;
CREATE POLICY "gerir documentos atualizar" ON public.equipment_documents FOR UPDATE TO authenticated USING (public.producao_e_gestor(auth.uid())) WITH CHECK (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "gerir documentos excluir" ON public.equipment_documents;
CREATE POLICY "gerir documentos excluir" ON public.equipment_documents FOR DELETE TO authenticated USING (public.producao_e_gestor(auth.uid()));

-- equipment_accessories
DROP POLICY IF EXISTS "ler acessorios" ON public.equipment_accessories;
CREATE POLICY "ler acessorios" ON public.equipment_accessories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gerir acessorios inserir" ON public.equipment_accessories;
CREATE POLICY "gerir acessorios inserir" ON public.equipment_accessories FOR INSERT TO authenticated WITH CHECK (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "gerir acessorios atualizar" ON public.equipment_accessories;
CREATE POLICY "gerir acessorios atualizar" ON public.equipment_accessories FOR UPDATE TO authenticated USING (public.producao_e_gestor(auth.uid())) WITH CHECK (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "gerir acessorios excluir" ON public.equipment_accessories;
CREATE POLICY "gerir acessorios excluir" ON public.equipment_accessories FOR DELETE TO authenticated USING (public.producao_e_gestor(auth.uid()));

-- kits
DROP POLICY IF EXISTS "ler kits" ON public.kits;
CREATE POLICY "ler kits" ON public.kits FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gerir kits inserir" ON public.kits;
CREATE POLICY "gerir kits inserir" ON public.kits FOR INSERT TO authenticated WITH CHECK (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "gerir kits atualizar" ON public.kits;
CREATE POLICY "gerir kits atualizar" ON public.kits FOR UPDATE TO authenticated USING (public.producao_e_gestor(auth.uid())) WITH CHECK (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "gerir kits excluir" ON public.kits;
CREATE POLICY "gerir kits excluir" ON public.kits FOR DELETE TO authenticated USING (public.producao_e_gestor(auth.uid()));

-- kit_items
DROP POLICY IF EXISTS "ler itens kit" ON public.kit_items;
CREATE POLICY "ler itens kit" ON public.kit_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gerir itens kit inserir" ON public.kit_items;
CREATE POLICY "gerir itens kit inserir" ON public.kit_items FOR INSERT TO authenticated WITH CHECK (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "gerir itens kit atualizar" ON public.kit_items;
CREATE POLICY "gerir itens kit atualizar" ON public.kit_items FOR UPDATE TO authenticated USING (public.producao_e_gestor(auth.uid())) WITH CHECK (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "gerir itens kit excluir" ON public.kit_items;
CREATE POLICY "gerir itens kit excluir" ON public.kit_items FOR DELETE TO authenticated USING (public.producao_e_gestor(auth.uid()));

-- reservations
DROP POLICY IF EXISTS "ler reservas" ON public.reservations;
CREATE POLICY "ler reservas" ON public.reservations FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "criar reservas" ON public.reservations;
CREATE POLICY "criar reservas" ON public.reservations FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "gerir reservas" ON public.reservations;
CREATE POLICY "gerir reservas" ON public.reservations FOR UPDATE TO authenticated USING (public.producao_e_gestor(auth.uid()) OR responsavel_id = auth.uid()) WITH CHECK (true);

-- checkouts
DROP POLICY IF EXISTS "ler retiradas" ON public.checkouts;
CREATE POLICY "ler retiradas" ON public.checkouts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "criar retiradas" ON public.checkouts;
CREATE POLICY "criar retiradas" ON public.checkouts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "atualizar retiradas abertas" ON public.checkouts;
CREATE POLICY "atualizar retiradas abertas" ON public.checkouts FOR UPDATE TO authenticated USING (public.producao_e_gestor(auth.uid()) OR status <> 'devolvida') WITH CHECK (true);

-- checkout_items
DROP POLICY IF EXISTS "ler itens retirada" ON public.checkout_items;
CREATE POLICY "ler itens retirada" ON public.checkout_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gerir itens retirada inserir" ON public.checkout_items;
CREATE POLICY "gerir itens retirada inserir" ON public.checkout_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "gerir itens retirada atualizar" ON public.checkout_items;
CREATE POLICY "gerir itens retirada atualizar" ON public.checkout_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "gerir itens retirada excluir" ON public.checkout_items;
CREATE POLICY "gerir itens retirada excluir" ON public.checkout_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- returns
DROP POLICY IF EXISTS "ler devolucoes" ON public.returns;
CREATE POLICY "ler devolucoes" ON public.returns FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "criar devolucoes" ON public.returns;
CREATE POLICY "criar devolucoes" ON public.returns FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "conferir devolucoes" ON public.returns;
CREATE POLICY "conferir devolucoes" ON public.returns FOR UPDATE TO authenticated USING (public.producao_e_gestor(auth.uid())) WITH CHECK (public.producao_e_gestor(auth.uid()));

-- return_items
DROP POLICY IF EXISTS "ler itens devolucao" ON public.return_items;
CREATE POLICY "ler itens devolucao" ON public.return_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gerir itens devolucao inserir" ON public.return_items;
CREATE POLICY "gerir itens devolucao inserir" ON public.return_items FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "gerir itens devolucao atualizar" ON public.return_items;
CREATE POLICY "gerir itens devolucao atualizar" ON public.return_items FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "gerir itens devolucao excluir" ON public.return_items;
CREATE POLICY "gerir itens devolucao excluir" ON public.return_items FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- inspections
DROP POLICY IF EXISTS "ler conferencias" ON public.inspections;
CREATE POLICY "ler conferencias" ON public.inspections FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "criar conferencias" ON public.inspections;
CREATE POLICY "criar conferencias" ON public.inspections FOR INSERT TO authenticated WITH CHECK (public.producao_e_gestor(auth.uid()));

-- movements
DROP POLICY IF EXISTS "ler movimentacoes" ON public.movements;
CREATE POLICY "ler movimentacoes" ON public.movements FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "criar movimentacoes" ON public.movements;
CREATE POLICY "criar movimentacoes" ON public.movements FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- maintenance_orders
DROP POLICY IF EXISTS "ler manutencoes" ON public.maintenance_orders;
CREATE POLICY "ler manutencoes" ON public.maintenance_orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "criar manutencoes" ON public.maintenance_orders;
CREATE POLICY "criar manutencoes" ON public.maintenance_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "atualizar manutencoes" ON public.maintenance_orders;
CREATE POLICY "atualizar manutencoes" ON public.maintenance_orders FOR UPDATE TO authenticated USING (public.producao_e_gestor(auth.uid()) OR public.producao_tem_papel(auth.uid(),'tecnico')) WITH CHECK (true);

-- maintenance_expenses
DROP POLICY IF EXISTS "ler despesas" ON public.maintenance_expenses;
CREATE POLICY "ler despesas" ON public.maintenance_expenses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gerir despesas inserir" ON public.maintenance_expenses;
CREATE POLICY "gerir despesas inserir" ON public.maintenance_expenses FOR INSERT TO authenticated WITH CHECK (public.producao_e_gestor(auth.uid()) OR public.producao_tem_papel(auth.uid(),'tecnico'));
DROP POLICY IF EXISTS "gerir despesas atualizar" ON public.maintenance_expenses;
CREATE POLICY "gerir despesas atualizar" ON public.maintenance_expenses FOR UPDATE TO authenticated USING (public.producao_e_gestor(auth.uid()) OR public.producao_tem_papel(auth.uid(),'tecnico')) WITH CHECK (public.producao_e_gestor(auth.uid()) OR public.producao_tem_papel(auth.uid(),'tecnico'));
DROP POLICY IF EXISTS "gerir despesas excluir" ON public.maintenance_expenses;
CREATE POLICY "gerir despesas excluir" ON public.maintenance_expenses FOR DELETE TO authenticated USING (public.producao_e_gestor(auth.uid()) OR public.producao_tem_papel(auth.uid(),'tecnico'));

-- technical_assistance
DROP POLICY IF EXISTS "ler assistencia" ON public.technical_assistance;
CREATE POLICY "ler assistencia" ON public.technical_assistance FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "gerir assistencia inserir" ON public.technical_assistance;
CREATE POLICY "gerir assistencia inserir" ON public.technical_assistance FOR INSERT TO authenticated WITH CHECK (public.producao_e_gestor(auth.uid()) OR public.producao_tem_papel(auth.uid(),'tecnico'));
DROP POLICY IF EXISTS "gerir assistencia atualizar" ON public.technical_assistance;
CREATE POLICY "gerir assistencia atualizar" ON public.technical_assistance FOR UPDATE TO authenticated USING (public.producao_e_gestor(auth.uid()) OR public.producao_tem_papel(auth.uid(),'tecnico')) WITH CHECK (public.producao_e_gestor(auth.uid()) OR public.producao_tem_papel(auth.uid(),'tecnico'));
DROP POLICY IF EXISTS "gerir assistencia excluir" ON public.technical_assistance;
CREATE POLICY "gerir assistencia excluir" ON public.technical_assistance FOR DELETE TO authenticated USING (public.producao_e_gestor(auth.uid()) OR public.producao_tem_papel(auth.uid(),'tecnico'));

-- cleaning_orders
DROP POLICY IF EXISTS "ler limpeza" ON public.cleaning_orders;
CREATE POLICY "ler limpeza" ON public.cleaning_orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "criar limpeza" ON public.cleaning_orders;
CREATE POLICY "criar limpeza" ON public.cleaning_orders FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "atualizar limpeza" ON public.cleaning_orders;
CREATE POLICY "atualizar limpeza" ON public.cleaning_orders FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (true);

-- producao_notifications
DROP POLICY IF EXISTS "ler proprias notificacoes" ON public.producao_notifications;
CREATE POLICY "ler proprias notificacoes" ON public.producao_notifications FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id IS NULL);
DROP POLICY IF EXISTS "criar notificacoes" ON public.producao_notifications;
CREATE POLICY "criar notificacoes" ON public.producao_notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "marcar notificacao lida" ON public.producao_notifications;
CREATE POLICY "marcar notificacao lida" ON public.producao_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- producao_audit_logs
DROP POLICY IF EXISTS "ler auditoria" ON public.producao_audit_logs;
CREATE POLICY "ler auditoria" ON public.producao_audit_logs FOR SELECT TO authenticated USING (public.producao_e_gestor(auth.uid()));
DROP POLICY IF EXISTS "criar auditoria" ON public.producao_audit_logs;
CREATE POLICY "criar auditoria" ON public.producao_audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- ===== SEED DE CATALOGO (sem demo; idempotente) =====
INSERT INTO public.units (id, nome, endereco, cidade) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Ministério Mudança de Vida – Taquari', 'Bairro da Mooca', 'São Paulo/SP')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.departments (id, unit_id, nome) VALUES
  ('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111111', 'Produção Audiovisual'),
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Comunicação'),
  ('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111111', 'Transmissão')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.locations (id, unit_id, nome, descricao) VALUES
  ('33333333-3333-3333-3333-333333333331', '11111111-1111-1111-1111-111111111111', 'Sala técnica', 'Armário principal de equipamentos'),
  ('33333333-3333-3333-3333-333333333332', '11111111-1111-1111-1111-111111111111', 'Estúdio', 'Estúdio de gravação'),
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Depósito', 'Cases e tripés')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.equipment_categories (nome) VALUES
  ('Câmeras'),('Lentes'),('Tripés'),('Monitores'),('Iluminação'),('Microfones'),('Mesas de som'),
  ('Mesas de corte'),('Conversores'),('Gravadores'),('Computadores'),('Notebooks'),('Cabos'),
  ('Fontes'),('Carregadores'),('Baterias'),('Transmissores'),('Receptores'),('Intercomunicadores'),
  ('Roteadores e rede'),('Suportes'),('Cases e bolsas'),('Ferramentas'),('Acessórios'),('Outros')
ON CONFLICT (nome) DO NOTHING;
