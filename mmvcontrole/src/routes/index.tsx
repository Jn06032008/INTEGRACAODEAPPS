import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Lock, Mail, ShieldCheck, Boxes, QrCode, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NOME, APP_SUBTITULO, MINISTERIO, UNIDADE } from "@/lib/constants";
import { useAuth } from "@/lib/auth";
import { InstalarApp } from "@/components/InstalarApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar — MMV Produção | Controle de Equipamentos" },
      {
        name: "description",
        content:
          "Acesso da equipe de Produção e Comunicação Audiovisual do Ministério Mudança de Vida ao controle de equipamentos.",
      },
      { property: "og:title", content: "Entrar — MMV Produção" },
      {
        property: "og:description",
        content: "Controle de equipamentos audiovisuais do Ministério Mudança de Vida.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const { session, carregando } = useAuth();
  const [modo, setModo] = useState<"entrar" | "criar" | "recuperar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/painel", replace: true });
  }, [session, navigate]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        toast.success("Acesso liberado");
        navigate({ to: "/painel", replace: true });
      } else if (modo === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { nome, telefone }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/painel", replace: true });
        } else {
          toast.success("Conta criada! Agora é só entrar com seu e-mail e senha");
          setModo("entrar");
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de recuperação para o seu e-mail");
        setModo("entrar");
      }
    } catch (erro) {
      const mensagem = erro instanceof Error ? erro.message : "Não foi possível continuar";
      toast.error(
        mensagem.includes("Invalid login credentials") ? "E-mail ou senha incorretos" : mensagem,
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-deep lg:flex-row">
      <div className="flex flex-1 flex-col justify-center gap-6 px-6 py-10 text-primary-foreground lg:px-16">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
            {MINISTERIO}
          </p>
          <h1 className="mt-2 text-3xl font-extrabold leading-tight lg:text-4xl">{APP_NOME}</h1>
          <p className="mt-1 text-base text-primary-foreground/80">{APP_SUBTITULO}</p>
          <p className="mt-4 text-sm text-primary-foreground/70">Unidade {UNIDADE}</p>
          <p className="mt-1 text-sm text-primary-foreground/70">
            Equipe de Produção e Comunicação Audiovisual — liderança: Bispa Cléo Rossafa
          </p>
        </div>
        <ul className="space-y-3 text-sm text-primary-foreground/85">
          <li className="flex items-center gap-3">
            <Boxes className="h-5 w-5 text-info" /> Inventário completo e organizado
          </li>
          <li className="flex items-center gap-3">
            <QrCode className="h-5 w-5 text-info" /> Retirada e devolução por QR Code
          </li>
          <li className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-info" /> Responsabilidade e histórico de cada
            movimentação
          </li>
        </ul>
      </div>

      <div className="flex flex-1 items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-lg">
          <h2 className="text-xl font-bold text-foreground">
            {modo === "entrar"
              ? "Entrar no sistema"
              : modo === "criar"
                ? "Primeiro acesso"
                : "Recuperar senha"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {modo === "recuperar"
              ? "Informe seu e-mail para receber o link de redefinição."
              : "Somente usuários autorizados têm acesso."}
          </p>

          <form className="mt-6 space-y-4" onSubmit={(e) => void enviar(e)}>
            {modo === "criar" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome completo</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                  <Input
                    id="telefone"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    placeholder="(11) 90000-0000"
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="voce@email.com"
                />
              </div>
            </div>
            {modo !== "recuperar" && (
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="senha"
                    type={mostrarSenha ? "text" : "password"}
                    className="pl-9 pr-11"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={enviando || carregando}>
              {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
              {modo === "entrar" ? "Entrar" : modo === "criar" ? "Criar acesso" : "Enviar link"}
            </Button>
          </form>

          <div className="mt-5 space-y-2 text-center text-sm">
            {modo !== "entrar" ? (
              <button
                type="button"
                className="font-semibold text-primary"
                onClick={() => setModo("entrar")}
              >
                Já tenho acesso
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="block w-full font-semibold text-primary"
                  onClick={() => setModo("recuperar")}
                >
                  Esqueci minha senha
                </button>
                <button
                  type="button"
                  className="block w-full text-muted-foreground"
                  onClick={() => setModo("criar")}
                >
                  Primeiro acesso? Criar minha conta
                </button>
              </>
            )}
          </div>
          <div className="mt-6">
            <InstalarApp />
          </div>
        </div>
      </div>
    </div>
  );
}
