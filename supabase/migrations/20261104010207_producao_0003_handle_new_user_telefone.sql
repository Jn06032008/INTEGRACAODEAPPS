-- Producao 0003: a criacao automatica de perfil passa a ler o telefone do cadastro (raw_user_meta_data.telefone).
-- Versao renomeada: producao_criar_perfil_novo_usuario, usando producao_perfis e producao_papeis.

CREATE OR REPLACE FUNCTION public.producao_criar_perfil_novo_usuario()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_unit uuid;
BEGIN
  SELECT id INTO v_unit FROM public.units ORDER BY created_at LIMIT 1;
  INSERT INTO public.producao_perfis (id, nome, email, telefone, unit_id)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome',''), split_part(NEW.email,'@',1)),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'telefone',''),
    v_unit
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.producao_papeis (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.producao_papel, 'operador'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.producao_criar_perfil_novo_usuario() FROM PUBLIC, anon, authenticated;
