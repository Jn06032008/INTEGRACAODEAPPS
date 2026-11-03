import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function exigirAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error || !data) throw new Error("Somente o administrador geral pode fazer isso");
}

export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        nome: z.string().trim().min(2).max(100),
        email: z.string().trim().email().max(255),
        telefone: z.string().trim().max(30).optional(),
        senha: z.string().min(6).max(72),
        papel: z.enum(["admin", "coordenador", "operador", "tecnico"]),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome, telefone: data.telefone ?? "", role: data.papel },
    });
    if (error) {
      if (/already|registered|exists/i.test(error.message)) throw new Error("Este e-mail já tem cadastro");
      throw new Error("Não foi possível criar o cadastro");
    }
    return { id: criado.user.id };
  });

export const redefinirSenhaUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), senha: z.string().min(6).max(72) }).parse(d))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, { password: data.senha });
    if (error) throw new Error("Não foi possível trocar a senha");
    return { ok: true };
  });
