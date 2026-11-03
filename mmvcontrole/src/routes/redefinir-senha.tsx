import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NOME } from "@/lib/constants";

export const Route = createFileRoute("/redefinir-senha")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — MMV Produção" },
      { name: "description", content: "Defina uma nova senha de acesso ao sistema MMV Produção." },
      { property: "og:title", content: "Redefinir senha — MMV Produção" },
      {
        property: "og:description",
        content: "Defina uma nova senha de acesso ao controle de equipamentos.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha !== confirmacao) {
      toast.error("As senhas não são iguais");
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "");
      toast.success("Senha atualizada");
      navigate({ to: "/painel", replace: true });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível atualizar a senha");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-deep px-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-lg">
        <h1 className="text-xl font-bold">Definir nova senha</h1>
        <p className="mt-1 text-sm text-muted-foreground">{APP_NOME}</p>
        <form className="mt-6 space-y-4" onSubmit={(e) => void salvar(e)}>
          <div className="space-y-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input
              id="senha"
              type="password"
              minLength={6}
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmacao">Confirmar senha</Label>
            <Input
              id="confirmacao"
              type="password"
              minLength={6}
              required
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />
          </div>
          <Button type="submit" size="lg" className="w-full" disabled={enviando}>
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar senha
          </Button>
        </form>
      </div>
    </div>
  );
}
