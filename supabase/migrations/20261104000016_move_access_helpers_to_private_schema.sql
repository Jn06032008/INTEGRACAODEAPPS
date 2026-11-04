/*
# Move access helper functions to a private schema

## Plain-English summary
The two helper functions that check a person's global level and area access were callable directly through the public web API. They only report on the signed-in person, but they should not be exposed. This migration moves them into a private schema that the web API does not expose, and points the access rules at the new location.

## 1. New schema
- `private`: holds internal helpers only. Signed-in users get usage rights on it so the access rules can run.

## 2. Functions
- `private.is_master()` and `private.tem_acesso_area(text)` replace the public versions, with the same logic.
- The public versions are removed.

## 3. Security
- Execute rights on the helpers are restricted to signed-in users; anonymous users have none.
- Access rules on `perfis`, `perfil_areas` are recreated to use the private helpers.

## 4. Notes
1. No data is changed.
2. Drop-and-recreate is limited to the access rules created in the previous step of this migration series.
*/

CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_master()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis p
    WHERE p.id = auth.uid() AND p.ativo AND p.nivel_chave = 'master'
  );
$$;

CREATE OR REPLACE FUNCTION private.tem_acesso_area(_area text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfis p
    WHERE p.id = auth.uid()
      AND p.ativo
      AND (
        p.nivel_chave = 'master'
        OR EXISTS (
          SELECT 1 FROM public.perfil_areas pa
          WHERE pa.perfil_id = p.id AND pa.area_chave = _area
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION private.is_master() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.tem_acesso_area(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_master() TO authenticated;
GRANT EXECUTE ON FUNCTION private.tem_acesso_area(text) TO authenticated;

DROP POLICY IF EXISTS "perfis_select_proprio_ou_master" ON public.perfis;
CREATE POLICY "perfis_select_proprio_ou_master" ON public.perfis
  FOR SELECT TO authenticated USING (auth.uid() = id OR private.is_master());

DROP POLICY IF EXISTS "perfil_areas_select_proprio_ou_master" ON public.perfil_areas;
CREATE POLICY "perfil_areas_select_proprio_ou_master" ON public.perfil_areas
  FOR SELECT TO authenticated USING (perfil_id = auth.uid() OR private.is_master());

DROP FUNCTION IF EXISTS public.is_master();
DROP FUNCTION IF EXISTS public.tem_acesso_area(text);
