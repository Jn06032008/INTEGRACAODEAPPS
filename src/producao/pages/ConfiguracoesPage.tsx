import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PInput, PLabel, PButton, PPageHeader, PSelect } from "@/producao/components/ui";
import { useProducaoAuth, nomeUsuario } from "@/producao/lib/auth";
import { toast } from "@/producao/lib/toast";

export function ConfiguracoesPage() {
  const { user, perfil, recarregarPerfil } = useProducaoAuth();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { if (perfil) { setNome(perfil.nome); setTelefone(perfil.telefone ?? ""); } }, [perfil]);

  async function salvar() {
    if (!user) return;
    setSalvando(true);
    const { error } = await supabase.from("producao_perfis").update({ nome, telefone }).eq("id", user.id);
    setSalvando(false);
    if (error) return toast("Erro: " + error.message, "error");
    await recarregarPerfil();
    toast("Perfil atualizado!", "success");
  }

  return (
    <div>
      <PPageHeader title="Configurações" description="Seus dados de acesso" />
      <PCard className="max-w-lg"><PCardBody className="space-y-3">
        <div><PLabel>Nome</PLabel><PInput value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div><PLabel>E-mail</PLabel><PInput value={perfil?.email ?? user?.email ?? ""} disabled /></div>
        <div><PLabel>Telefone</PLabel><PInput value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div>
        <PButton onClick={() => void salvar()} loading={salvando}>Salvar alterações</PButton>
      </PCardBody></PCard>
    </div>
  );
}
