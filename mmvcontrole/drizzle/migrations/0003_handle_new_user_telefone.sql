CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_unit uuid;
BEGIN
  SELECT id INTO v_unit FROM public.units ORDER BY created_at LIMIT 1;
  INSERT INTO public.profiles (id, nome, email, telefone, unit_id)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome',''), split_part(NEW.email,'@',1)),
    NEW.email,
    NULLIF(NEW.raw_user_meta_data->>'telefone',''),
    v_unit
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::public.app_role, 'operador'))
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;