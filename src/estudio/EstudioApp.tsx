import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { AppShell } from '@/components/AppShell';
import { Spinner } from '@/components/ui';
import { DashboardPage } from '@/pages/DashboardPage';
import { EventsPage, EventDetailPage } from '@/pages/EventsPage';
import { ChecklistsPage, TemplatesPage } from '@/pages/ChecklistsPage';
import { ReportsPage, ReportDetailPage } from '@/pages/ReportsPage';
import { ErrorsPage } from '@/pages/ErrorsPage';
import { OccurrencesPage } from '@/pages/OccurrencesPage';
import { ProblemsPage, ProblemDetailPage } from '@/pages/ProblemsPage';
import { SchedulesPage } from '@/pages/SchedulesPage';
import { MediaPage } from '@/pages/MediaPage';
import { UsersPage } from '@/pages/UsersPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { AuditPage } from '@/pages/AuditPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { SettingsPage } from '@/pages/SettingsPage';

type Detalhe = { key: 'events' | 'problems' | 'reports'; id: string };

export function EstudioApp() {
  return (
    <AuthProvider>
      <EstudioConteudo />
    </AuthProvider>
  );
}

function EstudioConteudo() {
  const { user, loading, authError } = useAuth();
  const [pagina, setPagina] = useState('dashboard');
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null);
  const [naoLidas, setNaoLidas] = useState(0);

  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelado = false;
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false)
      .then(({ count, error }) => {
        if (!cancelado && !error) setNaoLidas(count ?? 0);
      });
    return () => {
      cancelado = true;
    };
  }, [userId, pagina]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto mt-16 max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="font-medium text-slate-900">Não foi possível carregar o Estúdio</p>
        <p className="mt-2 text-sm text-slate-600">{authError ?? 'Seu perfil do Estúdio não foi encontrado. Procure a administração.'}</p>
      </div>
    );
  }

  const navegar = (key: string) => {
    setDetalhe(null);
    setPagina(key);
  };

  const abrirDetalhe = (key: Detalhe['key']) => (id: string) => setDetalhe({ key, id });
  const voltar = () => setDetalhe(null);

  const conteudo = () => {
    if (detalhe?.key === 'events') return <EventDetailPage eventId={detalhe.id} onBack={voltar} onNavigate={navegar} />;
    if (detalhe?.key === 'problems') return <ProblemDetailPage problemId={detalhe.id} onBack={voltar} />;
    if (detalhe?.key === 'reports') return <ReportDetailPage reportId={detalhe.id} onBack={voltar} />;

    switch (pagina) {
      case 'dashboard': return <DashboardPage onNavigate={navegar} />;
      case 'events': return <EventsPage onOpenEvent={abrirDetalhe('events')} />;
      case 'checklists': return <ChecklistsPage />;
      case 'templates': return <TemplatesPage />;
      case 'reports': return <ReportsPage onOpenReport={abrirDetalhe('reports')} />;
      case 'errors': return <ErrorsPage />;
      case 'occurrences': return <OccurrencesPage />;
      case 'problems': return <ProblemsPage onOpenProblem={abrirDetalhe('problems')} />;
      case 'schedules': return <SchedulesPage />;
      case 'media': return <MediaPage />;
      case 'users': return <UsersPage />;
      case 'notifications': return <NotificationsPage />;
      case 'audit': return <AuditPage />;
      case 'profile': return <ProfilePage />;
      case 'settings': return <SettingsPage />;
      default: return null;
    }
  };

  return (
    <AppShell current={detalhe?.key ?? pagina} onNavigate={navegar} unreadNotifs={naoLidas}>
      {conteudo()}
    </AppShell>
  );
}
