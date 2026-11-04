import { useState, useEffect, type ReactNode } from 'react';
import { LayoutDashboard, CalendarDays, ClipboardList, FileText, TriangleAlert as AlertTriangle, Wrench, CalendarClock, Film, Users, Bell, ScrollText, Settings, User as UserIcon, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { classNames } from '@/lib/helpers';
import { ROLE_LABELS } from '@/lib/labels';


interface NavItem {
  key: string;
  label: string;
  icon: typeof LayoutDashboard;
  adminOnly?: boolean;
  superiorOnly?: boolean;
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'events', label: 'Cultos e eventos', icon: CalendarDays },
  { key: 'checklists', label: 'Checklists', icon: ClipboardList },
  { key: 'templates', label: 'Modelos de checklist', icon: ClipboardList },
  { key: 'reports', label: 'Relatórios', icon: FileText },
  { key: 'errors', label: 'Erros', icon: AlertTriangle },
  { key: 'occurrences', label: 'Ocorrências', icon: Users },
  { key: 'problems', label: 'Gestão de problemas', icon: Wrench },
  { key: 'schedules', label: 'Escalas', icon: CalendarClock },
  { key: 'media', label: 'Acervo de cultos', icon: Film },
  { key: 'users', label: 'Usuários e setores', icon: Users, adminOnly: true },
  { key: 'notifications', label: 'Notificações', icon: Bell },
  { key: 'audit', label: 'Histórico e auditoria', icon: ScrollText, superiorOnly: true },
  { key: 'profile', label: 'Meu perfil', icon: UserIcon },
  { key: 'settings', label: 'Configurações', icon: Settings },
];

interface ShellProps {
  current: string;
  onNavigate: (key: string) => void;
  unreadNotifs: number;
  children: ReactNode;
}

export function AppShell({ current, onNavigate, unreadNotifs, children }: ShellProps) {
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('darkMode') === 'true') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const isSuperior = user?.isSysadmin || user?.isSeniorLead || user?.isStudioLead || (user?.maxLevel ?? 0) >= 3;
  const items = NAV.filter((n) => {
    if (n.adminOnly && !user?.isSysadmin) return false;
    if (n.superiorOnly && !isSuperior) return false;
    return true;
  });

  const handleNav = (key: string) => {
    onNavigate(key);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] shadow-sm p-0.5">
            <img src="/111.png" alt="MMV" className="h-full w-full object-contain" />
          </div>
          <span className="font-bold text-[#8B2635]">Estudio 40</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-slate-600">
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-72 overflow-y-auto bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <span className="font-semibold text-slate-900">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="text-slate-400">
                <X size={20} />
              </button>
            </div>
            <NavList items={items} current={current} onNavigate={handleNav} unreadNotifs={unreadNotifs} user={user} onSignOut={signOut} />
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white lg:block">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] shadow-sm p-0.5">
              <img src="/111.png" alt="MMV" className="h-full w-full object-contain" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#8B2635]">Estudio 40</p>
              <p className="text-xs text-slate-400">Mudança de Vida</p>
            </div>
          </div>
          <NavList items={items} current={current} onNavigate={handleNav} unreadNotifs={unreadNotifs} user={user} onSignOut={signOut} />
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function NavList({
  items, current, onNavigate, unreadNotifs, user, onSignOut,
}: {
  items: NavItem[];
  current: string;
  onNavigate: (key: string) => void;
  unreadNotifs: number;
  user: ReturnType<typeof useAuth>['user'];
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <nav className="flex-1 space-y-0.5 px-3 py-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={classNames(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-[#8B2635] text-white' : 'text-slate-600 hover:bg-slate-100',
              )}
            >
              <Icon size={18} className={active ? 'text-white' : 'text-slate-400'} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.key === 'notifications' && unreadNotifs > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                  {unreadNotifs}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {user && (
        <div className="border-t border-slate-200 px-4 py-3">
          <div className="mb-2">
            <p className="truncate text-sm font-medium text-slate-900">{user.profile.full_name}</p>
            <p className="truncate text-xs text-slate-400">@{user.profile.username}</p>
            {user.roles.length > 0 && (
              <p className="mt-1 truncate text-xs text-slate-400">
                {user.roles.map((r) => ROLE_LABELS[r.key] ?? r.name).join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-600"
          >
            <LogOut size={16} /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
