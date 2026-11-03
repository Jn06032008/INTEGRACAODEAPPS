import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { criarUsuario, redefinirSenhaUsuario } from "@/lib/usuarios.functions";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PAPEIS, formatarData } from "@/lib/constants";
import { nomeUsuario, useAuth } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/registros";

export const Route = createFileRoute("/_authenticated/usuarios")({
  head: () => ({
    meta: [
      { title: "Usuários e permissões — MMV Produção" },
      { name: "description", content: "Gestão dos usuários da equipe de produção e das permissões de cada perfil." },
      { property: "og:title", content: "Usuários e permissões — MMV Produção" },
      { property: "og:description", content: "Gestão de usuários e permissões da equipe." },
    ],
  }),
  component: Usuarios,
});

function NovoCadastro() {
  const queryClient = useQueryClient();
  const criar = useServerFn(criarUsuario);
  const { user, perfil } = useAuth();
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [verSenha, setVerSenha] = useState(false);
  const [f, setF] = useState({ nome: "", email: "", telefone: "", senha: "", papel: "operador" });

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (f.senha.length < 6) { toast.error("A senha precisa ter pelo menos 6 caracteres"); return; }
    setSalvando(true);
    try {
      const r = await criar({ data: { ...f, papel: f.papel as "operador" } });
      await registrarAuditoria({
        user_id: user?.id ?? null,
        user_nome: nomeUsuario(perfil, user),
        tabela: "profiles",
        registro_id: r.id,
        acao: "usuario_criado",
        detalhes: { email: f.email, papel: f.papel },
      });
      toast.success(`Cadastro criado. Login: ${f.email}`);
      setF({ nome: "", email: "", telefone: "", senha: "", papel: "operador" });
      setAberto(false);
      void queryClient.invalidateQueries();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  if (!aberto)
    return (
      <Button className="h-12 w-full text-base" onClick={() => setAberto(true)}>
        <UserPlus className="mr-2 h-5 w-5" /> Criar cadastro e senha
      </Button>
    );

  return (
    <Card>
      <CardContent className="p-4">
        <form onSubmit={salvar} className="space-y-3">
          <p className="font-bold">Novo cadastro</p>
          <p className="text-xs text-muted-foreground">
            A pessoa já entra com este e-mail e senha no próprio celular.
          </p>
          <div className="space-y-1">
            <Label>Nome</Label>
            <Input required value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>E-mail (login)</Label>
            <Input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Senha</Label>
            <div className="relative">
              <Input
                required
                type={verSenha ? "text" : "password"}
                value={f.senha}
                onChange={(e) => setF({ ...f, senha: e.target.value })}
                className="pr-10"
              />
              <button
                type="button"
                aria-label={verSenha ? "Esconder senha" : "Ver senha"}
                onClick={() => setVerSenha(!verSenha)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Perfil</Label>
            <select
              value={f.papel}
              onChange={(e) => setF({ ...f, papel: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {Object.entries(PAPEIS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={salvando}>
              {salvando ? "Salvando..." : "Criar cadastro"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Usuarios() {
  const queryClient = useQueryClient();
  const { user, perfil, papeis } = useAuth();
  const ehAdmin = papeis.includes("admin");
  const redefinir = useServerFn(redefinirSenhaUsuario);

  const { data, isLoading } = useQuery({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const [perfis, roles] = await Promise.all([
        supabase.from("profiles").select("*").order("nome"),
        supabase.from("user_roles").select("*"),
      ]);
      return { perfis: perfis.data ?? [], roles: roles.data ?? [] };
    },
  });

  async function alternarPapel(userId: string, papel: string, ativo: boolean) {
    if (!ehAdmin) {
      toast.error("Somente o administrador geral gerencia permissões");
      return;
    }
    if (ativo) {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: papel as never });
      if (error) {
        toast.error("Não foi possível conceder a permissão");
        return;
      }
    } else {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", papel as never);
    }
    await registrarAuditoria({
      user_id: user?.id ?? null,
      user_nome: nomeUsuario(perfil, user),
      tabela: "user_roles",
      registro_id: userId,
      acao: ativo ? "papel_concedido" : "papel_removido",
      detalhes: { papel },
    });
    toast.success("Permissões atualizadas");
    void queryClient.invalidateQueries();
  }

  async function alternarAtivo(userId: string, ativo: boolean) {
    if (!ehAdmin) {
      toast.error("Somente o administrador geral pode inativar usuários");
      return;
    }
    await supabase.from("profiles").update({ ativo }).eq("id", userId);
    await registrarAuditoria({
      user_id: user?.id ?? null,
      user_nome: nomeUsuario(perfil, user),
      tabela: "profiles",
      registro_id: userId,
      acao: ativo ? "usuario_ativado" : "usuario_inativado",
    });
    toast.success(ativo ? "Usuário ativado" : "Usuário inativado");
    void queryClient.invalidateQueries();
  }

  async function trocarSenha(userId: string, nome: string) {
    const senha = window.prompt(`Nova senha para ${nome} (mínimo 6 caracteres):`);
    if (!senha) return;
    if (senha.length < 6) { toast.error("A senha precisa ter pelo menos 6 caracteres"); return; }
    try {
      await redefinir({ data: { userId, senha } });
      await registrarAuditoria({
        user_id: user?.id ?? null,
        user_nome: nomeUsuario(perfil, user),
        tabela: "profiles",
        registro_id: userId,
        acao: "senha_redefinida",
      });
      toast.success(`Senha de ${nome} trocada. Avise a pessoa.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <AppShell titulo="Usuários e permissões" descricao="Somente usuários autorizados acessam o sistema">
      {isLoading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Carregando usuários...</p>
      ) : (
        <div className="space-y-3">
          {ehAdmin ? (
            <NovoCadastro />
          ) : (
            <p className="rounded-xl bg-info/15 p-3 text-xs">
              Você pode consultar a equipe. Alterações de permissão são feitas pelo administrador geral.
            </p>
          )}
          {(data?.perfis ?? []).map((p) => {
            const papeisUsuario = (data?.roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role);
            return (
              <Card key={p.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{p.nome}</p>
                      <p className="text-xs text-muted-foreground">{p.email ?? "sem e-mail"}</p>
                      {p.telefone && <p className="text-xs text-muted-foreground">{p.telefone}</p>}
                      <p className="text-xs text-muted-foreground">Cadastrado em {formatarData(p.created_at, false)}</p>
                      {Date.now() - new Date(p.created_at).getTime() < 7 * 86400000 && (
                        <span className="mt-1 inline-block rounded-full bg-info/20 px-2 py-0.5 text-[11px] font-semibold text-info-foreground">
                          Novo cadastro
                        </span>
                      )}
                      {!p.ativo && (
                        <span className="mt-1 ml-1 inline-block rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                          Inativo
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant={p.ativo ? "outline" : "default"}
                        disabled={!ehAdmin}
                        onClick={() => void alternarAtivo(p.id, !p.ativo)}
                      >
                        {p.ativo ? "Inativar" : "Ativar"}
                      </Button>
                      {ehAdmin && (
                        <Button size="sm" variant="secondary" onClick={() => void trocarSenha(p.id, p.nome)}>
                          Trocar senha
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(PAPEIS).map(([papel, label]) => (
                      <label key={papel} className="flex items-center gap-2 rounded-xl border border-border p-2 text-sm">
                        <Checkbox
                          checked={papeisUsuario.includes(papel as never)}
                          disabled={!ehAdmin}
                          onCheckedChange={(v) => void alternarPapel(p.id, papel, Boolean(v))}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
