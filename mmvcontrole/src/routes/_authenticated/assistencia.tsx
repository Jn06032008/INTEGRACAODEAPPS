import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { STATUS_ASSISTENCIA, formatarData, formatarMoeda } from "@/lib/constants";
import { nomeUsuario, useAuth } from "@/lib/auth";
import { registrarAuditoria, registrarMovimento } from "@/lib/registros";

export const Route = createFileRoute("/_authenticated/assistencia")({
  head: () => ({
    meta: [
      { title: "Assistência técnica — MMV Produção" },
      { name: "description", content: "Controle de envios para assistência técnica: protocolo, orçamento, prazos e retorno." },
      { property: "og:title", content: "Assistência técnica — MMV Produção" },
      { property: "og:description", content: "Controle de envios para assistência técnica." },
    ],
  }),
  component: Assistencia,
});

const FLUXO = [
  { valor: "enviado", label: "Marcar como enviado", status: "enviado_assistencia" },
  { valor: "em_avaliacao", label: "Em avaliação", status: "enviado_assistencia" },
  { valor: "aguardando_aprovacao", label: "Aguardando aprovação do orçamento", status: "enviado_assistencia" },
  { valor: "em_reparo", label: "Em reparo", status: "enviado_assistencia" },
  { valor: "pronto_retirada", label: "Pronto para retirada", status: "aguardando_retorno_assistencia" },
  { valor: "retornou", label: "Retornou para a base", status: "aguardando_conferencia" },
  { valor: "sem_conserto", label: "Sem conserto", status: "quebrado" },
];

function Assistencia() {
  const queryClient = useQueryClient();
  const { user, perfil, ehGestor } = useAuth();
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({
    equipment_id: "",
    empresa: "",
    contato: "",
    telefone: "",
    endereco: "",
    protocolo: "",
    defeito: "",
    enviado_em: "",
    entregue_por: "",
    previsao_retorno: "",
    orcamento: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["assistencia"],
    queryFn: async () => {
      const [registros, equipamentos] = await Promise.all([
        supabase.from("technical_assistance").select("*").order("created_at", { ascending: false }),
        supabase.from("equipment").select("id, nome, codigo, status").order("nome"),
      ]);
      return { registros: registros.data ?? [], equipamentos: equipamentos.data ?? [] };
    },
  });

  const mapa = new Map((data?.equipamentos ?? []).map((e) => [e.id, e]));
  const meuNome = nomeUsuario(perfil, user);

  async function criar(ev: React.FormEvent) {
    ev.preventDefault();
    if (!ehGestor) {
      toast.error("Somente coordenação ou administração pode enviar para assistência");
      return;
    }
    const { data: criado, error } = await supabase
      .from("technical_assistance")
      .insert({
        equipment_id: form.equipment_id,
        empresa: form.empresa,
        contato: form.contato || null,
        telefone: form.telefone || null,
        endereco: form.endereco || null,
        protocolo: form.protocolo || null,
        defeito: form.defeito || null,
        enviado_em: form.enviado_em || null,
        entregue_por: form.entregue_por || meuNome,
        previsao_retorno: form.previsao_retorno || null,
        orcamento: form.orcamento ? Number(form.orcamento) : null,
        status: form.enviado_em ? "enviado" : "aguardando_envio",
      })
      .select()
      .single();
    if (error) {
      toast.error("Não foi possível registrar o envio");
      return;
    }
    await supabase
      .from("equipment")
      .update({
        status: form.enviado_em ? "enviado_assistencia" : "aguardando_envio_assistencia",
        updated_at: new Date().toISOString(),
      })
      .eq("id", form.equipment_id);
    await registrarMovimento({
      equipment_id: form.equipment_id,
      tipo: "assistencia",
      responsavel_id: user?.id ?? null,
      responsavel_nome: meuNome,
      status: form.enviado_em ? "enviado_assistencia" : "aguardando_envio_assistencia",
      detalhes: `Assistência ${form.empresa}${form.protocolo ? ` • protocolo ${form.protocolo}` : ""}`,
    });
    await registrarAuditoria({
      user_id: user?.id ?? null,
      user_nome: meuNome,
      tabela: "technical_assistance",
      registro_id: criado.id,
      acao: "envio_assistencia",
    });
    toast.success("Envio para assistência registrado");
    setNovo(false);
    setForm({ ...form, empresa: "", protocolo: "", defeito: "", equipment_id: "" });
    void queryClient.invalidateQueries();
  }

  async function mudar(registro: { id: string; equipment_id: string; empresa: string }, etapa: (typeof FLUXO)[number]) {
    if (!ehGestor) {
      toast.error("Somente coordenação ou administração pode atualizar");
      return;
    }
    await supabase
      .from("technical_assistance")
      .update({
        status: etapa.valor,
        ...(etapa.valor === "retornou" ? { retorno_em: new Date().toISOString().slice(0, 10) } : {}),
      })
      .eq("id", registro.id);
    await supabase
      .from("equipment")
      .update({ status: etapa.status, updated_at: new Date().toISOString() })
      .eq("id", registro.equipment_id);
    await registrarMovimento({
      equipment_id: registro.equipment_id,
      tipo: "assistencia",
      responsavel_id: user?.id ?? null,
      responsavel_nome: meuNome,
      status: etapa.status,
      detalhes: `${registro.empresa} — ${etapa.label}`,
    });
    toast.success(etapa.label);
    void queryClient.invalidateQueries();
  }

  return (
    <AppShell
      titulo="Assistência técnica"
      descricao="Envios, orçamentos, prazos e retorno dos equipamentos"
      acoes={
        ehGestor ? (
          <Button size="sm" variant="secondary" onClick={() => setNovo(!novo)}>
            <Plus className="h-4 w-4" /> Novo envio
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {novo && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Registrar envio para assistência</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 sm:grid-cols-2" onSubmit={(ev) => void criar(ev)}>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Equipamento *</Label>
                  <select
                    required
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.equipment_id}
                    onChange={(ev) => setForm({ ...form, equipment_id: ev.target.value })}
                  >
                    <option value="">Selecione</option>
                    {(data?.equipamentos ?? []).map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.codigo} — {e.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <Campo label="Empresa *" valor={form.empresa} onChange={(v) => setForm({ ...form, empresa: v })} obrigatorio />
                <Campo label="Contato" valor={form.contato} onChange={(v) => setForm({ ...form, contato: v })} />
                <Campo label="Telefone" valor={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} />
                <Campo label="Endereço" valor={form.endereco} onChange={(v) => setForm({ ...form, endereco: v })} />
                <Campo label="Protocolo" valor={form.protocolo} onChange={(v) => setForm({ ...form, protocolo: v })} />
                <Campo label="Quem entregou" valor={form.entregue_por} onChange={(v) => setForm({ ...form, entregue_por: v })} />
                <Campo label="Data do envio" tipo="date" valor={form.enviado_em} onChange={(v) => setForm({ ...form, enviado_em: v })} />
                <Campo
                  label="Previsão de retorno"
                  tipo="date"
                  valor={form.previsao_retorno}
                  onChange={(v) => setForm({ ...form, previsao_retorno: v })}
                />
                <Campo label="Orçamento (R$)" tipo="number" valor={form.orcamento} onChange={(v) => setForm({ ...form, orcamento: v })} />
                <div className="space-y-2 sm:col-span-2">
                  <Label>Defeito relatado</Label>
                  <Textarea value={form.defeito} onChange={(ev) => setForm({ ...form, defeito: ev.target.value })} />
                </div>
                <Button type="submit" className="sm:col-span-2">
                  Registrar envio
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {isLoading ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Carregando registros...</p>
        ) : (data?.registros ?? []).length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
              <Building2 className="h-8 w-8 text-success" />
              <p className="text-sm text-muted-foreground">Nenhum equipamento na assistência técnica.</p>
            </CardContent>
          </Card>
        ) : (
          (data?.registros ?? []).map((a) => {
            const e = mapa.get(a.equipment_id);
            const atrasado =
              a.previsao_retorno && new Date(a.previsao_retorno).getTime() < Date.now() && a.status !== "liberado";
            return (
              <Card key={a.id} className={atrasado ? "border-danger/50" : undefined}>
                <CardContent className="space-y-3 p-4">
                  <div>
                    <Link to="/equipamento/$id" params={{ id: a.equipment_id }} className="font-bold hover:underline">
                      {e?.nome ?? "Equipamento"}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {a.empresa} • protocolo {a.protocolo ?? "—"} • {a.telefone ?? "sem telefone"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Enviado em {formatarData(a.enviado_em, false)} • previsão {formatarData(a.previsao_retorno, false)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Orçamento: {formatarMoeda(a.orcamento)} • aprovado: {formatarMoeda(a.valor_aprovado)}
                    </p>
                    {a.defeito && <p className="text-xs text-muted-foreground">Defeito: {a.defeito}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StatusBadge
                        label={STATUS_ASSISTENCIA[a.status]?.label ?? a.status}
                        tom={STATUS_ASSISTENCIA[a.status]?.tom ?? "neutral"}
                      />
                      {atrasado && <StatusBadge label="Prazo vencido" tom="danger" />}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FLUXO.map((etapa) => (
                      <Button
                        key={etapa.valor}
                        size="sm"
                        variant="outline"
                        disabled={!ehGestor || a.status === etapa.valor}
                        onClick={() => void mudar(a, etapa)}
                      >
                        {etapa.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
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
      <Input type={tipo} required={obrigatorio} value={valor} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
