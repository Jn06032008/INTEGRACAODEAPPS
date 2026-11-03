import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  Button, Card, Badge, Input, Textarea, Select, Field, PageHeader,
  Spinner, EmptyState, Modal, ConfirmDialog,
} from '@/components/ui';
import { dateUtils } from '@/lib/date';
import {
  PROBLEM_STATUS, PROBLEM_STATUS_KEYS, IMPACT_LABELS, URGENCY_LABELS,
  PRIORITY_LABELS, SECTOR_NAMES, APPROVAL_STATUS,
} from '@/lib/labels';
import { useUserNames, displayName } from '@/lib/useUserNames';
import { auditLog } from '@/lib/helpers';
import { UserSelect } from '@/components/UserSelect';
import { pushNotification } from '@/lib/helpers';
import { Trash2 } from 'lucide-react';
import { ReloadButton } from '@/components/ReloadButton';
import type { Problem, ProblemUpdate, Solution, ApprovalRequest, ChurchEvent } from '@/lib/types';

export function ProblemsPage({ onOpenProblem }: { onOpenProblem: (id: string) => void }) {
  const { user } = useAuth();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [deleteProblemId, setDeleteProblemId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('problems').select('*, event:events(*)').order('updated_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (priorityFilter !== 'all') q = q.eq('priority', priorityFilter);
    const { data } = await q;
    setProblems((data ?? []) as Problem[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, priorityFilter]);

  const filtered = problems.filter((p) =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader title="Gestão de problemas" description="Acompanhe pendências até a resolução" actions={<div className="flex gap-2"><ReloadButton onClick={load} /><Button onClick={() => setShowForm(true)}>Novo problema</Button></div>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Buscar por título ou código..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:max-w-xs">
          <option value="all">Todas as situações</option>
          {PROBLEM_STATUS_KEYS.map((k) => <option key={k} value={k}>{PROBLEM_STATUS[k]}</option>)}
        </Select>
        <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="sm:max-w-xs">
          <option value="all">Todas as prioridades</option>
          {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState title="Nenhum problema" description="Registre um problema para acompanhamento." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Código</th>
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="px-4 py-3 font-medium">Prioridade</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  <th className="px-4 py-3 font-medium">Atualizado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="cursor-pointer hover:bg-slate-50" onClick={() => onOpenProblem(p.id)}>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.code}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{p.title}</td>
                    <td className="px-4 py-3">
                      <Badge tone={p.priority === 'critical' ? 'red' : p.priority === 'high' ? 'amber' : 'neutral'}>
                        {PRIORITY_LABELS[p.priority]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{PROBLEM_STATUS[p.status]}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{dateUtils.fmtDateTimeBr(p.updated_at)}</td>
                    <td className="px-4 py-3">{user?.isSysadmin && <button onClick={(e) => { e.stopPropagation(); setDeleteProblemId(p.id); }} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && <ProblemForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      <ConfirmDialog
        open={!!deleteProblemId}
        onClose={() => setDeleteProblemId(null)}
        onConfirm={async () => {
          if (!deleteProblemId) return;
          await supabase.from('problems').delete().eq('id', deleteProblemId);
          await auditLog('delete', 'problem', deleteProblemId, null, null);
          setDeleteProblemId(null);
          load();
        }}
        title="Excluir problema"
        message="Tem certeza? Esta ação removerá o problema e todos os seus registros relacionados."
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}

function ProblemForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sector, setSector] = useState('');
  const [impact, setImpact] = useState('low');
  const [urgency, setUrgency] = useState('normal');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('problems').insert({
      title, description, sector: sector || null, impact, urgency, priority, category: category || null,
    }).select().single();
    if (error) { setError(error.message); setLoading(false); return; }
    await auditLog('create', 'problem', data.id, null, { title });
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Novo problema" size="lg">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Título"><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
        <Field label="Descrição"><Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Setor"><Select value={sector} onChange={(e) => setSector(e.target.value)}>
            <option value="">—</option>
            {SECTOR_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select></Field>
          <Field label="Categoria"><Input value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Impacto"><Select value={impact} onChange={(e) => setImpact(e.target.value)}>
            {Object.entries(IMPACT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select></Field>
          <Field label="Urgência"><Select value={urgency} onChange={(e) => setUrgency(e.target.value)}>
            {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select></Field>
          <Field label="Prioridade"><Select value={priority} onChange={(e) => setPriority(e.target.value)}>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select></Field>
        </div>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Registrar</Button></div>
      </form>
    </Modal>
  );
}

export function ProblemDetailPage({ problemId, onBack }: { problemId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { names, loadNames } = useUserNames();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [updates, setUpdates] = useState<ProblemUpdate[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSolution, setShowSolution] = useState(false);
  const [showApproval, setShowApproval] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [showConfirmCause, setShowConfirmCause] = useState(false);
  const [causeText, setCauseText] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: up }, { data: sol }, { data: ap }] = await Promise.all([
      supabase.from('problems').select('*, event:events(*)').eq('id', problemId).maybeSingle(),
      supabase.from('problem_updates').select('*').eq('problem_id', problemId).order('created_at', { ascending: false }),
      supabase.from('solutions').select('*').eq('problem_id', problemId).order('created_at', { ascending: false }),
      supabase.from('approval_requests').select('*').eq('problem_id', problemId).order('created_at', { ascending: false }),
    ]);
    setProblem(p as Problem | null);
    setUpdates((up ?? []) as ProblemUpdate[]);
    setSolutions((sol ?? []) as Solution[]);
    setApprovals((ap ?? []) as ApprovalRequest[]);
    const ids = new Set<string>();
    if (p?.identified_by) ids.add(p.identified_by);
    (up ?? []).forEach((u: any) => { if (u.author) ids.add(u.author); });
    (sol ?? []).forEach((s: any) => { if (s.created_by) ids.add(s.created_by); });
    loadNames(Array.from(ids));
    setLoading(false);
  };

  useEffect(() => { load(); }, [problemId]);

  const changeStatus = async () => {
    if (!problem || !newStatus) return;
    const prev = problem.status;
    await supabase.from('problems').update({ status: newStatus }).eq('id', problem.id);
    await supabase.from('problem_updates').insert({
      problem_id: problem.id, previous_status: prev, new_status: newStatus, comment: statusComment || null, author: user?.id,
    });
    setNewStatus(''); setStatusComment('');
    load();
  };

  const confirmCause = async () => {
    if (!problem) return;
    await supabase.from('problems').update({
      confirmed_cause: causeText, confirmed_by: user?.id, confirmed_at: new Date().toISOString(),
    }).eq('id', problem.id);
    await supabase.from('problem_updates').insert({
      problem_id: problem.id, action: 'cause_confirmed', comment: causeText, author: user?.id,
    } as any);
    setShowConfirmCause(false);
    load();
  };

  if (loading) return <Spinner />;
  if (!problem) return <EmptyState title="Problema não encontrado" />;

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm text-slate-500 hover:text-slate-700">← Voltar</button>
      <PageHeader
        title={problem.title}
        description={`${problem.code} · ${PROBLEM_STATUS[problem.status]}`}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Detalhes</h2>
            <dl className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><dt className="text-slate-500">Impacto</dt><dd className="mt-0.5"><Badge tone="neutral">{IMPACT_LABELS[problem.impact]}</Badge></dd></div>
                <div><dt className="text-slate-500">Urgência</dt><dd className="mt-0.5"><Badge tone="neutral">{URGENCY_LABELS[problem.urgency]}</Badge></dd></div>
                <div><dt className="text-slate-500">Prioridade</dt><dd className="mt-0.5"><Badge tone={problem.priority === 'critical' ? 'red' : 'amber'}>{PRIORITY_LABELS[problem.priority]}</Badge></dd></div>
                <div><dt className="text-slate-500">Setor</dt><dd className="mt-0.5 text-slate-800">{problem.sector || '—'}</dd></div>
                <div><dt className="text-slate-500">Identificado por</dt><dd className="mt-0.5 text-slate-800">{displayName(names, problem.identified_by)}</dd></div>
                <div><dt className="text-slate-500">Identificado em</dt><dd className="mt-0.5 text-slate-800">{dateUtils.fmtDateTimeBr(problem.identified_at)}</dd></div>
              </div>
              {problem.description && <div><dt className="text-slate-500">Descrição</dt><dd className="mt-0.5 whitespace-pre-wrap text-slate-800">{problem.description}</dd></div>}
              {problem.confirmed_cause && <div className="rounded-lg bg-blue-50 p-3"><dt className="text-blue-700">Causa confirmada</dt><dd className="mt-0.5 text-slate-800">{problem.confirmed_cause}</dd><p className="mt-1 text-xs text-slate-400">Confirmada por {displayName(names, problem.confirmed_by)} em {dateUtils.fmtDateTimeBr(problem.confirmed_at)}</p></div>}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Propostas de solução</h2>
            {solutions.length === 0 ? <p className="text-sm text-slate-500">Nenhuma proposta registrada.</p> : (
              <ul className="space-y-3">
                {solutions.map((s) => (
                  <li key={s.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                    <p className="font-medium text-slate-800">{s.description}</p>
                    {s.rationale && <p className="mt-1 text-slate-600">Motivo: {s.rationale}</p>}
                    {s.risks && <p className="text-slate-600">Riscos: {s.risks}</p>}
                    <p className="mt-1 text-xs text-slate-400">Por {displayName(names, s.created_by)} · {dateUtils.fmtDateTimeBr(s.created_at)}</p>
                  </li>
                ))}
              </ul>
            )}
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => setShowSolution(true)}>Nova proposta</Button>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Histórico</h2>
            {updates.length === 0 ? <p className="text-sm text-slate-500">Sem registros.</p> : (
              <ul className="space-y-2">
                {updates.map((u) => (
                  <li key={u.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <p className="text-slate-700">
                      {u.previous_status && <span>{PROBLEM_STATUS[u.previous_status] ?? u.previous_status} → </span>}
                      {u.new_status && <span className="font-medium">{PROBLEM_STATUS[u.new_status] ?? u.new_status}</span>}
                    </p>
                    {u.comment && <p className="mt-0.5 text-slate-600">{u.comment}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">{dateUtils.fmtDateTimeBr(u.created_at)} · por {displayName(names, u.author)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Mudar situação</h2>
            <div className="space-y-2">
              <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                <option value="">Selecione...</option>
                {PROBLEM_STATUS_KEYS.map((k) => <option key={k} value={k}>{PROBLEM_STATUS[k]}</option>)}
              </Select>
              <Textarea rows={2} placeholder="Justificativa (opcional)" value={statusComment} onChange={(e) => setStatusComment(e.target.value)} />
              <Button size="sm" className="w-full" onClick={changeStatus} disabled={!newStatus}>Atualizar</Button>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Causa</h2>
            {problem.confirmed_cause ? (
              <p className="text-sm text-slate-600">Causa já confirmada.</p>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => { setCauseText(problem.proposed_solution ?? ''); setShowConfirmCause(true); }}>Confirmar causa</Button>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Autorizações</h2>
            {approvals.length === 0 ? <p className="text-sm text-slate-500">Nenhuma solicitação.</p> : (
              <ul className="space-y-3">
                {approvals.map((a) => (
                  <li key={a.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700">{a.scope || 'Solicitação'}</span>
                      <Badge tone={a.status === 'approved' ? 'green' : a.status === 'rejected' ? 'red' : 'amber'}>{APPROVAL_STATUS[a.status] ?? a.status}</Badge>
                    </div>
                    {a.authorized_users && <p className="mt-1 text-xs text-slate-500">Autorizado para: {displayName(names, a.authorized_users)}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">Solicitado por {displayName(names, a.requested_by)} · {dateUtils.fmtDateTimeBr(a.created_at)}</p>
                    {a.status === 'pending' && (user?.isSysadmin || user?.isSeniorLead || user?.isStudioLead) && (
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="secondary" onClick={async () => {
                          await supabase.from('approval_requests').update({ status: 'approved' }).eq('id', a.id);
                          await supabase.from('approval_decisions').insert({ approval_request_id: a.id, decision: 'approved', decided_by: user?.id });
                          if (a.requested_by) await pushNotification(a.requested_by, 'Autorização aprovada', `Sua solicitação foi aprovada.`, 'problems');
                          load();
                        }}>Aprovar</Button>
                        <Button size="sm" variant="danger" onClick={async () => {
                          await supabase.from('approval_requests').update({ status: 'rejected' }).eq('id', a.id);
                          await supabase.from('approval_decisions').insert({ approval_request_id: a.id, decision: 'rejected', decided_by: user?.id });
                          if (a.requested_by) await pushNotification(a.requested_by, 'Autorização rejeitada', `Sua solicitação foi rejeitada.`, 'problems');
                          load();
                        }}>Rejeitar</Button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Button size="sm" variant="secondary" className="mt-2" onClick={() => setShowApproval(true)}>Solicitar autorização</Button>
          </Card>
        </div>
      </div>

      {showSolution && <SolutionForm problemId={problem.id} onClose={() => setShowSolution(false)} onSaved={() => { setShowSolution(false); load(); }} />}
      {showApproval && <ApprovalForm problemId={problem.id} solutions={solutions} onClose={() => setShowApproval(false)} onSaved={() => { setShowApproval(false); load(); }} />}
      {showConfirmCause && (
        <Modal open onClose={() => setShowConfirmCause(false)} title="Confirmar causa">
          <Field label="Descrição da causa confirmada"><Textarea rows={4} value={causeText} onChange={(e) => setCauseText(e.target.value)} /></Field>
          <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={() => setShowConfirmCause(false)}>Cancelar</Button><Button onClick={confirmCause}>Confirmar</Button></div>
        </Modal>
      )}
    </div>
  );
}

function SolutionForm({ problemId, onClose, onSaved }: { problemId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ description: '', rationale: '', resources_needed: '', risks: '', effects: '', executors: '', test_method: '', success_criteria: '', revert_plan: '' });
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.from('solutions').insert({ problem_id: problemId, ...form, needs_authorization: true });
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Nova proposta de solução" size="lg">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Descrição técnica ou operacional"><Textarea rows={2} value={form.description} onChange={set('description')} required /></Field>
        <Field label="Por que pode funcionar"><Textarea rows={2} value={form.rationale} onChange={set('rationale')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Recursos necessários"><Input value={form.resources_needed} onChange={set('resources_needed')} /></Field>
          <Field label="Riscos conhecidos"><Input value={form.risks} onChange={set('risks')} /></Field>
        </div>
        <Field label="Pessoas capacitadas"><UserSelect value={form.executors} onChange={(uid) => setForm({ ...form, executors: uid })} placeholder="Selecione o usuário capacitado..." /></Field>
        <Field label="Forma de testar"><Input value={form.test_method} onChange={set('test_method')} /></Field>
        <Field label="Critérios de sucesso"><Input value={form.success_criteria} onChange={set('success_criteria')} /></Field>
        <Field label="Plano de reversão"><Textarea rows={2} value={form.revert_plan} onChange={set('revert_plan')} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Registrar</Button></div>
      </form>
    </Modal>
  );
}

function ApprovalForm({ problemId, solutions, onClose, onSaved }: { problemId: string; solutions: Solution[]; onClose: () => void; onSaved: () => void }) {
  const [solutionId, setSolutionId] = useState('');
  const [scope, setScope] = useState('');
  const [authorizedUsers, setAuthorizedUsers] = useState('');
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.from('approval_requests').insert({
      problem_id: problemId,
      solution_id: solutionId || null,
      scope, authorized_users: authorizedUsers,
      deadline: deadline || null,
    });
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Solicitar autorização">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Solução relacionada"><Select value={solutionId} onChange={(e) => setSolutionId(e.target.value)}>
          <option value="">—</option>
          {solutions.map((s) => <option key={s.id} value={s.id}>{s.description.slice(0, 60)}</option>)}
        </Select></Field>
        <Field label="Escopo da autorização"><Textarea rows={2} value={scope} onChange={(e) => setScope(e.target.value)} required /></Field>
        <Field label="Pessoas autorizadas"><UserSelect value={authorizedUsers} onChange={setAuthorizedUsers} placeholder="Selecione quem terá autorização..." /></Field>
        <p className="text-xs text-slate-400">Pessoas autorizadas são aquelas que receberão permissão para executar a solução aprovada.</p>
        <Field label="Prazo"><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Solicitar</Button></div>
      </form>
    </Modal>
  );
}
