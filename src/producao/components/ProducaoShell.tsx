import { useEffect, useState, type ReactNode, type ComponentType } from "react";
import {
  LayoutDashboard, PackageSearch, QrCode, ArrowUpFromLine, ArrowDownToLine,
  ClipboardCheck, AlertTriangle, Sparkles, Wrench, Building2, Users,
  FileBarChart, Boxes, History, Settings, Menu as MenuIcon, Bell, CalendarDays, X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { classNames } from "@/lib/helpers";
import { APP_NOME, APP_SUBTITULO, MINISTERIO, UNIDADE, PAPEIS } from "@/producao/lib/constants";
import { useProducaoAuth, nomeUsuario } from "@/producao/lib/auth";

type MenuItem = { grupo?: string; key: string; label: string; icon: ComponentType<{ className?: string }> };

const MENU: MenuItem[] = [
  { grupo: "Início", key: "painel", label: "Início", icon: LayoutDashboard },
  { key: "retirar", label: "Pegar", icon: ArrowUpFromLine },
  { key: "devolver", label: "Devolver", icon: ArrowDownToLine },
  { key: "escanear", label: "Ler QR Code", icon: QrCode },
  { grupo: "Equipamentos", key: "inventario", label: "Inventário", icon: PackageSearch },
  { key: "kits", label: "Kits", icon: Boxes },
  { key: "reservas", label: "Reservas", icon: CalendarDays },
  { key: "movimentacoes", label: "Histórico", icon: History },
  { key: "avisos", label: "Avisos", icon: Bell },
  { grupo: "Cuidados", key: "limpeza", label: "Limpeza e revisão", icon: Sparkles },
  { key: "manutencao", label: "Manutenção", icon: Wrench },
  { key: "assistencia", label: "Assistência técnica", icon: Building2 },
  { grupo: "Gestão", key: "pendencias", label: "Precisa de atenção", icon: AlertTriangle },
  { key: "conferencia", label: "Conferir devoluções", icon: ClipboardCheck },
  { key: "usuarios", label: "Usuários", icon: Users },
  { key: "relatorios", label: "Relatórios", icon: FileBarChart },
  { key: "configuracoes", label: "Configurações", icon: Settings },
];

const NAV_INFERIOR = [
  { key: "painel", label: "Início", icon: LayoutDashboard },
  { key: "retirar", label: "Pegar", icon: ArrowUpFromLine },
  { key: "devolver", label: "Devolver", icon: ArrowDownToLine },
  { key: "inventario", label: "Equipam.", icon: PackageSearch },
];

export type Pagina = string;

export function ProducaoShell({ current, onNavigate, children }: { current: string; onNavigate: (key: string) => void; children: ReactNode }) {
  const { perfil, user, papeis } = useProducaoAuth();
  const [menuAberto, setMenuAberto] = useState(false);
  const [naoLidos, setNaoLidos] = useState(0);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let c = false;
    supabase.from("producao_notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("lida", false)
      .then(({ count }) => { if (!c) setNaoLidos(count ?? 0); });
    return () => { c = true; };
  }, [userId, current]);

  function ir(key: string) { onNavigate(key); setMenuAberto(false); }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-[#1a1a1a] text-white lg:flex">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-lg font-bold">{APP_NOME}</p>
          <p className="text-xs text-white/60">{APP_SUBTITULO}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {MENU.map((item) => (
            <div key={item.key}>
              {item.grupo && <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-white/40">{item.grupo}</p>}
              <button onClick={() => ir(item.key)} className={classNames("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", current === item.key ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white")}>
                <item.icon className="h-4 w-4" />{item.label}
              </button>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 px-4 py-4 text-xs text-white/60">
          <p className="font-semibold text-white/90">{MINISTERIO}</p><p>{UNIDADE}</p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-[#8B2635] text-white">
          <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
            <button onClick={() => setMenuAberto(true)} className="shrink-0 rounded-lg p-1.5 hover:bg-white/10 lg:hidden"><MenuIcon className="h-5 w-5" /></button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold leading-tight">{APP_NOME}</p>
              <p className="truncate text-xs text-white/70">{APP_SUBTITULO}</p>
            </div>
            <button onClick={() => ir("avisos")} className="relative shrink-0 rounded-lg p-1.5 hover:bg-white/10">
              <Bell className="h-5 w-5" />
              {naoLidos > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{naoLidos > 9 ? "9+" : naoLidos}</span>}
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{nomeUsuario(perfil, user)}</p>
              <p className="text-xs text-white/60">{papeis.map((p) => PAPEIS[p] ?? p).join(", ") || "Sem perfil"}</p>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 lg:px-8 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-5 border-t border-slate-200 bg-white lg:hidden">
        {NAV_INFERIOR.map((item) => (
          <button key={item.key} onClick={() => ir(item.key)} className={classNames("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", current === item.key ? "text-[#8B2635]" : "text-slate-500")}>
            <item.icon className="h-5 w-5" />{item.label}
          </button>
        ))}
        <button onClick={() => setMenuAberto(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-slate-500">
          <MenuIcon className="h-5 w-5" />Menu
        </button>
      </nav>

      {menuAberto && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMenuAberto(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] overflow-y-auto bg-[#1a1a1a] px-3 pb-24 pt-5 text-white">
            <div className="mb-4 flex items-center justify-between px-3">
              <div><p className="font-bold">{APP_NOME}</p><p className="text-xs text-white/60">{APP_SUBTITULO}</p></div>
              <button onClick={() => setMenuAberto(false)} className="rounded-lg p-1.5 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </div>
            {MENU.map((item) => (
              <div key={item.key}>
                {item.grupo && <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-white/40">{item.grupo}</p>}
                <button onClick={() => ir(item.key)} className={classNames("flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium", current === item.key ? "bg-white/15 text-white" : "text-white/80 hover:bg-white/10")}>
                  <item.icon className="h-4 w-4" />{item.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
