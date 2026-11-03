import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';
import { LoginPage } from '@/pages/LoginPage';
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
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [eventId, setEventId] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);
  const [problemId, setProblemId] = useState<string | null>(null);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false);
      setUnreadNotifs(count ?? 0);
    })();
  }, [user, page]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const navigate = (key: string) => {
    setEventId(null);
    setReportId(null);
    setProblemId(null);
    setPage(key);
  };

  const renderPage = () => {
    if (page === 'events' && eventId) {
      return <EventDetailPage eventId={eventId} onBack={() => setEventId(null)} onNavigate={(k) => navigate(k)} />;
    }
    if (page === 'reports' && reportId) {
      return <ReportDetailPage reportId={reportId} onBack={() => setReportId(null)} />;
    }
    if (page === 'problems' && problemId) {
      return <ProblemDetailPage problemId={problemId} onBack={() => setProblemId(null)} />;
    }

    switch (page) {
      case 'dashboard': return <DashboardPage onNavigate={navigate} />;
      case 'events': return <EventsPage onOpenEvent={(id) => setEventId(id)} />;
      case 'checklists': return <ChecklistsPage />;
      case 'templates': return <TemplatesPage />;
      case 'reports': return <ReportsPage onOpenReport={(id) => setReportId(id)} />;
      case 'errors': return <ErrorsPage />;
      case 'occurrences': return <OccurrencesPage />;
      case 'problems': return <ProblemsPage onOpenProblem={(id) => setProblemId(id)} />;
      case 'schedules': return <SchedulesPage />;
      case 'media': return <MediaPage />;
      case 'users': return <UsersPage />;
      case 'notifications': return <NotificationsPage />;
      case 'audit': return <AuditPage />;
      case 'profile': return <ProfilePage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage onNavigate={navigate} />;
    }
  };

  return (
    <AppShell current={page} onNavigate={navigate} unreadNotifs={unreadNotifs}>
      {renderPage()}
    </AppShell>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
