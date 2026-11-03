import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  PackageSearch,
  QrCode,
  ArrowUpFromLine,
  ArrowDownToLine,
  ClipboardCheck,
  AlertTriangle,
  Sparkles,
  Wrench,
  Building2,
  Users,
  FileBarChart,
  Boxes,
  History,
  Settings,
  Menu as MenuIcon,
  LogOut,
  ArrowLeft,
  Bell,
  CalendarDays,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { APP_NOME, APP_SUBTITULO, MINISTERIO, UNIDADE, PAPEIS } from "@/lib/constants";
import { InstalarApp } from "@/components/InstalarApp";
import { useAuth, nomeUsuario } from "@/lib/auth";

const MENU = [
  { grupo: "Início", to: "/painel", label: "Início", icon: LayoutDashboard },
  { to: "/retirar", label: "Pegar", icon: ArrowUpFromLine },
  { to: "/devolver", label: "Devolver", icon: ArrowDownToLine },
  { to: "/escanear", label: "Ler QR Code", icon: QrCode },
  { grupo: "Equipamentos", to: "/inventario", label: "Inventário", icon: PackageSearch },
  { to: "/kits", label: "Kits", icon: Boxes },
  { to: "/reservas", label: "Reservas", icon: CalendarDays },
  { to: "/movimentacoes", label: "Histórico", icon: History },
  { to: "/avisos", label: "Avisos", icon: Bell },
  { grupo: "Cuidados", to: "/limpeza", label: "Limpeza e revisão", icon: Sparkles },
  { to: "/manutencao", label: "Manutenção", icon: Wrench },
  { to: "/assistencia", label: "Assistência técnica", icon: Building2 },
  { grupo: "Gestão", to: "/pendencias", label: "Precisa de atenção", icon: AlertTriangle },
  { to: "/conferencia", label: "Conferir devoluções", icon: ClipboardCheck },
  { to: "/usuarios", label: "Usuários", icon: Users },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as { grupo?: string; to: string; label: string; icon: typeof Bell }[];

const NAV_INFERIOR = [
  { to: "/painel", label: "Início", icon: LayoutDashboard },
  { to: "/retirar", label: "Pegar", icon: ArrowUpFromLine },
  { to: "/devolver", label: "Devolver", icon: ArrowDownToLine },
  { to: "/inventario", label: "Equipam.", icon: PackageSearch },
] as const;

export function AppShell({
  titulo,
  descricao,
  acoes,
  children,
}: {
  titulo: string;
  descricao?: string;
  acoes?: ReactNode;
  children: ReactNode;
}) {
  const { perfil, user, papeis, sair } = useAuth();
  const navigate = useNavigate();
  const router = useRouter();
  const rotaAtual = useRouterState({ select: (s) => s.location.pathname });
  const mostrarVoltar = rotaAtual !== "/painel";
  const [menuAberto, setMenuAberto] = useState(false);

  const { data: naoLidos = 0 } = useQuery({
    queryKey: ["avisos-nao-lidos", user?.id],
    enabled: !!user?.id,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("lida", false);
      return count ?? 0;
    },
  });

  function voltar() {
    if (window.history.length > 1) router.history.back();
    else navigate({ to: "/painel" });
  }

  async function encerrar() {
    await sair();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-72 flex-col bg-brand-deep text-primary-foreground lg:flex">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="text-lg font-bold">{APP_NOME}</p>
          <p className="text-xs text-primary-foreground/70">{APP_SUBTITULO}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {MENU.map((item) => (
            <div key={item.to}>
            {item.grupo && <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-primary-foreground/50">{item.grupo}</p>}
            <Link
              to={item.to}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary-foreground/80 transition-colors hover:bg-white/10 hover:text-primary-foreground data-[status=active]:bg-white/15 data-[status=active]:text-primary-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
            </div>
          ))}
        </nav>
        <div className="mx-3 mb-3 rounded-2xl">
          <InstalarApp compacto />
        </div>
        <div className="border-t border-white/10 px-4 py-4 text-xs text-primary-foreground/70">
          <p className="font-semibold text-primary-foreground">{MINISTERIO}</p>
          <p>{UNIDADE}</p>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-border bg-primary text-primary-foreground">
          <div className="flex items-center gap-3 px-4 py-3 lg:px-8">
            {mostrarVoltar && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Voltar"
                onClick={voltar}
                className="shrink-0 text-primary-foreground hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
              <SheetTrigger asChild className="lg:hidden">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir menu"
                  className="text-primary-foreground hover:bg-white/10"
                >
                  <MenuIcon className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-80 overflow-y-auto overscroll-contain bg-brand-deep p-0 pb-[env(safe-area-inset-bottom)] text-primary-foreground"
              >
                <SheetTitle className="px-5 pt-5 text-base text-primary-foreground">
                  {APP_NOME}
                </SheetTitle>
                <p className="px-5 pb-3 text-xs text-primary-foreground/70">{APP_SUBTITULO}</p>
                <div className="mx-3 mb-3 rounded-2xl bg-card text-card-foreground">
                  <InstalarApp />
                </div>
                <nav className="space-y-1 px-3 pb-24">
                  {MENU.map((item) => (
                    <div key={item.to}>
                    {item.grupo && <p className="px-3 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wider text-primary-foreground/50">{item.grupo}</p>}
                    <Link
                      to={item.to}
                      onClick={() => setMenuAberto(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-primary-foreground/85 hover:bg-white/10 data-[status=active]:bg-white/15"
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                    </div>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold leading-tight">{titulo}</p>
              <p className="truncate text-xs text-primary-foreground/75">
                {descricao ?? `${MINISTERIO} — ${UNIDADE}`}
              </p>
            </div>

            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label={`Avisos${naoLidos > 0 ? `: ${naoLidos} não lido(s)` : ""}`}
              className="relative shrink-0 text-primary-foreground hover:bg-white/10"
            >
              <Link to="/avisos">
                <Bell className="h-5 w-5" />
                {naoLidos > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-danger-foreground">
                    {naoLidos > 9 ? "9+" : naoLidos}
                  </span>
                )}
              </Link>
            </Button>

            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold">{nomeUsuario(perfil, user)}</p>
              <p className="text-xs text-primary-foreground/70">
                {papeis.map((p) => PAPEIS[p]).join(", ") || "Sem perfil"}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Sair"
              onClick={() => void encerrar()}
              className="text-primary-foreground hover:bg-white/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
          {acoes && <div className="flex flex-wrap gap-2 px-4 pb-3 lg:px-8 [&>*]:min-w-0">{acoes}</div>}
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-4 lg:px-8 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 grid grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        {NAV_INFERIOR.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground data-[status=active]:text-primary"
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMenuAberto(true)}
          className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
        >
          <MenuIcon className="h-5 w-5" />
          Menu
        </button>
      </nav>
    </div>
  );
}
