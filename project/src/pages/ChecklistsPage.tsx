import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  Button, Card, Badge, Input, Textarea, Select, Field, PageHeader,
  Spinner, EmptyState, Modal, ConfirmDialog,
} from '@/components/ui';
import { dateUtils } from '@/lib/date';
import { TASK_STATUS, SECTOR_NAMES } from '@/lib/labels';
import { useUserNames, displayName } from '@/lib/useUserNames';
import type { ChecklistTemplate, ChecklistTemplateItem, ChecklistRun, ChecklistTask, ChecklistTaskHistory, ChurchEvent } from '@/lib/types';
import { Check, RotateCcw, Lock, Plus, Trash2, RefreshCw } from 'lucide-react';

export function TemplatesPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ChecklistTemplate | null>(null);
  const [deleteTemplate, setDeleteTemplate] = useState<ChecklistTemplate | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('checklist_templates').select('*').order('created_at', { ascending: false });
    setTemplates((data ?? []) as ChecklistTemplate[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader title="Modelos de checklist" description="Crie e edite modelos reutilizáveis" actions={<Button onClick={() => setShowForm(true)}>Novo modelo</Button>} />
      {loading ? <Spinner /> : templates.length === 0 ? (
        <EmptyState title="Nenhum modelo" description="Crie um modelo de checklist para agilizar a preparação." action={<Button onClick={() => setShowForm(true)}>Novo modelo</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-slate-900">{t.name}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{t.description || '—'}</p>
                </div>
                <Badge tone={t.is_active ? 'green' : 'neutral'}>{t.is_active ? 'Ativo' : 'Arquivado'}</Badge>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => setEditing(t)}>Editar tarefas</Button>
                <Button variant="ghost" size="sm" onClick={async () => {
                  await supabase.from('checklist_templates').update({ is_active: !t.is_active }).eq('id', t.id);
                  load();
                }}>{t.is_active ? 'Arquivar' : 'Ativar'}</Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteTemplate(t)}><Trash2 size={16} /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && <TemplateForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {editing && <TemplateItemsEditor template={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      <ConfirmDialog
        open={!!deleteTemplate}
        onClose={() => setDeleteTemplate(null)}
        onConfirm={async () => {
          if (!deleteTemplate) return;
          await supabase.from('checklist_template_items').delete().eq('template_id', deleteTemplate.id);
          await supabase.from('checklist_templates').delete().eq('id', deleteTemplate.id);
          setDeleteTemplate(null);
          load();
        }}
        title="Excluir modelo"
        message="Tem certeza? O modelo e todas as suas tarefas serão removidos."
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}

function TemplateForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await supabase.from('checklist_templates').insert({ name, description });
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Novo modelo de checklist">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome"><Input value={name} onChange={(e) => setName(e.target.value)} required /></Field>
        <Field label="Descrição"><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Criar</Button></div>
      </form>
    </Modal>
  );
}

function TemplateItemsEditor({ template, onClose, onSaved }: { template: ChecklistTemplate; onClose: () => void; onSaved: () => void }) {
  const [items, setItems] = useState<ChecklistTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newSector, setNewSector] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('checklist_template_items').select('*').eq('template_id', template.id).order('sort_order');
    setItems((data ?? []) as ChecklistTemplateItem[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [template.id]);

  const addItem = async () => {
    if (!newName.trim()) return;
    const order = items.length;
    const { data } = await supabase.from('checklist_template_items').insert({
      template_id: template.id, name: newName, description: newDesc, sector: newSector || null, sort_order: order,
    }).select().single();
    if (data) setItems([...items, data as ChecklistTemplateItem]);
    setNewName(''); setNewDesc(''); setNewSector('');
  };

  const removeItem = async (id: string) => {
    await supabase.from('checklist_template_items').delete().eq('id', id);
    setItems(items.filter((i) => i.id !== id));
  };

  return (
    <Modal open onClose={onClose} title={`Tarefas — ${template.name}`} size="lg">
      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {items.length === 0 && <p className="text-sm text-slate-500">Nenhuma tarefa ainda.</p>}
          {items.map((i) => (
            <div key={i.id} className="flex items-start justify-between rounded-lg border border-slate-200 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-slate-800">{i.name}</p>
                {i.description && <p className="text-xs text-slate-500">{i.description}</p>}
                {i.sector && <Badge tone="neutral" className="mt-1">{i.sector}</Badge>}
              </div>
              <button onClick={() => removeItem(i.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></button>
            </div>
          ))}
          <div className="border-t border-slate-200 pt-3">
            <p className="mb-2 text-sm font-medium text-slate-700">Adicionar tarefa</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input placeholder="Nome da tarefa" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Select value={newSector} onChange={(e) => setNewSector(e.target.value)}>
                <option value="">Sem setor</option>
                {SECTOR_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <Textarea className="mt-2" rows={2} placeholder="Descrição (opcional)" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} />
            <Button size="sm" className="mt-2" onClick={addItem}><Plus size={16} /> Adicionar</Button>
          </div>
          <div className="flex justify-end"><Button variant="secondary" onClick={onClose}>Concluir</Button></div>
        </div>
      )}
    </Modal>
  );
}

export function ChecklistsPage() {
  const { user } = useAuth();
  const { names, loadNames } = useUserNames();
  const [runs, setRuns] = useState<ChecklistRun[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGen, setShowGen] = useState(false);
  const [openRun, setOpenRun] = useState<ChecklistRun | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: runData }, { data: tplData }, { data: evtData }] = await Promise.all([
      supabase.from('checklist_runs').select('*, event:events(*), template:checklist_templates(*)').order('created_at', { ascending: false }),
      supabase.from('checklist_templates').select('*').eq('is_active', true),
      supabase.from('events').select('*').order('start_at', { ascending: false }).limit(20),
    ]);
    setRuns((runData ?? []) as ChecklistRun[]);
    setTemplates((tplData ?? []) as ChecklistTemplate[]);
    setEvents((evtData ?? []) as ChurchEvent[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (openRun) {
    return <RunDetail run={openRun} onBack={() => { setOpenRun(null); load(); }} />;
  }

  return (
    <div>
      <PageHeader title="Checklists" description="Execuções de checklist dos eventos" actions={<Button onClick={() => setShowGen(true)}>Gerar checklist</Button>} />
      {loading ? <Spinner /> : runs.length === 0 ? (
        <EmptyState title="Nenhuma execução" description="Gere um checklist a partir de um modelo para um evento." action={<Button onClick={() => setShowGen(true)}>Gerar checklist</Button>} />
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            {runs.map((r) => (
              <button key={r.id} onClick={() => setOpenRun(r)} className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.event?.name ?? 'Evento'}</p>
                  <p className="text-xs text-slate-500">{r.template?.name} · {dateUtils.fmtDateTimeBr(r.created_at)}</p>
                </div>
                <ChevronRight />
              </button>
            ))}
          </div>
        </Card>
      )}

      {showGen && (
        <GenerateRunModal templates={templates} events={events} onClose={() => setShowGen(false)} onSaved={() => { setShowGen(false); load(); }} />
      )}
    </div>
  );
}

function ChevronRight() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6" /></svg>;
}

function GenerateRunModal({ templates, events, onClose, onSaved }: {
  templates: ChecklistTemplate[]; events: ChurchEvent[]; onClose: () => void; onSaved: () => void;
}) {
  const [templateId, setTemplateId] = useState('');
  const [eventId, setEventId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateId || !eventId) return;
    setLoading(true);
    setError(null);
    const { data: run, error: runErr } = await supabase.from('checklist_runs').insert({ template_id: templateId, event_id: eventId }).select().single();
    if (runErr) { setError(runErr.message); setLoading(false); return; }
    const { data: items } = await supabase.from('checklist_template_items').select('*').eq('template_id', templateId).order('sort_order');
    if (items && items.length > 0) {
      const tasks = items.map((it: ChecklistTemplateItem) => ({
        run_id: run.id, name: it.name, description: it.description, sector: it.sector, sort_order: it.sort_order,
      }));
      await supabase.from('checklist_tasks').insert(tasks);
    }
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Gerar checklist">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Evento"><Select value={eventId} onChange={(e) => setEventId(e.target.value)} required>
          <option value="">Selecione...</option>
          {events.map((e) => <option key={e.id} value={e.id}>{e.name} — {dateUtils.fmtDateBr(e.start_at)}</option>)}
        </Select></Field>
        <Field label="Modelo"><Select value={templateId} onChange={(e) => setTemplateId(e.target.value)} required>
          <option value="">Selecione...</option>
          {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </Select></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Gerar</Button></div>
      </form>
    </Modal>
  );
}

function RunDetail({ run, onBack }: { run: ChecklistRun; onBack: () => void }) {
  const { user } = useAuth();
  const { names, loadNames } = useUserNames();
  const [tasks, setTasks] = useState<ChecklistTask[]>([]);
  const [history, setHistory] = useState<ChecklistTaskHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [blockTask, setBlockTask] = useState<ChecklistTask | null>(null);
  const [showReset, setShowReset] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: taskData } = await supabase.from('checklist_tasks').select('*').eq('run_id', run.id).order('sort_order');
    setTasks((taskData ?? []) as ChecklistTask[]);
    const ids = new Set<string>();
    (taskData ?? []).forEach((t: any) => { if (t.completed_by) ids.add(t.completed_by); if (t.assigned_to) ids.add(t.assigned_to); });
    loadNames(Array.from(ids));
    const taskIds = (taskData ?? []).map((t: any) => t.id);
    if (taskIds.length > 0) {
      const { data: hd } = await supabase.from('checklist_task_history').select('*').in('task_id', taskIds).order('performed_at', { ascending: false });
      setHistory((hd ?? []) as ChecklistTaskHistory[]);
    } else {
      setHistory([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [run.id]);

  const completeTask = async (task: ChecklistTask) => {
    const prev = task.status;
    await supabase.from('checklist_tasks').update({
      status: 'completed', completed_by: user?.id, completed_at: new Date().toISOString(),
    }).eq('id', task.id);
    await supabase.from('checklist_task_history').insert({
      task_id: task.id, task_name: task.name, action: 'completed', previous_status: prev, new_status: 'completed', performed_by: user?.id,
    });
    load();
  };

  const reopenTask = async (task: ChecklistTask) => {
    const prev = task.status;
    await supabase.from('checklist_tasks').update({
      status: 'pending', completed_by: null, completed_at: null,
    }).eq('id', task.id);
    await supabase.from('checklist_task_history').insert({
      task_id: task.id, task_name: task.name, action: 'reopened', previous_status: prev, new_status: 'pending', performed_by: user?.id,
      notes: 'Reaberta',
    });
    load();
  };

  const blockTaskFn = async (task: ChecklistTask, reason: string) => {
    const prev = task.status;
    await supabase.from('checklist_tasks').update({ status: 'blocked', block_reason: reason }).eq('id', task.id);
    await supabase.from('checklist_task_history').insert({
      task_id: task.id, task_name: task.name, action: 'blocked', previous_status: prev, new_status: 'blocked', performed_by: user?.id, notes: reason,
    });
    setBlockTask(null);
    load();
  };

  const resetChecklist = async () => {
    if (!run) return;
    for (const t of tasks) {
      const prev = t.status;
      await supabase.from('checklist_tasks').update({
        status: 'pending', completed_by: null, completed_at: null, block_reason: null,
      }).eq('id', t.id);
      await supabase.from('checklist_task_history').insert({
        task_id: t.id, task_name: t.name, action: 'reset', previous_status: prev, new_status: 'pending', performed_by: user?.id, notes: 'Checklist reiniciada',
      });
    }
    setShowReset(false);
    load();
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const pct = tasks.length === 0 ? 0 : Math.round((completedCount / tasks.length) * 100);

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-sm text-slate-500 hover:text-slate-700">← Voltar</button>
      <PageHeader title={run.event?.name ?? 'Checklist'} description={run.template?.name} actions={<div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => setShowHistory(!showHistory)}>Histórico</Button><Button variant="ghost" size="sm" onClick={() => setShowReset(true)}><RefreshCw size={16} /> Reiniciar</Button></div>} />

      <Card className="mb-4 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">{completedCount} de {tasks.length} concluídas</span>
          <span className="text-sm font-semibold text-[#8B2635]">{pct}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#8B2635] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </Card>

      {loading ? <Spinner /> : (
        <div className="space-y-2">
          {tasks.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900">{t.name}</p>
                  {t.description && <p className="mt-0.5 text-xs text-slate-500">{t.description}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge tone={t.status === 'completed' ? 'green' : t.status === 'blocked' ? 'red' : t.status === 'in_progress' ? 'blue' : 'neutral'}>{TASK_STATUS[t.status]}</Badge>
                    {t.sector && <Badge tone="slate">{t.sector}</Badge>}
                    {t.completed_by && <span className="text-xs text-slate-500">Concluída por {displayName(names, t.completed_by)} · {dateUtils.fmtDateTimeBr(t.completed_at)}</span>}
                    {t.status === 'blocked' && t.block_reason && <span className="text-xs text-red-600">Bloqueada: {t.block_reason}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {t.status !== 'completed' && (
                    <Button size="sm" onClick={() => completeTask(t)} title="Concluir"><Check size={16} /></Button>
                  )}
                  {t.status !== 'blocked' && t.status !== 'completed' && (
                    <Button size="sm" variant="ghost" onClick={() => setBlockTask(t)} title="Bloquear"><Lock size={16} /></Button>
                  )}
                  {t.status === 'completed' && (
                    <Button size="sm" variant="ghost" onClick={() => reopenTask(t)} title="Reabrir"><RotateCcw size={16} /></Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showHistory && (
        <Modal open onClose={() => setShowHistory(false)} title="Histórico do checklist" size="lg">
          {history.length === 0 ? <p className="text-sm text-slate-500">Sem registros.</p> : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <p className="font-medium text-slate-800">{h.task_name ?? h.action}</p>
                  <p className="text-xs text-slate-500">{TASK_STATUS[h.previous_status ?? ''] ?? h.previous_status} → {TASK_STATUS[h.new_status ?? ''] ?? h.new_status} · {h.action}</p>
                  {h.notes && <p className="text-xs text-slate-400">{h.notes}</p>}
                  <p className="mt-0.5 text-xs text-slate-400">{dateUtils.fmtDateTimeBr(h.performed_at)} · por {displayName(names, h.performed_by)}</p>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {blockTask && <BlockModal task={blockTask} onClose={() => setBlockTask(null)} onConfirm={(reason) => blockTaskFn(blockTask, reason)} />}
      {showReset && (
        <ConfirmDialog
          open={showReset}
          onClose={() => setShowReset(false)}
          onConfirm={resetChecklist}
          title="Reiniciar checklist"
          message="Todas as tarefas serão marcadas como pendentes novamente. O histórico será preservado."
          confirmLabel="Reiniciar"
        />
      )}
    </div>
  );
}

function BlockModal({ task, onClose, onConfirm }: { task: ChecklistTask; onClose: () => void; onConfirm: (reason: string) => void }) {
  const [reason, setReason] = useState('');
  return (
    <Modal open onClose={onClose} title={`Bloquear: ${task.name}`}>
      <Field label="Motivo do bloqueio"><Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={() => reason && onConfirm(reason)}>Bloquear</Button></div>
    </Modal>
  );
}
