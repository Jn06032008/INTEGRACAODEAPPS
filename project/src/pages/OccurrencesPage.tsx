import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  Button, Card, Badge, Input, Textarea, Select, Field, PageHeader,
  Spinner, EmptyState, Modal, ConfirmDialog,
} from '@/components/ui';
import { dateUtils } from '@/lib/date';
import { OCCURRENCE_TYPES, OCCURRENCE_STATUS } from '@/lib/labels';
import { useUserNames, displayName } from '@/lib/useUserNames';
import { auditLog } from '@/lib/helpers';
import { Trash2 } from 'lucide-react';
import { ReloadButton } from '@/components/ReloadButton';
import type { Occurrence, ChurchEvent } from '@/lib/types';

const PENALTY_LABELS: Record<string, string> = {
  none: 'Nenhuma',
  warning: 'Advertência',
  suspension: 'Suspensão',
  penalty: 'Castigo/Penalidade',
  dismissal: 'Desligamento',
};

export function OccurrencesPage() {
  const { user } = useAuth();
  const { names, loadNames } = useUserNames();
  const [items, setItems] = useState<Occurrence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [filters, setFilters] = useState({ type: 'all', status: 'all', search: '' });
  const [detailId, setDetailId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const isSuperior = user?.isSysadmin || user?.isSeniorLead || user?.isStudioLead || (user?.maxLevel ?? 0) >= 3;

  const load = async () => {
    setLoading(true);
    let q = supabase.from('occurrences').select('*, event:events(*)').order('created_at', { ascending: false });
    if (filters.type !== 'all') q = q.eq('occurrence_type', filters.type);
    if (filters.status !== 'all') q = q.eq('status', filters.status);
    const { data } = await q;
    setItems((data ?? []) as Occurrence[]);
    const { data: evts } = await supabase.from('events').select('*').order('start_at', { ascending: false }).limit(30);
    setEvents((evts ?? []) as ChurchEvent[]);
    loadNames((data ?? []).map((o: any) => o.created_by).filter(Boolean));
    setLoading(false);
  };

  useEffect(() => { load(); }, [filters.type, filters.status]);

  const filtered = items.filter((o) =>
    !filters.search || o.person_name.toLowerCase().includes(filters.search.toLowerCase()) || (o.description ?? '').toLowerCase().includes(filters.search.toLowerCase()),
  );

  if (detailId) {
    return <OccurrenceDetail occurrenceId={detailId} onBack={() => { setDetailId(null); load(); }} />;
  }

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('occurrences').delete().eq('id', deleteId);
    await auditLog('delete', 'occurrence', deleteId, null, null);
    setDeleteId(null);
    load();
  };

  return (
    <div>
      <PageHeader title="Ocorrências" description="Registros de conduta, penalidades e ações disciplinares" actions={
        <div className="flex gap-2">
          <ReloadButton onClick={load} />
          <Button onClick={() => setShowForm(true)}>Nova ocorrência</Button>
        </div>
      } />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input placeholder="Buscar por nome..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <Select value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="all">Todos os tipos</option>
          {Object.entries(OCCURRENCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="all">Todas as situações</option>
          {Object.entries(OCCURRENCE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState title="Nenhuma ocorrência" description="Registre uma ocorrência de conduta ou penalidade." />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Contra</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Penalidade</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                  <th className="px-4 py-3 font-medium">Aberta em</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((o) => (
                  <tr key={o.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetailId(o.id)}>
                    <td className="px-4 py-3 font-medium text-slate-900">{o.person_name}</td>
                    <td className="px-4 py-3"><Badge tone="neutral">{OCCURRENCE_TYPES[o.occurrence_type] ?? o.occurrence_type}</Badge></td>
                    <td className="px-4 py-3 text-slate-600">{o.penalty ? PENALTY_LABELS[o.penalty_type ?? 'none'] ?? o.penalty : '—'}</td>
                    <td className="px-4 py-3"><Badge tone={o.status === 'resolved' || o.status === 'closed' ? 'green' : o.status === 'in_review' ? 'blue' : 'amber'}>{OCCURRENCE_STATUS[o.status] ?? o.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{dateUtils.fmtDateTimeBr(o.created_at)}</td>
                    <td className="px-4 py-3">
                      {user?.isSysadmin && <button onClick={(e) => { e.stopPropagation(); setDeleteId(o.id); }} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && <OccurrenceForm events={events} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir ocorrência"
        message="Tem certeza? Esta ação removerá a ocorrência e suas revisões."
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}

function OccurrenceDetail({ occurrenceId, onBack }: { occurrenceId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { names, loadNames } = useUserNames();
  const [occ, setOcc] = useState<Occurrence | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewDecision, setReviewDecision] = useState('comment');

  const isSuperior = user?.isSysadmin || user?.isSeniorLead || user?.isStudioLead || (user?.maxLevel ?? 0) >= 3;

  const load = async () => {
    setLoading(true);
    const [{ data: o }, { data: revs }] = await Promise.all([
      supabase.from('occurrences').select('*, event:events(*)').eq('id', occurrenceId).maybeSingle(),
      supabase.from('occurrence_reviews').select('*').eq('occurrence_id', occurrenceId).order('created_at', { ascending: false }),
    ]);
    setOcc(o as Occurrence | null);
    setReviews(revs ?? []);
    if (o) loadNames([o.created_by, ...(revs ?? []).map((r: any) => r.reviewer).filter(Boolean)]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [occurrenceId]);

  const addReview = async () => {
    if (!occ || !reviewComment.trim() && reviewDecision === 'comment') return;
    const newStatus = reviewDecision === 'approved' ? 'resolved' : reviewDecision === 'rejected' ? 'closed' : reviewDecision === 'closed' ? 'closed' : occ.status;
    await supabase.from('occurrences').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', occ.id);
    await supabase.from('occurrence_reviews').insert({
      occurrence_id: occ.id, decision: reviewDecision, comment: reviewComment || null, reviewer: user?.id,
    });
    setReviewComment('');
    setReviewDecision('comment');
    load();
  };

  if (loading) return <Spinner />;
  if (!occ) return <EmptyState title="Ocorrência não encontr" />;

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm text-slate-500 hover:text-slate-700">← Voltar</button>
      <PageHeader
        title={`Ocorrência: ${occ.person_name}`}
        description={`${OCCURRENCE_TYPES[occ.occurrence_type] ?? occ.occurrence_type} · ${OCCURRENCE_STATUS[occ.status] ?? occ.status}`}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Detalhes da ocorrência</h2>
            <dl className="space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><dt className="text-slate-500">Contra (pessoa)</dt><dd className="mt-0.5 text-slate-800 font-medium">{occ.person_name}</dd></div>
                <div><dt className="text-slate-500">Tipo</dt><dd className="mt-0.5"><Badge tone="neutral">{OCCURRENCE_TYPES[occ.occurrence_type] ?? occ.occurrence_type}</Badge></dd></div>
                <div><dt className="text-slate-500">Aberta por</dt><dd className="mt-0.5 text-slate-800">{displayName(names, occ.created_by)}</dd></div>
                <div><dt className="text-slate-500">Aberta em</dt><dd className="mt-0.5 text-slate-800">{dateUtils.fmtDateTimeBr(occ.created_at)}</dd></div>
                {occ.occurrence_date && <div><dt className="text-slate-500">Ocorrido em</dt><dd className="mt-0.5 text-slate-800">{dateUtils.fmtDateTimeBr(occ.occurrence_date)}</dd></div>}
                {occ.event?.name && <div><dt className="text-slate-500">Evento relacionado</dt><dd className="mt-0.5 text-slate-800">{occ.event.name}</dd></div>}
              </div>
              {occ.description && <div><dt className="text-slate-500">Descrição do ocorrido</dt><dd className="mt-0.5 whitespace-pre-wrap text-slate-800">{occ.description}</dd></div>}
              {occ.action_taken && <div><dt className="text-slate-500">Ação imediata tomada</dt><dd className="mt-0.5 text-slate-800">{occ.action_taken}</dd></div>}
            </dl>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Penalidade</h2>
            <dl className="space-y-2 text-sm">
              <div><dt className="text-slate-500">Tipo de penalidade</dt><dd className="mt-0.5"><Badge tone={occ.penalty_type === 'dismissal' ? 'red' : occ.penalty_type === 'suspension' || occ.penalty_type === 'penalty' ? 'amber' : 'neutral'}>{PENALTY_LABELS[occ.penalty_type ?? 'none'] ?? 'Nenhuma'}</Badge></dd></div>
              {occ.penalty && <div><dt className="text-slate-500">Penalidade aplicada</dt><dd className="mt-0.5 text-slate-800">{occ.penalty}</dd></div>}
              {occ.penalty_details && <div><dt className="text-slate-500">Detalhes da penalidade</dt><dd className="mt-0.5 text-slate-800">{occ.penalty_details}</dd></div>}
            </dl>
          </Card>
        </div>

        <div className="space-y-4">
          {isSuperior && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">Revisão (superiores)</h2>
              {reviews.length > 0 && (
                <ul className="space-y-2 mb-3">
                  {reviews.map((rv) => (
                    <li key={rv.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <Badge tone={rv.decision === 'approved' ? 'green' : rv.decision === 'rejected' || rv.decision === 'closed' ? 'red' : 'neutral'}>
                          {rv.decision === 'approved' ? 'Aprovada' : rv.decision === 'rejected' ? 'Rejeitada' : rv.decision === 'closed' ? 'Fechada' : 'Comentário'}
                        </Badge>
                      </div>
                      {rv.comment && <p className="mt-1 text-slate-600">{rv.comment}</p>}
                      <p className="mt-0.5 text-xs text-slate-400">Por {displayName(names, rv.reviewer)} · {dateUtils.fmtDateTimeBr(rv.created_at)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="space-y-2">
                <Textarea rows={2} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Comentário de revisão..." />
                <Select value={reviewDecision} onChange={(e) => setReviewDecision(e.target.value)}>
                  <option value="comment">Comentário</option>
                  <option value="approved">Aprovar (resolve)</option>
                  <option value="rejected">Rejeitar (fecha)</option>
                  <option value="closed">Fechar</option>
                </Select>
                <Button size="sm" className="w-full" onClick={addReview}>Enviar revisão</Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function OccurrenceForm({ events, onClose, onSaved }: { events: ChurchEvent[]; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [form, setForm] = useState({
    person_name: '', occurrence_type: 'comportamento', description: '',
    event_id: '', action_taken: '', penalty_type: 'warning', penalty: '', penalty_details: '',
    occurrence_date: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('occurrences').insert({
      person_name: form.person_name,
      occurrence_type: form.occurrence_type,
      description: form.description || null,
      event_id: form.event_id || null,
      action_taken: form.action_taken || null,
      penalty: form.penalty || null,
      penalty_type: form.penalty_type,
      penalty_details: form.penalty_details || null,
      occurrence_date: form.occurrence_date ? new Date(form.occurrence_date).toISOString() : null,
    }).select().single();
    if (error) { setError(error.message); setLoading(false); return; }
    await auditLog('create', 'occurrence', data.id, null, { person_name: form.person_name });
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Nova ocorrência" size="lg">
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Nome da pessoa (contra quem)<"><Input value={form.person_name} onChange={set('person_name')} required /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de ocorrência"><Select value={form.occurrence_type} onChange={set('occurrence_type')}>
            {Object.entries(OCCURRENCE_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select></Field>
          <Field label="Quando ocorreu"><Input type="datetime-local" value={form.occurrence_date} onChange={set('occurrence_date')} /></Field>
        </div>
        <Field label="Evento relacionado (opcional)"><Select value={form.event_id} onChange={set('event_id')}>
          <option value="">—</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name} — {dateUtils.fmtDateBr(e.start_at)}</option>)}
        </Select></Field>
        <Field label="Descrição do ocorrido"><Textarea rows={3} value={form.description} onChange={set('description')} /></Field>
        <Field label="Ação imediata tomada"><Textarea rows={2} value={form.action_taken} onChange={set('action_taken')} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo de penalidade"><Select value={form.penalty_type} onChange={set('penalty_type')}>
            {Object.entries(PENALTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select></Field>
          <Field label="Penalidade (resumo)"><Input value={form.penalty} onChange={set('penalty')} placeholder="ex: Suspensão de 2 cultos" /></Field>
        </div>
        <Field label="Detalhes da penalidade"><Textarea rows={2} value={form.penalty_details} onChange={set('penalty_details')} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Registrar</Button></div>
      </form>
    </Modal>
  );
}
