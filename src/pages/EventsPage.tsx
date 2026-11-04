import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  Button, Card, Badge, Input, Textarea, Select, Field, PageHeader,
  Spinner, EmptyState, Modal, ConfirmDialog,
} from '@/components/ui';
import { dateUtils } from '@/lib/date';
import { EVENT_STATUS, WEEKDAY_LABELS } from '@/lib/labels';
import { auditLog } from '@/lib/helpers';
import type { ChurchEvent, EventPreset } from '@/lib/types';
import { CalendarDays, CircleCheck as CheckCircle2, Copy, Trash2, Plus } from 'lucide-react';
import { ReloadButton } from '@/components/ReloadButton';

export function EventsPage({ onOpenEvent }: { onOpenEvent: (id: string) => void }) {
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPresetForm, setShowPresetForm] = useState(false);
  const [presets, setPresets] = useState<EventPreset[]>([]);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    let q = supabase.from('events').select('*').order('start_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data } = await q;
    setEvents((data ?? []) as ChurchEvent[]);
    const { data: pData } = await supabase.from('event_presets').select('*').eq('is_active', true).order('weekday');
    setPresets((pData ?? []) as EventPreset[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const filtered = events.filter((e) =>
    !filter || e.name.toLowerCase().includes(filter.toLowerCase()) || e.event_type.toLowerCase().includes(filter.toLowerCase()),
  );

  const usePreset = async (preset: EventPreset) => {
    const now = new Date();
    const diff = (preset.weekday - now.getDay() + 7) % 7;
    const target = new Date(now);
    target.setDate(now.getDate() + diff);
    const [h, m] = preset.start_time.split(':');
    target.setHours(parseInt(h), parseInt(m), 0, 0);
    const startISO = target.toISOString();
    let endISO: string | null = null;
    if (preset.end_time) {
      const [eh, em] = preset.end_time.split(':');
      const endDate = new Date(target);
      endDate.setHours(parseInt(eh), parseInt(em), 0, 0);
      endISO = endDate.toISOString();
    }
    const { data, error } = await supabase.from('events').insert({
      name: preset.name, event_type: preset.event_type,
      start_at: startISO, end_at: endISO, observations: preset.observations,
    }).select().single();
    if (!error && data) {
      await auditLog('create', 'event', data.id, null, { name: preset.name, from_preset: true });
      load();
    }
  };

  return (
    <div>
      <PageHeader
        title="Cultos e eventos"
        description="Cadastro central de cultos e eventos"
        actions={
          <div className="flex gap-2">
            <ReloadButton onClick={load} />
            <Button variant="secondary" onClick={() => setShowPresetForm(true)}>Gerenciar presets</Button>
            <Button onClick={() => setShowForm(true)}>Novo evento</Button>
          </div>
        }
      />

      {presets.length > 0 && (
        <Card className="mb-4 p-4">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Presets rápidos</h2>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                onClick={() => usePreset(p)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700 hover:border-[#8B2635] hover:bg-blue-50"
                title={`Criar evento para ${WEEKDAY_LABELS[p.weekday]}`}
              >
                <CalendarDays size={15} className="text-slate-400" />
                {p.name}
                <span className="text-xs text-slate-400">{WEEKDAY_LABELS[p.weekday]} · {p.start_time.slice(0, 5)}</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input placeholder="Buscar por nome ou tipo..." value={filter} onChange={(e) => setFilter(e.target.value)} className="sm:max-w-xs" />
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:max-w-xs">
          <option value="all">Todas as situações</option>
          {Object.entries(EVENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState title="Nenhum evento encontrado" description="Cadastre o primeiro culto ou evento." action={<Button onClick={() => setShowForm(true)}>Novo evento</Button>} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Evento</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((e) => (
                  <tr key={e.id} className="cursor-pointer hover:bg-slate-50" onClick={() => onOpenEvent(e.id)}>
                    <td className="px-4 py-3 font-medium text-slate-900">{e.name}</td>
                    <td className="px-4 py-3 text-slate-600">{dateUtils.fmtDateTimeBr(e.start_at)}</td>
                    <td className="px-4 py-3 text-slate-600">{e.event_type}</td>
                    <td className="px-4 py-3"><Badge tone={e.status === 'completed' ? 'green' : e.status === 'cancelled' ? 'red' : 'blue'}>{EVENT_STATUS[e.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && <EventForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {showPresetForm && <PresetManager presets={presets} onClose={() => setShowPresetForm(false)} onSaved={() => { setShowPresetForm(false); load(); }} />}
    </div>
  );
}

function EventForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('culto');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.from('events').insert({
      name, event_type: eventType,
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      observations,
    }).select().single();
    if (error) { setError(error.message); setLoading(false); return; }
    await auditLog('create', 'event', data.id, null, { name, event_type: eventType });
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Novo evento">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Nome do evento"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Tipo de evento">
          <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
            <option value="culto">Culto</option>
            <option value="evento_especial">Evento especial</option>
            <option value="teste_tecnico">Teste técnico</option>
            <option value="manutencao">Manutenção</option>
          </Select>
        </Field>
        <Field label="Início"><Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required /></Field>
        <Field label="Término (opcional)"><Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></Field>
        <Field label="Observações"><Textarea rows={3} value={observations} onChange={(e) => setObservations(e.target.value)} /></Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={loading}>Salvar</Button>
        </div>
      </form>
    </Modal>
  );
}

function PresetManager({ presets, onClose, onSaved }: { presets: EventPreset[]; onClose: () => void; onSaved: () => void }) {
  const [list, setList] = useState<EventPreset[]>(presets);
  const [showForm, setShowForm] = useState(false);
  const { user } = useAuth();
  const canManage = user?.isSysadmin || user?.isStudioLead;

  const toggleActive = async (p: EventPreset) => {
    await supabase.from('event_presets').update({ is_active: !p.is_active }).eq('id', p.id);
    setList(list.map((x) => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
  };

  const remove = async (id: string) => {
    await supabase.from('event_presets').delete().eq('id', id);
    setList(list.filter((x) => x.id !== id));
  };

  return (
    <Modal open onClose={onClose} title="Presets de eventos" size="lg">
      <div className="space-y-3">
        <p className="text-sm text-slate-500">Crie modelos de eventos recorrentes. Ao clicar num preset, um evento é criado com a data da próxima ocorrência automaticamente.</p>
        {list.length === 0 && <p className="text-sm text-slate-500">Nenhum preset ainda.</p>}
        {list.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <div>
              <p className="text-sm font-medium text-slate-800">{p.name}</p>
              <p className="text-xs text-slate-500">{WEEKDAY_LABELS[p.weekday]} · {p.start_time.slice(0, 5)}{p.end_time ? ` – ${p.end_time.slice(0, 5)}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={p.is_active ? 'green' : 'neutral'}>{p.is_active ? 'Ativo' : 'Inativo'}</Badge>
              {canManage && <button onClick={() => toggleActive(p)} className="text-xs text-slate-500 hover:text-slate-700">{p.is_active ? 'Desativar' : 'Ativar'}</button>}
              {canManage && <button onClick={() => remove(p.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>}
            </div>
          </div>
        ))}
        {canManage && <Button size="sm" onClick={() => setShowForm(true)}><Plus size={16} /> Novo preset</Button>}
        {showForm && <PresetForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); onSaved(); }} />}
        <div className="flex justify-end"><Button variant="secondary" onClick={onClose}>Fechar</Button></div>
      </div>
    </Modal>
  );
}

function PresetForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('culto');
  const [weekday, setWeekday] = useState('3');
  const [startTime, setStartTime] = useState('19:30');
  const [endTime, setEndTime] = useState('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.from('event_presets').insert({
      name, event_type: eventType, weekday: parseInt(weekday),
      start_time: startTime, end_time: endTime || null,
      observations: observations || null,
    });
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Novo preset">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} required placeholder="ex: Culto de Quarta-Feira" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Dia da semana">
            <Select value={weekday} onChange={(e) => setWeekday(e.target.value)}>
              {Object.entries(WEEKDAY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </Field>
          <Field label="Tipo">
            <Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
              <option value="culto">Culto</option>
              <option value="evento_especial">Evento especial</option>
              <option value="teste_tecnico">Teste técnico</option>
              <option value="manutencao">Manutenção</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Horário de início"><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required /></Field>
          <Field label="Término (opcional)"><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></Field>
        </div>
        <Field label="Observações padrão"><Textarea rows={2} value={observations} onChange={(e) => setObservations(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Criar</Button></div>
      </form>
    </Modal>
  );
}

export function EventDetailPage({ eventId, onBack, onNavigate }: { eventId: string; onBack: () => void; onNavigate: (key: string) => void }) {
  const { user } = useAuth();
  const [event, setEvent] = useState<ChurchEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showConclude, setShowConclude] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle();
    setEvent(data as ChurchEvent | null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [eventId]);

  if (loading) return <Spinner />;
  if (!event) return <EmptyState title="Evento não encontrado" />;

  const concludeEvent = async () => {
    await supabase.from('events').update({
      status: 'completed',
      end_at: new Date().toISOString(),
    }).eq('id', event.id);
    await auditLog('conclude', 'event', event.id, { status: event.status }, { status: 'completed' });
    setShowConclude(false);
    load();
  };

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm text-slate-500 hover:text-slate-700">← Voltar</button>
      <PageHeader
        title={event.name}
        description={`${event.event_type} · ${dateUtils.fmtDateTimeBr(event.start_at)}`}
        actions={
          <div className="flex gap-2">
            {event.status !== 'completed' && event.status !== 'cancelled' && (
              <Button size="sm" onClick={() => setShowConclude(true)}><CheckCircle2 size={16} /> Concluir</Button>
            )}
            {user?.isSysadmin && <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>Excluir</Button>}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Informações</h2>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>Editar</Button>
          </div>
          <dl className="space-y-2 text-sm">
            <div><dt className="text-slate-500">Situação</dt><dd className="mt-0.5"><Badge tone={event.status === 'completed' ? 'green' : event.status === 'cancelled' ? 'red' : 'blue'}>{EVENT_STATUS[event.status]}</Badge></dd></div>
            <div><dt className="text-slate-500">Início</dt><dd className="mt-0.5 text-slate-800">{dateUtils.fmtDateTimeBr(event.start_at)}</dd></div>
            <div><dt className="text-slate-500">Término</dt><dd className="mt-0.5 text-slate-800">{event.end_at ? dateUtils.fmtDateTimeBr(event.end_at) : '—'}</dd></div>
            <div><dt className="text-slate-500">Observações</dt><dd className="mt-0.5 text-slate-800 whitespace-pre-wrap">{event.observations || '—'}</dd></div>
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Atalhos</h2>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="sm" onClick={() => onNavigate('checklists')}>Checklists</Button>
            <Button variant="secondary" size="sm" onClick={() => onNavigate('reports')}>Relatório</Button>
            <Button variant="secondary" size="sm" onClick={() => onNavigate('schedules')}>Escala</Button>
            <Button variant="secondary" size="sm" onClick={() => onNavigate('errors')}>Erros</Button>
          </div>
        </Card>
      </div>

      {editing && <EditEventModal event={event} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}
      <ConfirmDialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={async () => {
          await supabase.from('events').delete().eq('id', event.id);
          await auditLog('delete', 'event', event.id, { name: event.name }, null);
          setConfirmDelete(false);
          onBack();
        }}
        title="Excluir evento"
        message="Tem certeza? Esta ação removerá o evento e seus registros relacionados."
        confirmLabel="Excluir"
        danger
      />
      <ConfirmDialog
        open={showConclude}
        onClose={() => setShowConclude(false)}
        onConfirm={concludeEvent}
        title="Concluir evento"
        message="Confirmar que este evento foi realizado? A situação será alterada para 'Concluído' e o término será registrado agora."
        confirmLabel="Confirmar conclusão"
      />
    </div>
  );
}

function EditEventModal({ event, onClose, onSaved }: { event: ChurchEvent; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(event.name);
  const [eventType, setEventType] = useState(event.event_type);
  const [startAt, setStartAt] = useState(dateUtils.toInputDateTime(event.start_at));
  const [endAt, setEndAt] = useState(dateUtils.toInputDateTime(event.end_at));
  const [status, setStatus] = useState(event.status);
  const [observations, setObservations] = useState(event.observations ?? '');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.from('events').update({
      name, event_type: eventType, status,
      start_at: new Date(startAt).toISOString(),
      end_at: endAt ? new Date(endAt).toISOString() : null,
      observations,
    }).eq('id', event.id);
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Editar evento">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Tipo"><Select value={eventType} onChange={(e) => setEventType(e.target.value)}>
          <option value="culto">Culto</option>
          <option value="evento_especial">Evento especial</option>
          <option value="teste_tecnico">Teste técnico</option>
          <option value="manutencao">Manutenção</option>
        </Select></Field>
        <Field label="Situação"><Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(EVENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select></Field>
        <Field label="Início"><Input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required /></Field>
        <Field label="Término"><Input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} /></Field>
        <Field label="Observações"><Textarea rows={3} value={observations} onChange={(e) => setObservations(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Salvar</Button></div>
      </form>
    </Modal>
  );
}
