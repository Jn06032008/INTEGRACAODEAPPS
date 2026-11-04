import { useEffect, useState } from "react";
import { ProducaoAuthProvider, useProducaoAuth } from "@/producao/lib/auth";
import { supabase } from "@/lib/supabase";
import { ProducaoShell } from "@/producao/components/ProducaoShell";
import { Toaster } from "@/producao/lib/toast";
import { PainelPage } from "@/producao/pages/PainelPage";
import { InventarioPage } from "@/producao/pages/InventarioPage";
import { RetirarIndexPage } from "@/producao/pages/RetirarIndexPage";
import { RetirarFormPage } from "@/producao/pages/RetirarFormPage";
import { DevolverIndexPage } from "@/producao/pages/DevolverIndexPage";
import { DevolverFormPage } from "@/producao/pages/DevolverFormPage";
import { EscanearPage } from "@/producao/pages/EscanearPage";
import { KitsPage } from "@/producao/pages/KitsPage";
import { ReservasPage } from "@/producao/pages/ReservasPage";
import { MovimentacoesPage } from "@/producao/pages/MovimentacoesPage";
import { AvisosPage } from "@/producao/pages/AvisosPage";
import { LimpezaPage } from "@/producao/pages/LimpezaPage";
import { ManutencaoPage } from "@/producao/pages/ManutencaoPage";
import { AssistenciaPage } from "@/producao/pages/AssistenciaPage";
import { PendenciasPage } from "@/producao/pages/PendenciasPage";
import { ConferenciaPage } from "@/producao/pages/ConferenciaPage";
import { UsuariosPage } from "@/producao/pages/UsuariosPage";
import { RelatoriosPage } from "@/producao/pages/RelatoriosPage";
import { ConfiguracoesPage } from "@/producao/pages/ConfiguracoesPage";
import { EquipamentoNovoPage } from "@/producao/pages/EquipamentoNovoPage";
import { EquipamentoFichaPage } from "@/producao/pages/EquipamentoFichaPage";
import { QrCodesPage } from "@/producao/pages/QrCodesPage";

type Detalhe =
  | { key: "retirar"; id: string }
  | { key: "devolver"; id: string }
  | { key: "equipamento"; id: string };

export function ProducaoApp() {
  return (
    <ProducaoAuthProvider>
      <ProducaoConteudo />
      <Toaster />
    </ProducaoAuthProvider>
  );
}

function ProducaoConteudo() {
  const { carregando, user, perfil } = useProducaoAuth();
  const [pagina, setPagina] = useState("painel");
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);

  if (carregando) {
    return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[#8B2635] border-t-transparent" /></div>;
  }

  if (!user) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="font-medium text-slate-900">Não foi possível carregar a Produção</p>
        <p className="mt-2 text-sm text-slate-600">Seu perfil de Produção não foi encontrado. Procure a administração.</p>
      </div>
    );
  }

  if (!perfil?.ativo) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="font-medium text-slate-900">Seu acesso à Produção está inativo</p>
        <p className="mt-2 text-sm text-slate-600">Procure a administração para reativar seu acesso.</p>
      </div>
    );
  }

  const navegar = (key: string) => { setDetalhe(null); setPagina(key); };
  const voltar = () => setDetalhe(null);

  const abrirRetirar = (id: string) => setDetalhe({ key: "retirar", id });
  const abrirDevolver = (id: string) => setDetalhe({ key: "devolver", id });
  const abrirEquipamento = (id: string) => setDetalhe({ key: "equipamento", id });

  const conteudo = () => {
    if (detalhe?.key === "retirar") return <RetirarFormPage equipmentId={detalhe.id} onBack={voltar} onNavigate={navegar} />;
    if (detalhe?.key === "devolver") return <DevolverFormPage checkoutId={detalhe.id} onBack={voltar} onNavigate={navegar} />;
    if (detalhe?.key === "equipamento") return <EquipamentoFichaPage equipmentId={detalhe.id} onBack={voltar} onNavigate={navegar} />;

    switch (pagina) {
      case "painel": return <PainelPage onNavigate={navegar} />;
      case "inventario": return <InventarioPage onOpenEquipamento={abrirEquipamento} onNavigate={navegar} />;
      case "retirar": return <RetirarIndexPage onRetirar={abrirRetirar} />;
      case "devolver": return <DevolverIndexPage onDevolver={abrirDevolver} />;
      case "escanear": return <EscanearPage onNavigate={navegar} />;
      case "kits": return <KitsPage />;
      case "reservas": return <ReservasPage />;
      case "movimentacoes": return <MovimentacoesPage />;
      case "avisos": return <AvisosPage />;
      case "limpeza": return <LimpezaPage />;
      case "manutencao": return <ManutencaoPage />;
      case "assistencia": return <AssistenciaPage />;
      case "pendencias": return <PendenciasPage onNavigate={navegar} />;
      case "conferencia": return <ConferenciaPage onNavigate={navegar} />;
      case "usuarios": return <UsuariosPage />;
      case "relatorios": return <RelatoriosPage />;
      case "configuracoes": return <ConfiguracoesPage />;
      case "equipamento-novo": return <EquipamentoNovoPage onBack={voltar} onNavigate={navegar} />;
      case "qrcodes": return <QrCodesPage />;
      default: return <PainelPage onNavigate={navegar} />;
    }
  };

  return (
    <ProducaoShell current={detalhe?.key ?? pagina} onNavigate={navegar}>
      {conteudo()}
    </ProducaoShell>
  );
}
