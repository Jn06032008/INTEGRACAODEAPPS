import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  Button, Card, Badge, Input, Textarea, Select, Field, PageHeader,
  Spinner, EmptyState, Modal,
} from '@/components/ui';
import { dateUtils } from '@/lib/date';
import { REPORT_STATUS, REPORT_SECTIONS, EVENT_STATUS } from '@/lib/labels';
import { useUserNames, displayName } from '@/lib/useUserNames';
import { auditLog } from '@/lib/helpers';
import type { Report, ReportSection, ChurchEvent } from '@/lib/types';
import { ReloadButton } from '@/components/ReloadButton';

export function ReportsPage({ onOpenReport }: { onOpenReport: (id: string) => void }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    let q = supabase.from('reports').select('*, event:events(*)').order('updated_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setReports((data ?? []) as Report[]);
    const { data: evts } = await supabase.from('events').select('*').order('start_at', { ascending: false }).limit(30);
    setEvents((evts ?? []) as ChurchEvent[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  return (
    <div>
      <PageHeader title="Relatórios" description="Relatórios dos cultos e eventos" actions={<div className="flex gap-2"><ReloadButton onClick={load} /><Button onClick={() => setShowForm(true)}>Novo relatório</Button></div>} />
      <div className="mb-4">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:max-w-xs">
          <option value="all">Todas as situações</option>
          {Object.entries(REPORT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>
      {loading ? <Spinner /> : reports.length === 0 ? (
        <EmptyState title="Nenhum relatório" description="Crie um relatório vinculado a um evento." action={<Button onClick={() => setShowForm(true)}>Novo relatório</Button>} />
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            {reports.map((r) => (
              <button key={r.id} onClick={() => onOpenReport(r.id)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.event?.name ?? 'Sem evento'}</p>
                  <p className="text-xs text-slate-500">{dateUtils.fmtDateTimeBr(r.updated_at)}</p>
                </div>
                <Badge tone={r.status === 'finalized' ? 'green' : r.status === 'in_review' ? 'blue' : 'neutral'}>{REPORT_STATUS[r.status]}</Badge>
              </button>
            ))}
          </div>
        </Card>
      )}
      {showForm && <ReportForm events={events} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function ReportForm({ events, onClose, onSaved }: { events: ChurchEvent[]; onClose: () => void; onSaved: () => void }) {
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('reports').insert({ event_id: eventId }).select().single();
    if (error) { setError(error.message); setLoading(false); return; }
    await auditLog('create', 'report', data.id, null, { event_id: eventId });
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Novo relatório">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Evento"><Select value={eventId} onChange={(e) => setEventId(e.target.value)} required>
          <option value="">Selecione...</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name} — {dateUtils.fmtDateBr(e.start_at)}</option>)}
        </Select></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Criar</Button></div>
      </form>
    </Modal>
  );
}

export function ReportDetailPage({ reportId, onBack }: { reportId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { names, loadNames } = useUserNames();
  const [report, setReport] = useState<Report | null>(null);
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [naMap, setNaMap] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewDecision, setReviewDecision] = useState('comment');

  const isSuperior = user?.isSysadmin || user?.isSeniorLead || user?.isStudioLead || (user?.maxLevel ?? 0) >= 3;

  const load = async () => {
    setLoading(true);
    const { data: r } = await supabase.from('reports').select('*, event:events(*)').eq('id', reportId).maybeSingle();
    setReport(r as Report | null);
    const { data: secs } = await supabase.from('report_sections').select('*').eq('report_id', reportId);
    const secList = (secs ?? []) as ReportSection[];
    setSections(secList);
    const { data: revs } = await supabase.from('report_reviews').select('*').eq('report_id', reportId).order('created_at', { ascending: false });
    setReviews(revs ?? []);
    const map: Record<string, string> = {};
    const na: Record<string, boolean> = {};
    REPORT_SECTIONS.forEach((s) => {
      const existing = secList.find((x) => x.section_key === s.key);
      map[s.key] = existing?.content ?? '';
      na[s.key] = existing?.not_applicable ?? false;
    });
    setEditing(map);
    setNaMap(na);
    loadNames([...secList.map((s) => s.authored_by).filter(Boolean) as string[], ...(revs ?? []).map((r: any) => r.author).filter(Boolean)]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [reportId]);

  const saveSection = async (key: string) => {
    if (!report) return;
    setSaving(true);
    const existing = sections.find((s) => s.section_key === key);
    const content = editing[key] ?? '';
    const notApplicable = naMap[key] ?? false;
    if (existing) {
      await supabase.from('report_sections').update({
        content, not_applicable: notApplicable, authored_by: user?.id, updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('report_sections').insert({
        report_id: report.id, section_key: key, content, not_applicable: notApplicable, authored_by: user?.id,
      });
    }
    setSaving(false);
    load();
  };

  const changeStatus = async (status: string) => {
    if (!report) return;
    await supabase.from('reports').update({ status }).eq('id', report.id);
    await auditLog('change_status', 'report', report.id, { status: report.status }, { status });
    load();
  };

  const addReview = async () => {
    if (!report || !reviewComment.trim()) return;
    await supabase.from('report_reviews').insert({
      report_id: report.id, comment: reviewComment, decision: reviewDecision, author: user?.id,
    });
    setReviewComment('');
    setReviewDecision('comment');
    load();
  };

  if (loading) return <Spinner />;
  if (!report) return <EmptyState title="Relatório não encontrado" />;

  const isFinalized = report.status === 'finalized';

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm text-slate-500 hover:text-slate-700">← Voltar</button>
      <PageHeader
        title={report.event?.name ?? 'Relatório'}
        description={`${REPORT_STATUS[report.status]} · ${dateUtils.fmtDateTimeBr(report.updated_at)}`}
        actions={
          <div className="flex gap-2">
            {!isFinalized && <Button variant="secondary" size="sm" onClick={() => changeStatus('in_review')}>Enviar para revisão</Button>}
            {!isFinalized && <Button size="sm" onClick={() => changeStatus('finalized')}>Finalizar</Button>}
            {isFinalized && <Button variant="secondary" size="sm" onClick={() => changeStatus('draft')}>Reabrir</Button>}
          </div>
        }
      />

      {isFinalized && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
          Este relatório está finalizado. As alterações posteriores ficam registradas no histórico.
        </div>
      )}

      <div className="space-y-4">
        {REPORT_SECTIONS.map((s) => {
          const sec = sections.find((x) => x.section_key === s.key);
          return (
            <Card key={s.key} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">{s.label}</h2>
                {sec?.authored_by && <span className="text-xs text-slate-400">Por {displayName(names, sec.authored_by)}</span>}
              </div>
              <Textarea
                rows={4}
                value={editing[s.key] ?? ''}
                onChange={(e) => setEditing({ ...editing, [s.key]: e.target.value })}
                placeholder="Descreva..."
                disabled={isFinalized}
              />
              <div className="mt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={naMap[s.key] ?? false} onChange={(e) => setNaMap({ ...naMap, [s.key]: e.target.checked })} disabled={isFinalized} />
                  Não se aplica
                </label>
                {!isFinalized && <Button size="sm" variant="secondary" onClick={() => saveSection(s.key)} loading={saving}>Salvar seção</Button>}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4 p-5">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Revisão do relatório</h2>
        <p className="mb-3 text-xs text-slate-500">Comentários e decisões de revisão ficam visíveis para todos os colaboradores.</p>
        {reviews.length === 0 && <p className="text-sm text-slate-500 mb-3">Nenhuma revisão ainda.</p>}
        {reviews.length > 0 && (
          <ul className="space-y-2 mb-4">
            {reviews.map((rv) => (
              <li key={rv.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700">{rv.comment}</span>
                  {rv.decision !== 'comment' && <Badge tone={rv.decision === 'approved' ? 'green' : 'amber'}>{rv.decision === 'approved' ? 'Aprovado' : 'Precisa de alterações'}</Badge>}
                </div>
                <p className="mt-0.5 text-xs text-slate-400">Por {displayName(names, rv.author)} · {dateUtils.fmtDateTimeBr(rv.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
        {!isFinalized && (
          <div className="space-y-2">
            <Textarea rows={2} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="Adicionar comentário de revisão..." />
            <div className="flex items-center gap-2">
              <Select value={reviewDecision} onChange={(e) => setReviewDecision(e.target.value)} className="max-w-xs">
                <option value="comment">Comentário</option>
                <option value="approved">Aprovar</option>
                <option value="needs_changes">Solicitar alterações</option>
              </Select>
              <Button size="sm" onClick={addReview} disabled={!reviewComment.trim()}>Enviar revisão</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
