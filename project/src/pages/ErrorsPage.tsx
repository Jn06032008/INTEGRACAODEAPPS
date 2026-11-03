import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  Button, Card, Badge, Input, Textarea, Select, Field, PageHeader,
  Spinner, EmptyState, Modal, ConfirmDialog,
} from '@/components/ui';
import { dateUtils } from '@/lib/date';
import {
  ERROR_CATEGORIES, SEVERITY_LABELS, ANALYSIS_STAGE_LABELS,
  SECTOR_NAMES,
} from '@/lib/labels';
import { useUserNames, displayName } from '@/lib/useUserNames';
import { auditLog } from '@/lib/helpers';
import type { OperationalError, ChurchEvent, Report, Problem } from '@/lib/types';
import { Trash2 } from 'lucide-react';
import { ReloadButton } from '@/components/ReloadButton';

export function ErrorsPage() {
  const { names, loadNames } = useUserNames();
  const [errors, setErrors] = useState<OperationalError[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [filters, setFilters] = useState({ category: 'all', severity: 'all', sector: 'all', status: 'all', search: '' });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('errors').select('*, event:events(*)').order('created_at', { ascending: false });
    if (filters.category !== 'all') q = q.eq('category', filters.category);
    if (filters.severity !== 'all') q = q.eq('severity', filters.severity);
    if (filters.sector !== 'all') q = q.eq('sector', filters.sector);
    if (filters.status !== 'all') q = q.eq('status', filters.status);
    const { data } = await q;
    setErrors((data ?? []) as OperationalError[]);
    const [{ data: evts }, { data: reps }, { data: probs }] = await Promise.all([
      supabase.from('events').select('*').order('start_at', { ascending: false }).limit(30),
      supabase.from('reports').select('id, event:events(*)').limit(30),
      supabase.from('problems').select('id, code, title').limit(30),
    ]);
    setEvents((evts ?? []) as ChurchEvent[]);
    setReports((reps ?? []) as unknown as Report[]);
    setProblems((probs ?? []) as Problem[]);
    loadNames((data ?? []).map((e: any) => e.created_by).filter(Boolean));
    setLoading(false);
  };

  useEffect(() => { load(); }, [filters.category, filters.severity, filters.sector, filters.status]);

  const filtered = errors.filter((e) =>
    !filters.search || e.title.toLowerCase().includes(filters.search.toLowerCase()),
  );

  if (detailId) {
    return <ErrorDetail errorId={detailId} onBack={() => { setDetailId(null); load(); }} />;
  }

  return (
    <div>
      <PageHeader title="Erros" description="Registros de erros técnicos durante cultos e eventos" actions={
        <div className="flex gap-2">
          <ReloadButton onClick={load} />
          <Button onClick={() => setShowForm(true)}>Registrar erro</Button>
        </div>
      } />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <Input placeholder="Buscar..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <Select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
          <option value="all">Categoria</option>
          {ERROR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select value={filters.severity} onChange={(e) => setFilters({ ...filters, severity: e.target.value })}>
          <option value="all">Gravidade</option>
          {Object.entries(SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })}>
          <option value="all">Setor</option>
          {SECTOR_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="all">Situação</option>
          <option value="open">Aberto</option>
          <option value="resolved">Resolvido</option>
          <option value="closed">Fechado</option>
        </Select>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState title="Nenhum erro registrado" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="px-4 py-3 font-medium">Evento</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Gravidade</th>
                  <th className="px-4 py-3 font-medium">Análise</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((e) => (
                  <tr key={e.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetailId(e.id)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{e.title}</p>
                      <p className="text-xs text-slate-400">Por {displayName(names, e.created_by)} · {dateUtils.fmtDateTimeBr(e.created_at)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{e.event?.name ?? '—'}</td>
                    <td className="px-4 py-3"><Badge tone="neutral">{e.category}</Badge></td>
                    <td className="px-4 py-3"><Badge tone={e.severity === 'critical' ? 'red' : e.severity === 'high' ? 'amber' : 'neutral'}>{SEVERITY_LABELS[e.severity]}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{ANALYSIS_STAGE_LABELS[e.analysis_stage]}</td>
                    <td className="px-4 py-3"><Badge tone={e.status === 'resolved' || e.status === 'closed' ? 'green' : 'amber'}>{e.status === 'open' ? 'Aberto' : e.status === 'resolved' ? 'Resolvido' : 'Fechado'}</Badge></td>
                    <td className="px-4 py-3"><button onClick={(ev) => { ev.stopPropagation(); setDeleteId(e.id); }} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && <ErrorForm events={events} reports={reports} problems={problems} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={async () => {
          if (!deleteId) return;
          await supabase.from('error_analysis_notes').delete().eq('error_id', deleteId);
          await supabase.from('errors').delete().eq('id', deleteId);
          await auditLog('delete', 'error', deleteId, null, null);
          setDeleteId(null);
          load();
        }}
        title="Excluir erro"
        message="Tem certeza? O registro do erro e suas notas de análise serão removidos."
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}

function ErrorDetail({ errorId, onBack }: { errorId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { names, loadNames } = useUserNames();
  const [err, setErr] = useState<OperationalError | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStage, setNewStage] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data: e }, { data: n }] = await Promise.all([
      supabase.from('errors').select('*, event:events(*)').eq('id', errorId).maybeSingle(),
      supabase.from('error_analysis_notes').select('*').eq('error_id', errorId).order('created_at', { ascending: false }),
    ]);
    setErr(e as OperationalError | null);
    setNotes(n ?? []);
    if (e) {
      loadNames([e.created_by, ...(n ?? []).map((x: any) => x.author).filter(Boolean)]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [errorId]);

  const updateStage = async () => {
    if (!err || !newStage) return;
    const prev = err.analysis_stage;
    await supabase.from('errors').update({ analysis_stage: newStage }).eq('id', err.id);
    await supabase.from('error_analysis_notes').insert({
      error_id: err.id, note: `Análise: ${ANALYSIS_STAGE_LABELS[newStage] ?? newStage}`, previous_stage: prev, new_stage: newStage, author: user?.id,
    });
    setNewStage('');
    load();
  };

  const updateStatus = async () => {
    if (!err || !newStatus) return;
    await supabase.from('errors').update({ status: newStatus }).eq('id', err.id);
    await auditLog('update_status', 'error', err.id, { status: err.status }, { status: newStatus });
    setNewStatus('');
    load();
  };

  const addNote = async () => {
    if (!err || !newNote.trim()) return;
    await supabase.from('error_analysis_notes').insert({
      error_id: err.id, note: newNote, author: user?.id,
    });
    setNewNote('');
    load();
  };

  if (loading) return <Spinner />;
  if (!err) return <EmptyState title="Erro não encontrado" />;

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm text-slate-500 hover:text-slate-700">← Voltar</button>
      <PageHeader title={err.title} description={`${err.category} · ${dateUtils.fmtDateTimeBr(err.created_at)}`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Detalhes</h2>
            <dl className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><dt className="text-slate-500">Evento</dt><dd className="mt-0.5 text-slate-800">{err.event?.name ?? '—'}</dd></div>
                <div><dt className="text-slate-500">Setor</dt><dd className="mt-0.5 text-slate-800">{err.sector ?? '—'}</dd></div>
                <div><dt className="text-slate-500">Gravidade</dt><dd className="mt-0.5"><Badge tone={err.severity === 'critical' ? 'red' : err.severity === 'high' ? 'amber' : 'neutral'}>{SEVERITY_LABELS[err.severity]}</Badge></dd></div>
                <div><dt className="text-slate-500">Situação</dt><dd className="mt-0.5"><Badge tone={err.status === 'resolved' || err.status === 'closed' ? 'green' : 'amber'}>{err.status === 'open' ? 'Aberto' : err.status === 'resolved' ? 'Resolvido' : 'Fechado'}</Badge></dd></div>
                <div><dt className="text-slate-500">Estágio de análise</dt><dd className="mt-0.5"><Badge tone="blue">{ANALYSIS_STAGE_LABELS[err.analysis_stage]}</Badge></dd></div>
                <div><dt className="text-slate-500">Registrado por</dt><dd className="mt-0.5 text-slate-800">{displayName(names, err.created_by)}</dd></div>
              </div>
              {err.description && <div><dt className="text-slate-500">Descrição</dt><dd className="mt-0.5 whitespace-pre-wrap text-slate-800">{err.description}</dd></div>}
              {err.impact && <div><dt className="text-slate-500">Impacto observado</dt><dd className="mt-0.5 text-slate-800">{err.impact}</dd></div>}
              {err.immediate_action && <div><dt className="text-slate-500">Ação imediata</dt><dd className="mt-0.5 text-slate-800">{err.immediate_action}</dd></div>}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Notas de análise</h2>
            {notes.length === 0 ? <p className="text-sm text-slate-500">Nenhuma nota ainda.</p> : (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                    <p className="text-slate-700">{n.note}</p>
                    {n.previous_stage && n.new_stage && <p className="mt-0.5 text-xs text-slate-400">{ANALYSIS_STAGE_LABELS[n.previous_stage] ?? n.previous_stage} → {ANALYSIS_STAGE_LABELS[n.new_stage] ?? n.new_stage}</p>}
                    <p className="mt-0.5 text-xs text-slate-400">{dateUtils.fmtDateTimeBr(n.created_at)} · por {displayName(names, n.author)}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex gap-2">
              <Input value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Adicionar nota de análise..." className="flex-1" />
              <Button size="sm" onClick={addNote} disabled={!newNote.trim()}>Adicionar</Button>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Avançar análise</h2>
            <Select value={newStage} onChange={(e) => setNewStage(e.target.value)}>
              <option value="">Selecione o estágio...</option>
              {Object.entries(ANALYSIS_STAGE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
            <Button size="sm" className="mt-2 w-full" onClick={updateStage} disabled={!newStage}>Atualizar análise</Button>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Mudar situação</h2>
            <Select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
              <option value="">Selecione...</option>
              <option value="open">Aberto</option>
              <option value="resolved">Resolvido</option>
              <option value="closed">Fechado</option>
            </Select>
            <Button size="sm" className="mt-2 w-full" onClick={updateStatus} disabled={!newStatus}>Atualizar situação</Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

function ErrorForm({ events, reports, problems, onClose, onSaved }: {
  events: ChurchEvent[]; reports: Report[]; problems: Problem[]; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: '', description: '', event_id: '', sector: '', category: 'Áudio',
    impact: '', severity: 'low', immediate_action: '', report_id: '', problem_id: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('errors').insert({
      title: form.title,
      description: form.description || null,
      event_id: form.event_id || null,
      sector: form.sector || null,
      category: form.category,
      impact: form.impact || null,
      severity: form.severity,
      immediate_action: form.immediate_action || null,
      report_id: form.report_id || null,
      problem_id: form.problem_id || null,
      occurred_at: form.event_id ? new Date().toISOString() : null,
    }).select().single();
    if (error) { setError(error.message); setLoading(false); return; }
    await auditLog('create', 'error', data.id, null, { title: form.title });
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Registrar erro" size="lg">
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Título"><Input value={form.title} onChange={set('title')} required /></Field>
        <Field label="Descrição objetiva"><Textarea rows={3} value={form.description} onChange={set('description')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Evento"><Select value={form.event_id} onChange={set('event_id')}>
            <option value="">—</option>
            {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </Select></Field>
          <Field label="Setor"><Select value={form.sector} onChange={set('sector')}>
            <option value="">—</option>
            {SECTOR_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria"><Select value={form.category} onChange={set('category')}>
            {ERROR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select></Field>
          <Field label="Gravidade"><Select value={form.severity} onChange={set('severity')}>
            {Object.entries(SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select></Field>
        </div>
        <Field label="Impacto observado"><Input value={form.impact} onChange={set('impact')} /></Field>
        <Field label="Ação imediata tomada"><Textarea rows={2} value={form.immediate_action} onChange={set('immediate_action')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Relatório relacionado"><Select value={form.report_id} onChange={set('report_id')}>
            <option value="">—</option>
            {reports.map((r: any) => <option key={r.id} value={r.id}>{r.event?.name ?? 'Relatório'}</option>)}
          </Select></Field>
          <Field label="Problema relacionado"><Select value={form.problem_id} onChange={set('problem_id')}>
            <option value="">—</option>
            {problems.map((p) => <option key={p.id} value={p.id}>{p.code} — {p.title}</option>)}
          </Select></Field>
        </div>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Registrar</Button></div>
      </form>
    </Modal>
  );
}
