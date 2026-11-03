import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Card, Badge, PageHeader, Spinner, Field, Input, Button, Select, EmptyState } from '@/components/ui';
import { dateUtils } from '@/lib/date';
import { ROLE_LABELS, ACCOUNT_STATUS_LABELS } from '@/lib/labels';
import type { Profile, Role, Sector } from '@/lib/types';

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const isSuperior = user?.isSysadmin || user?.isSeniorLead || user?.isStudioLead || (user?.maxLevel ?? 0) >= 3;
  const [viewMode, setViewMode] = useState<'self' | 'other'>('self');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState({ tasksCompleted: 0, tasksPending: 0, readinessCount: 0, scheduleCount: 0, problemsReported: 0, mediaResponsible: 0 });
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [otherRoles, setOtherRoles] = useState<Role[]>([]);
  const [otherSectors, setOtherSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.profile.full_name ?? '');

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      if (isSuperior) {
        const { data: pData } = await supabase.from('profiles').select('id, auth_user_id, username, full_name, email, account_status').eq('account_status', 'active').order('full_name');
        setProfiles((pData ?? []) as Profile[]);
      }
      await loadStats(user.id);
      setLoading(false);
    })();
  }, [user]);

  const loadStats = async (uid: string) => {
    const [{ count: tc }, { count: tp }, { count: rc }, { count: sc }, { count: pr }, { count: mr }] = await Promise.all([
      supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).eq('completed_by', uid),
      supabase.from('checklist_tasks').select('*', { count: 'exact', head: true }).eq('assigned_to', uid).eq('status', 'pending'),
      supabase.from('readiness_confirmations').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('schedule_assignments').select('*', { count: 'exact', head: true }).eq('assigned_to', uid),
      supabase.from('problems').select('*', { count: 'exact', head: true }).eq('identified_by', uid),
      supabase.from('media_assets').select('*', { count: 'exact', head: true }).or(`editor_id.eq.${uid},publication_responsible_id.eq.${uid}`),
    ]);
    setStats({
      tasksCompleted: tc ?? 0, tasksPending: tp ?? 0, readinessCount: rc ?? 0,
      scheduleCount: sc ?? 0, problemsReported: pr ?? 0, mediaResponsible: mr ?? 0,
    });
  };

  const viewOtherUser = async (authUid: string) => {
    if (!authUid) { setOtherProfile(null); return; }
    setLoading(true);
    const [{ data: p }, { data: ur }, { data: us }] = await Promise.all([
      supabase.from('profiles').select('*').eq('auth_user_id', authUid).maybeSingle(),
      supabase.from('user_roles').select('role:roles(*)').eq('user_id', authUid),
      supabase.from('user_sectors').select('sector:sectors(*)').eq('user_id', authUid),
    ]);
    setOtherProfile(p as Profile | null);
    setOtherRoles(((ur ?? []) as any[]).map((x) => x.role).filter(Boolean) as Role[]);
    setOtherSectors(((us ?? []) as any[]).map((x) => x.sector).filter(Boolean) as Sector[]);
    await loadStats(authUid);
    setLoading(false);
  };

  const saveProfile = async () => {
    if (!user) return;
    await supabase.from('profiles').update({ full_name: fullName }).eq('id', user.profile.id);
    await refreshUser();
    setEditing(false);
  };

  if (loading && viewMode === 'self' && !otherProfile) return <Spinner />;
  if (!user) return null;

  const displayProfile = viewMode === 'other' && otherProfile ? otherProfile : user.profile;
  const displayRoles = viewMode === 'other' ? otherRoles : user.roles;
  const displaySectors = viewMode === 'other' ? otherSectors : user.sectors;
  const uid = viewMode === 'other' && otherProfile ? otherProfile.auth_user_id : user.id;

  return (
    <div>
      <PageHeader title={viewMode === 'other' ? 'Perfil de usuário' : 'Meu perfil'} description="Informações e estatísticas" />

      {isSuperior && (
        <Card className="mb-4 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Visualizar perfil de outro usuário</label>
              <Select value={selectedUserId} onChange={(e) => { setSelectedUserId(e.target.value); setViewMode(e.target.value ? 'other' : 'self'); if (e.target.value) viewOtherUser(e.target.value); }}>
                <option value="">Meu perfil</option>
                {profiles.filter((p) => p.auth_user_id !== user.id).map((p) => (
                  <option key={p.id} value={p.auth_user_id ?? p.id}>{p.full_name} (@{p.username})</option>
                ))}
              </Select>
            </div>
          </div>
        </Card>
      )}

      {viewMode === 'other' && !otherProfile && selectedUserId ? (
        <Spinner />
      ) : loading ? <Spinner /> : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Dados da conta</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-slate-500">Nome completo</dt>
                {viewMode === 'self' && editing ? (
                  <div className="mt-1 flex gap-2">
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    <Button size="sm" onClick={saveProfile}>Salvar</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>Cancelar</Button>
                  </div>
                ) : (
                  <dd className="mt-0.5 text-slate-800">
                    {displayProfile.full_name}
                    {viewMode === 'self' && <button onClick={() => { setFullName(displayProfile.full_name); setEditing(true); }} className="ml-2 text-xs text-[#8B2635] hover:underline">Editar</button>}
                  </dd>
                )}
              </div>
              <div><dt className="text-slate-500">Nome de usuário</dt><dd className="mt-0.5 text-slate-800">@{displayProfile.username}</dd></div>
              <div><dt className="text-slate-500">E-mail</dt><dd className="mt-0.5 text-slate-800">{displayProfile.email ?? '—'}</dd></div>
              <div><dt className="text-slate-500">Situação</dt><dd className="mt-0.5"><Badge tone={displayProfile.account_status === 'active' ? 'green' : 'amber'}>{ACCOUNT_STATUS_LABELS[displayProfile.account_status]}</Badge></dd></div>
              <div><dt className="text-slate-500">Funções</dt><dd className="mt-0.5 text-slate-800">{displayRoles.map((r) => ROLE_LABELS[r.key] ?? r.name).join(', ') || '—'}</dd></div>
              <div><dt className="text-slate-500">Setores</dt><dd className="mt-0.5 text-slate-800">{displaySectors.map((s) => s.name).join(', ') || '—'}</dd></div>
              <div><dt className="text-slate-500">Conta criada em</dt><dd className="mt-0.5 text-slate-800">{dateUtils.fmtDateBr(displayProfile.created_at)}</dd></div>
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Estatísticas</h2>
            <div className="grid grid-cols-2 gap-3">
              <StatBox label="Tarefas concluídas" value={stats.tasksCompleted} />
              <StatBox label="Tarefas pendentes" value={stats.tasksPending} />
              <StatBox label="Confirmações de prontidão" value={stats.readinessCount} />
              <StatBox label="Participações em escalas" value={stats.scheduleCount} />
              <StatBox label="Problemas registrados" value={stats.problemsReported} />
              <StatBox label="Cultos sob responsabilidade" value={stats.mediaResponsible} />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              As estatísticas representam atividades registradas. Mais registros de erros ou problemas não indicam pior desempenho — podem indicar maior engajamento na identificação de questões.
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <p className="text-2xl font-semibold text-[#8B2635]">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
