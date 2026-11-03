import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESTADOS_CONSERVACAO } from "@/lib/constants";
import { useAuth, nomeUsuario } from "@/lib/auth";
import { registrarAuditoria, registrarMovimento } from "@/lib/registros";

export const Route = createFileRoute("/_authenticated/equipamento/novo")({
  head: () => ({
    meta: [
      { title: "Cadastrar equipamento — MMV Produção" },
      { name: "description", content: "Cadastro de equipamentos audiovisuais com fotos, acessórios e patrimônio." },
      { property: "og:title", content: "Cadastrar equipamento — MMV Produção" },
      { property: "og:description", content: "Cadastro de equipamentos audiovisuais." },
    ],
  }),
  component: NovoEquipamento,
});

type Acessorio = { nome: string; quantidade: number };

function NovoEquipamento() {
  const navigate = useNavigate();
  const { user, perfil, ehGestor } = useAuth();
  const [salvando, setSalvando] = useState(false);
  const [fotos, setFotos] = useState<string[]>([]);
  const [acessorios, setAcessorios] = useState<Acessorio[]>([]);
  const [novoAcessorio, setNovoAcessorio] = useState("");
  const [form, setForm] = useState({
    nome: "",
    patrimonio: "",
    category_id: "",
    marca: "",
    modelo: "",
    numero_serie: "",
    descricao: "",
    department_id: "",
    location_id: "",
    quantidade: "1",
    valor_estimado: "",
    data_compra: "",
    fornecedor: "",
    nota_fiscal: "",
    garantia_meses: "",
    garantia_vencimento: "",
    estado_conservacao: "bom",
    frequencia_revisao_dias: "",
    ultima_revisao: "",
    proxima_revisao: "",
    observacoes: "",
  });

  const { data } = useQuery({
    queryKey: ["cadastro-apoio"],
    queryFn: async () => {
      const [categorias, setores, locais, unidades] = await Promise.all([
        supabase.from("equipment_categories").select("id, nome").order("nome"),
        supabase.from("departments").select("id, nome").order("nome"),
        supabase.from("locations").select("id, nome").order("nome"),
        supabase.from("units").select("id, nome").order("nome"),
      ]);
      return {
        categorias: categorias.data ?? [],
        setores: setores.data ?? [],
        locais: locais.data ?? [],
        unidades: unidades.data ?? [],
      };
    },
  });

  const set = (campo: keyof typeof form) => (valor: string) =>
    setForm((f) => ({ ...f, [campo]: valor }));

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Entre no sistema para cadastrar equipamentos");
      return;
    }
    setSalvando(true);
    try {
      const unidade = perfil?.unit_id ?? data?.unidades[0]?.id ?? null;
      const { data: criado, error } = await supabase
        .from("equipment")
        .insert({
          nome: form.nome,
          patrimonio: form.patrimonio || null,
          category_id: form.category_id || null,
          marca: form.marca || null,
          modelo: form.modelo || null,
          numero_serie: form.numero_serie || null,
          descricao: form.descricao || null,
          unit_id: unidade,
          department_id: form.department_id || null,
          location_id: form.location_id || null,
          quantidade: Number(form.quantidade || 1),
          valor_estimado: form.valor_estimado ? Number(form.valor_estimado) : null,
          data_compra: form.data_compra || null,
          fornecedor: form.fornecedor || null,
          nota_fiscal: form.nota_fiscal || null,
          garantia_meses: form.garantia_meses ? Number(form.garantia_meses) : null,
          garantia_vencimento: form.garantia_vencimento || null,
          estado_conservacao: form.estado_conservacao,
          frequencia_revisao_dias: form.frequencia_revisao_dias
            ? Number(form.frequencia_revisao_dias)
            : null,
          ultima_revisao: form.ultima_revisao || null,
          proxima_revisao: form.proxima_revisao || null,
          observacoes: form.observacoes || null,
          foto_url: fotos[0] ?? null,
          status: "disponivel",
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      if (fotos.length > 0) {
        await supabase.from("equipment_photos").insert(
          fotos.map((url) => ({
            equipment_id: criado.id,
            url,
            tipo: "cadastro",
            created_by: user?.id ?? null,
          })),
        );
      }
      if (acessorios.length > 0) {
        await supabase.from("equipment_accessories").insert(
          acessorios.map((a) => ({
            equipment_id: criado.id,
            nome: a.nome,
            quantidade: a.quantidade,
          })),
        );
      }
      await registrarMovimento({
        equipment_id: criado.id,
        tipo: "cadastro",
        responsavel_id: user?.id ?? null,
        responsavel_nome: nomeUsuario(perfil, user),
        status: "disponivel",
        detalhes: "Equipamento cadastrado",
      });
      await registrarAuditoria({
        user_id: user?.id ?? null,
        user_nome: nomeUsuario(perfil, user),
        tabela: "equipment",
        registro_id: criado.id,
        acao: "cadastro",
        detalhes: { codigo: criado.codigo },
      });

      toast.success(`Equipamento ${criado.codigo} cadastrado`);
      navigate({ to: "/equipamento/$id", params: { id: criado.id } });
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível cadastrar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AppShell titulo="Cadastrar equipamento" descricao="O código interno e o QR Code são gerados automaticamente">
      <form className="space-y-4" onSubmit={(e) => void salvar(e)}>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Campo label="Nome do equipamento *" valor={form.nome} onChange={set("nome")} obrigatorio />
            <Campo label="Número de patrimônio" valor={form.patrimonio} onChange={set("patrimonio")} />
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category_id} onValueChange={set("category_id")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.categorias ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Campo label="Marca" valor={form.marca} onChange={set("marca")} />
            <Campo label="Modelo" valor={form.modelo} onChange={set("modelo")} />
            <Campo label="Número de série" valor={form.numero_serie} onChange={set("numero_serie")} />
            <div className="space-y-2 sm:col-span-2">
              <Label>Descrição</Label>
              <Textarea value={form.descricao} onChange={(e) => set("descricao")(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Guarda e responsabilidade</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Setor responsável</Label>
              <Select value={form.department_id} onValueChange={set("department_id")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.setores ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Local onde fica guardado</Label>
              <Select value={form.location_id} onValueChange={set("location_id")}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {(data?.locais ?? []).map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Campo label="Quantidade" valor={form.quantidade} onChange={set("quantidade")} tipo="number" />
            <div className="space-y-2">
              <Label>Estado de conservação</Label>
              <Select value={form.estado_conservacao} onValueChange={set("estado_conservacao")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_CONSERVACAO.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Compra, garantia e revisão</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Campo label="Valor estimado (R$)" valor={form.valor_estimado} onChange={set("valor_estimado")} tipo="number" />
            <Campo label="Data da compra" valor={form.data_compra} onChange={set("data_compra")} tipo="date" />
            <Campo label="Fornecedor" valor={form.fornecedor} onChange={set("fornecedor")} />
            <Campo label="Número da nota fiscal" valor={form.nota_fiscal} onChange={set("nota_fiscal")} />
            <Campo label="Garantia (meses)" valor={form.garantia_meses} onChange={set("garantia_meses")} tipo="number" />
            <Campo label="Vencimento da garantia" valor={form.garantia_vencimento} onChange={set("garantia_vencimento")} tipo="date" />
            <Campo label="Revisão recomendada (dias)" valor={form.frequencia_revisao_dias} onChange={set("frequencia_revisao_dias")} tipo="number" />
            <Campo label="Última revisão" valor={form.ultima_revisao} onChange={set("ultima_revisao")} tipo="date" />
            <Campo label="Próxima revisão" valor={form.proxima_revisao} onChange={set("proxima_revisao")} tipo="date" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Acessórios que acompanham</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Ex.: bateria, cartão de memória, case"
                value={novoAcessorio}
                onChange={(e) => setNovoAcessorio(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!novoAcessorio.trim()) return;
                  setAcessorios([...acessorios, { nome: novoAcessorio.trim(), quantidade: 1 }]);
                  setNovoAcessorio("");
                }}
              >
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {acessorios.map((a, i) => (
                <button
                  key={`${a.nome}-${i}`}
                  type="button"
                  onClick={() => setAcessorios(acessorios.filter((_, idx) => idx !== i))}
                  className="rounded-full border border-border bg-muted px-3 py-1 text-xs"
                >
                  {a.nome} ✕
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fotos e observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PhotoUpload pasta="equipamentos" valor={fotos} onChange={setFotos} titulo="Fotos do equipamento" />
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => set("observacoes")(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" size="lg" className="w-full" disabled={salvando}>
          {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
          Cadastrar equipamento
        </Button>
      </form>
    </AppShell>
  );
}

function Campo({
  label,
  valor,
  onChange,
  tipo = "text",
  obrigatorio = false,
}: {
  label: string;
  valor: string;
  onChange: (valor: string) => void;
  tipo?: string;
  obrigatorio?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={tipo} value={valor} required={obrigatorio} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
