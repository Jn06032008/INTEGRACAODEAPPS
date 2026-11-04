import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, Spinner, Badge, PageHeader } from '@/components/ui';
import { dateUtils } from '@/lib/date';
import {
  PROBLEM_STATUS, PRIORITY_LABELS, MEDIA_STATUS, READINESS_STATES,
} from '@/lib/labels';
import { useUserNames, displayName } from '@/lib/useUserNames';
import type { ChurchEvent, Problem, ChecklistTask, MediaAsset, ScheduleAssignment } from '@/lib/types';
import { TriangleAlert as AlertTriangle, ClipboardList, Wrench, Film, CalendarClock, CalendarDays } from 'lucide-react';

interface DashboardData {
  nextEvent: ChurchEvent | null;
  pendingTasks: ChecklistTask[];
  criticalProblems: Problem[];
  awaitingAuthProblems: Problem[];
  authorizedTests: Problem[];
  executingSolutions: Problem[];
  pendingReports: { id: string; event: ChurchEvent }[];
  recentMedia: MediaAsset[];
  schedulePending: ScheduleAssignment[];
}

export function DashboardPage({ onNavigate }: { onNavigate: (key: string) => void }) {
  const { user } = useAuth();
  const { names, loadNames } = useUserNames();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const now = new Date().toISOString();

      const [{ data: events }, { data: problems }, { data: tasks }, { data: reports }, { data: media }, { data: schedules }] = await Promise.all([
        supabase.from('events').select('*').gte('start_at', now).order('start_at', { ascending: true }).limit(5),
        supabase.from('problems').select('*').order('updated_at', { ascending: false }),
        supabase.from('checklist_tasks').select('*, run:checklist_runs(event:events(*))').eq('status', 'pending').limit(20),
        supabase.from('reports').select('id, event:events(*)').neq('status', 'finalized').limit(10),
        supabase.from('media_assets').select('*').order('cult_date', { ascending: false }).limit(8),
        supabase.from('schedule_assignments').select('*').neq('status', 'closed').limit(30),
      ]);

      const probList = (problems ?? []) as Problem[];
      const critical = probList.filter((p) =>
        (p.priority === 'critical' || p.priority === 'high') &&
        !['resolved_validated', 'rejected', 'suspended'].includes(p.status),
      );
      const awaitingAuth = probList.filter((p) => p.status === 'awaiting_authorization');
      const authorizedTests = probList.filter((p) => p.status === 'authorized' || p.status === 'in_test');
      const executing = probList.filter((p) =>
        ['in_execution', 'resolved_pending_validation'].includes(p.status),
      );

      const pendingReports = (reports ?? []).map((r: any) => ({ id: r.id, event: r.event as ChurchEvent }))
        .filter((r) => r.event);

      const ids = new Set<string>();
      probList.forEach((p) => { if (p.identified_by) ids.add(p.identified_by); });
      (tasks ?? []).forEach((t: any) => { if (t.assigned_to) ids.add(t.assigned_to); });
      (media ?? []).forEach((m) => { if (m.status_reported_by) ids.add(m.status_reported_by); });
      loadNames(Array.from(ids));

      setData({
        nextEvent: (events?.[0] as ChurchEvent) ?? null,
        pendingTasks: (tasks ?? []) as ChecklistTask[],
        criticalProblems: critical,
        awaitingAuthProblems: awaitingAuth,
        authorizedTests: authorizedTests,
        executingSolutions: executing,
        pendingReports,
        recentMedia: (media ?? []) as MediaAsset[],
        schedulePending: (schedules ?? []) as ScheduleAssignment[],
      });
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !data) {
    return <Spinner className="py-16" />;
  }

  const checklistPct = data.pendingTasks.length === 0
    ? 100
    : Math.round(((1 - data.pendingTasks.length / Math.max(data.pendingTasks.length, 1)) * 100));

  return (
    <div>
      <PageHeader
        title={`Olá, ${user?.profile.full_name.split(' ')[0] ?? ''}`}
        description="Visão geral da operação do estúdio"
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={AlertTriangle} label="Problemas críticos/urgentes" value={data.criticalProblems.length} tone="red" onClick={() => onNavigate('problems')} />
        <StatCard icon={ClipboardList} label="Tarefas pendentes" value={data.pendingTasks.length} tone="amber" onClick={() => onNavigate('checklists')} />
        <StatCard icon={Wrench} label="Aguardando autorização" value={data.awaitingAuthProblems.length} tone="blue" onClick={() => onNavigate('problems')} />
        <StatCard icon={Film} label="Cultos no acervo recentes" value={data.recentMedia.length} tone="slate" onClick={() => onNavigate('media')} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Próximo culto ou evento</h2>
            <CalendarDays size={18} className="text-slate-400" />
          </div>
          {data.nextEvent ? (
            <div>
              <p className="text-base font-semibold text-slate-900">{data.nextEvent.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {dateUtils.fmtDateTimeBr(data.nextEvent.start_at)}
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>Tarefas pendentes do checklist</span>
                  <span>{data.pendingTasks.length}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#8B2635]" style={{ width: `${checklistPct}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhum evento futuro cadastrado.</p>
          )}
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Escala e prontidão do próximo culto</h2>
            <CalendarClock size={18} className="text-slate-400" />
          </div>
          {data.schedulePending.length > 0 ? (
            <div className="space-y-2">
              {data.schedulePending.slice(0, 5).map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{s.role_name}</p>
                    <p className="text-xs text-slate-500">{s.sector}</p>
                  </div>
                  <Badge tone={s.assigned_to ? 'blue' : 'amber'}>
                    {s.assigned_to ? displayName(names, s.assigned_to) : 'Sem designação'}
                  </Badge>
                </div>
              ))}
              <button onClick={() => onNavigate('schedules')} className="text-sm font-medium text-[#8B2635] hover:underline">
                Ver escala completa →
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Nenhuma escala em preparo.</p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Problemas críticos e urgentes</h2>
          {data.criticalProblems.length > 0 ? (
            <ul className="space-y-2">
              {data.criticalProblems.slice(0, 6).map((p) => (
                <li key={p.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">{p.code}</span>
                    <Badge tone={p.priority === 'critical' ? 'red' : 'amber'}>{PRIORITY_LABELS[p.priority]}</Badge>
                  </div>
                  <p className="mt-0.5 text-slate-600">{p.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{PROBLEM_STATUS[p.status]}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Nenhum problema crítico em aberto.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Relatórios a concluir</h2>
          {data.pendingReports.length > 0 ? (
            <ul className="space-y-2">
              {data.pendingReports.slice(0, 6).map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-800">{r.event.name}</p>
                  <p className="text-xs text-slate-400">{dateUtils.fmtDateBr(r.event.start_at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Nenhum relatório pendente.</p>
          )}
        </Card>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Soluções em execução / validação</h2>
          {data.executingSolutions.length > 0 ? (
            <ul className="space-y-2">
              {data.executingSolutions.slice(0, 6).map((p) => (
                <li key={p.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-800">{p.code} — {p.title}</p>
                  <p className="text-xs text-slate-400">{PROBLEM_STATUS[p.status]}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Nenhuma solução em execução.</p>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Acervo recente</h2>
          {data.recentMedia.length > 0 ? (
            <ul className="space-y-2">
              {data.recentMedia.slice(0, 6).map((m) => (
                <li key={m.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800">
                      {dateUtils.fmtDateBr(m.cult_date)} — {m.preacher || 'Sem pregador'}
                    </span>
                    <Badge tone={m.status === 'published' ? 'green' : m.status === 'not_found' || m.status === 'reported_lost' ? 'red' : 'neutral'}>
                      {MEDIA_STATUS[m.status]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Informado por: {displayName(names, m.status_reported_by)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Nenhum culto cadastrado no acervo.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon, label, value, tone, onClick,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: number;
  tone: 'red' | 'amber' | 'blue' | 'slate';
  onClick: () => void;
}) {
  const tones = {
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <button onClick={onClick} className="text-left">
      <Card className="p-4 transition-shadow hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon size={20} />
          </div>
          <div>
            <p className="text-2xl font-semibold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
      </Card>
    </button>
  );
}
