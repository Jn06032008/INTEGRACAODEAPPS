import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  Button, Card, Badge, Input, Textarea, Select, Field, PageHeader,
  Spinner, EmptyState, Modal, ConfirmDialog,
} from '@/components/ui';
import { dateUtils } from '@/lib/date';
import { SCHEDULE_STATUS, READINESS_STATES, SECTOR_NAMES, POST_EXAMPLES } from '@/lib/labels';
import { useUserNames, displayName } from '@/lib/useUserNames';
import { pushNotification, auditLog } from '@/lib/helpers';
import { UserSelect } from '@/components/UserSelect';
import type { ScheduleAssignment, ReadinessConfirmation, ChurchEvent, ScheduleChangeLog } from '@/lib/types';
import { ReloadButton } from '@/components/ReloadButton';

export function SchedulesPage() {
  const { user } = useAuth();
  const { names, loadNames } = useUserNames();
  const [assignments, setAssignments] = useState<ScheduleAssignment[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState('all');
  const [confirm, setConfirm] = useState<ScheduleAssignment | null>(null);
  const [editAssign, setEditAssign] = useState<ScheduleAssignment | null>(null);
  const [changeLogs, setChangeLogs] = useState<ScheduleAssignment | null>(null);
  const [logs, setLogs] = useState<ScheduleChangeLog[]>([]);

  const canManage = user?.isStudioLead || user?.isSectorLead || user?.isSysadmin;

  const load = async () => {
    setLoading(true);
    let q = supabase.from('schedule_assignments').select('*, event:events(*), readiness:readiness_confirmations(*)').order('created_at', { ascending: false });
    if (selectedEvent !== 'all') q = q.eq('event_id', selectedEvent);
    const { data } = await q;
    setAssignments((data ?? []) as ScheduleAssignment[]);
    const { data: evts } = await supabase.from('events').select('*').order('start_at', { ascending: false }).limit(30);
    setEvents((evts ?? []) as ChurchEvent[]);
    loadNames((data ?? []).map((a: any) => a.assigned_to).filter(Boolean));
    setLoading(false);
  };

  useEffect(() => { load(); }, [selectedEvent]);

  const myAssignments = assignments.filter((a) => a.assigned_to === user?.id);

  const grouped = assignments.reduce<Record<string, ScheduleAssignment[]>>((acc, a) => {
    const key = a.event?.name ?? 'Sem evento';
    (acc[key] ??= []).push(a);
    return acc;
  }, {});

  const viewLogs = async (a: ScheduleAssignment) => {
    const { data } = await supabase.from('schedule_change_logs').select('*').eq('assignment_id', a.id).order('changed_at', { ascending: false });
    setLogs((data ?? []) as ScheduleChangeLog[]);
    setChangeLogs(a);
  };

  return (
    <div>
      <PageHeader title="Escalas" description="Designação e prontidão da equipe" actions={canManage ? <div className="flex gap-2"><ReloadButton onClick={load} /><Button onClick={() => setShowForm(true)}>Nova designação</Button></div> : undefined} />
      <div className="mb-4">
        <Select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="sm:max-w-xs">
          <option value="all">Todos os eventos</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name} — {dateUtils.fmtDateBr(e.start_at)}</option>)}
        </Select>
      </div>

      {myAssignments.length > 0 && (
        <Card className="mb-4 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Minha escala</h2>
          <div className="space-y-2">
            {myAssignments.map((a) => {
              const readiness = a.readiness as unknown as ReadinessConfirmation | null;
              return (
                <div key={a.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{a.role_name}</p>
                    <p className="text-xs text-slate-500">{a.sector} · {a.event?.name}</p>
                    {a.instructions && <p className="text-xs text-slate-400">Instruções: {a.instructions}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {readiness ? (
                      <Badge tone={readiness.state === 'ready' ? 'green' : readiness.state === 'not_ready' || readiness.state === 'needs_assistance' ? 'red' : 'amber'}>
                        {READINESS_STATES[readiness.state]}
                      </Badge>
                    ) : (
                      <Badge tone="neutral">Aguardando</Badge>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => setConfirm(a)}>Confirmar prontidão</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {loading ? <Spinner /> : assignments.length === 0 ? (
        <EmptyState title="Nenhuma designação" description="Crie designações para os eventos." />
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([eventName, list]) => {
            const total = list.length;
            const confirmed = list.filter((a) => (a.readiness as unknown as ReadinessConfirmation | null)).length;
            const unassigned = list.filter((a) => !a.assigned_to).length;
            return (
              <Card key={eventName} className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{eventName}</h2>
                    <p className="text-xs text-slate-500">{total} designações · {confirmed} confirmadas · {unassigned} sem designação</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {list.map((a) => {
                    const readiness = a.readiness as unknown as ReadinessConfirmation | null;
                    return (
                      <div key={a.id} className="flex flex-col gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium text-slate-800">{a.role_name}</p>
                          <p className="text-xs text-slate-500">{a.sector}{a.presentation_time ? ` · ${dateUtils.fmtTimeBr(a.presentation_time)}` : ''}</p>
                          <p className="text-xs text-slate-600">
                            {a.assigned_to ? displayName(names, a.assigned_to) : <span className="text-amber-600 font-medium">Sem designação</span>}
                          </p>
                          {readiness && (
                            <p className="text-xs text-slate-400">
                              {READINESS_STATES[readiness.state]} · {dateUtils.fmtDateTimeBr(readiness.confirmed_at)}
                              {readiness.observation && ` · ${readiness.observation}`}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {readiness && <Badge tone={readiness.state === 'ready' ? 'green' : readiness.state === 'not_ready' || readiness.state === 'needs_assistance' ? 'red' : 'amber'}>{READINESS_STATES[readiness.state]}</Badge>}
                          <Badge tone={a.status === 'published' ? 'blue' : a.status === 'closed' ? 'neutral' : 'amber'}>{SCHEDULE_STATUS[a.status]}</Badge>
                          {canManage && <Button size="sm" variant="ghost" onClick={() => setEditAssign(a)}>Editar</Button>}
                          <Button size="sm" variant="ghost" onClick={() => viewLogs(a)}>Histórico</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && <AssignmentForm events={events} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {confirm && <ReadinessModal assignment={confirm} onClose={() => setConfirm(null)} onSaved={() => { setConfirm(null); load(); }} />}
      {editAssign && <EditAssignmentModal assignment={editAssign} onClose={() => setEditAssign(null)} onSaved={() => { setEditAssign(null); load(); }} />}
      {changeLogs && (
        <Modal open onClose={() => setChangeLogs(null)} title="Histórico de alterações">
          {logs.length === 0 ? <p className="text-sm text-slate-500">Sem registros.</p> : (
            <ul className="space-y-2">
              {logs.map((l) => (
                <li key={l.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <p className="text-slate-700">{l.previous_assignment} → {l.new_assignment}</p>
                  {l.reason && <p className="text-slate-500">{l.reason}</p>}
                  <p className="text-xs text-slate-400">{dateUtils.fmtDateTimeBr(l.changed_at)} · por {displayName(names, l.changed_by)}</p>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}

function AssignmentForm({ events, onClose, onSaved }: { events: ChurchEvent[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ event_id: '', sector: '', role_name: '', assigned_to: '', instructions: '', presentation_time: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('schedule_assignments').insert({
      event_id: form.event_id,
      sector: form.sector,
      role_name: form.role_name,
      assigned_to: form.assigned_to || null,
      instructions: form.instructions || null,
      presentation_time: form.presentation_time ? new Date(form.presentation_time).toISOString() : null,
    }).select().single();
    if (error) { setError(error.message); setLoading(false); return; }
    await auditLog('create', 'schedule_assignment', data.id, null, { role_name: form.role_name });
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Nova designação" size="lg">
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Evento"><Select value={form.event_id} onChange={(e) => setForm({ ...form, event_id: e.target.value })} required>
          <option value="">Selecione...</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name} — {dateUtils.fmtDateBr(e.start_at)}</option>)}
        </Select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Setor"><Select value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} required>
            <option value="">Selecione...</option>
            {SECTOR_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select></Field>
          <Field label="Função/Posto"><Select value={form.role_name} onChange={(e) => setForm({ ...form, role_name: e.target.value })} required>
            <option value="">Selecione...</option>
            {POST_EXAMPLES.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select></Field>
        </div>
        <Field label="Usuário designado"><UserSelect value={form.assigned_to} onChange={(uid) => setForm({ ...form, assigned_to: uid })} placeholder="Opcional - sem designação" /></Field>
        <Field label="Instruções"><Textarea rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></Field>
        <Field label="Horário de apresentação"><Input type="datetime-local" value={form.presentation_time} onChange={(e) => setForm({ ...form, presentation_time: e.target.value })} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Criar</Button></div>
      </form>
    </Modal>
  );
}

function ReadinessModal({ assignment, onClose, onSaved }: { assignment: ScheduleAssignment; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [state, setState] = useState('ready');
  const [observation, setObservation] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const existing = assignment.readiness as unknown as ReadinessConfirmation | null;
    if (existing) {
      await supabase.from('readiness_confirmations').update({
        state, observation: observation || null, confirmed_at: new Date().toISOString(), user_id: user?.id,
      }).eq('id', existing.id);
    } else {
      await supabase.from('readiness_confirmations').insert({
        assignment_id: assignment.id, state, observation: observation || null, user_id: user?.id,
      });
    }
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Confirmar prontidão">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-600">Posto: <span className="font-medium">{assignment.role_name}</span> · {assignment.sector}</p>
        <Field label="Estado">
          <Select value={state} onChange={(e) => setState(e.target.value)}>
            {Object.entries(READINESS_STATES).filter(([k]) => k !== 'waiting').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </Field>
        <Field label="Observação"><Textarea rows={3} value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="Descreva a situação se houver ressalvas..." /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Confirmar</Button></div>
      </form>
    </Modal>
  );
}

function EditAssignmentModal({ assignment, onClose, onSaved }: { assignment: ScheduleAssignment; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const [assignedTo, setAssignedTo] = useState(assignment.assigned_to ?? '');
  const [roleName, setRoleName] = useState(assignment.role_name);
  const [instructions, setInstructions] = useState(assignment.instructions ?? '');
  const [status, setStatus] = useState(assignment.status);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const prev = `${assignment.role_name} → ${assignment.assigned_to ?? 'ninguém'}`;
    const next = `${roleName} → ${assignedTo || 'ninguém'}`;
    await supabase.from('schedule_assignments').update({
      assigned_to: assignedTo || null, role_name: roleName, instructions: instructions || null, status,
    }).eq('id', assignment.id);
    if (prev !== next || reason) {
      await supabase.from('schedule_change_logs').insert({
        assignment_id: assignment.id, previous_assignment: prev, new_assignment: next, reason: reason || null, changed_by: user?.id,
      });
    }
    if (assignedTo && assignedTo !== assignment.assigned_to) {
      await pushNotification(assignedTo, 'Escala atualizada', `Você foi designado para ${roleName} em ${assignment.event?.name ?? 'um evento'}.`, 'schedules');
    }
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Editar designação">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Função/Posto"><Input value={roleName} onChange={(e) => setRoleName(e.target.value)} required /></Field>
        <Field label="Usuário designado"><UserSelect value={assignedTo} onChange={setAssignedTo} placeholder="Vazio = sem designação" /></Field>
        <Field label="Instruções"><Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} /></Field>
        <Field label="Situação"><Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(SCHEDULE_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select></Field>
        <Field label="Motivo da alteração"><Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Obrigatório" required /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Salvar</Button></div>
      </form>
    </Modal>
  );
}
