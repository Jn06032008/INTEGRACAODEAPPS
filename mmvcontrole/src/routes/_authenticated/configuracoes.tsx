import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NOME, MINISTERIO, PAPEIS, UNIDADE } from "@/lib/constants";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — MMV Produção" },
      { name: "description", content: "Unidades, setores, locais de guarda, categorias e dados do seu acesso." },
      { property: "og:title", content: "Configurações — MMV Produção" },
      { property: "og:description", content: "Unidades, setores, locais e categorias do sistema." },
    ],
  }),
  component: Configuracoes,
});

function Configuracoes() {
  const queryClient = useQueryClient();
  const { perfil, papeis, ehGestor, user } = useAuth();
  const ehAdmin = papeis.includes("admin");
  const [novos, setNovos] = useState({ setor: "", local: "", categoria: "" });
  const [nome, setNome] = useState(perfil?.nome ?? "");

  const { data } = useQuery({
    queryKey: ["configuracoes"],
    queryFn: async () => {
      const [unidades, setores, locais, categorias] = await Promise.all([
        supabase.from("units").select("*").order("nome"),
        supabase.from("departments").select("*").order("nome"),
        supabase.from("locations").select("*").order("nome"),
        supabase.from("equipment_categories").select("*").order("nome"),
      ]);
      return {
        unidades: unidades.data ?? [],
        setores: setores.data ?? [],
        locais: locais.data ?? [],
        categorias: categorias.data ?? [],
      };
    },
  });

  const unidade = data?.unidades[0];

  async function adicionar(tipo: "setor" | "local" | "categoria") {
    const valor = novos[tipo].trim();
    if (!valor) return;
    const { error } =
      tipo === "categoria"
        ? await supabase.from("equipment_categories").insert({ nome: valor })
        : tipo === "setor"
          ? await supabase.from("departments").insert({ nome: valor, unit_id: unidade?.id ?? null })
          : await supabase.from("locations").insert({ nome: valor, unit_id: unidade?.id ?? null });
    if (error) {
      toast.error("Não foi possível adicionar. Verifique suas permissões.");
      return;
    }
    toast.success("Cadastro adicionado");
    setNovos({ ...novos, [tipo]: "" });
    void queryClient.invalidateQueries();
  }

  async function salvarPerfil() {
    if (!user) return;
    await supabase.from("profiles").update({ nome }).eq("id", user.id);
    toast.success("Seus dados foram atualizados");
    void queryClient.invalidateQueries();
  }

  return (
    <AppShell titulo="Configurações" descricao={`${MINISTERIO} • ${UNIDADE}`}>
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Seus dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">E-mail: {perfil?.email ?? user?.email ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              Perfis de acesso: {papeis.map((p) => PAPEIS[p] ?? p).join(", ") || "—"}
            </p>
            <Button size="sm" onClick={() => void salvarPerfil()}>
              Salvar meus dados
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Unidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="font-semibold">{unidade?.nome ?? MINISTERIO}</p>
            <p className="text-xs text-muted-foreground">{unidade?.endereco ?? UNIDADE}</p>
            <p className="text-xs text-muted-foreground">Aplicativo: {APP_NOME}</p>
          </CardContent>
        </Card>

        <Lista
          titulo="Setores"
          itens={(data?.setores ?? []).map((s) => s.nome)}
          valor={novos.setor}
          onChange={(v) => setNovos({ ...novos, setor: v })}
          onAdicionar={() => void adicionar("setor")}
          podeEditar={ehAdmin}
        />
        <Lista
          titulo="Locais de guarda"
          itens={(data?.locais ?? []).map((l) => l.nome)}
          valor={novos.local}
          onChange={(v) => setNovos({ ...novos, local: v })}
          onAdicionar={() => void adicionar("local")}
          podeEditar={ehGestor}
        />
        <Lista
          titulo="Categorias de equipamento"
          itens={(data?.categorias ?? []).map((c) => c.nome)}
          valor={novos.categoria}
          onChange={(v) => setNovos({ ...novos, categoria: v })}
          onAdicionar={() => void adicionar("categoria")}
          podeEditar={ehGestor}
        />
      </div>
    </AppShell>
  );
}

function Lista({
  titulo,
  itens,
  valor,
  onChange,
  onAdicionar,
  podeEditar,
}: {
  titulo: string;
  itens: string[];
  valor: string;
  onChange: (valor: string) => void;
  onAdicionar: () => void;
  podeEditar: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{titulo}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {itens.map((i) => (
            <span key={i} className="rounded-full bg-muted px-3 py-1 text-xs">
              {i}
            </span>
          ))}
          {itens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum cadastro ainda.</p>}
        </div>
        {podeEditar && (
          <div className="flex gap-2">
            <Input placeholder={`Adicionar em ${titulo.toLowerCase()}`} value={valor} onChange={(e) => onChange(e.target.value)} />
            <Button variant="secondary" onClick={onAdicionar}>
              Adicionar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
