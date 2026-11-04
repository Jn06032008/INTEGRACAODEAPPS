import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  Button, Card, Badge, Input, Textarea, Select, Field, PageHeader,
  Spinner, EmptyState, Modal,
} from '@/components/ui';
import { dateUtils } from '@/lib/date';
import { MEDIA_STATUS, MEDIA_STATUS_KEYS, RECORD_TYPE_LABELS } from '@/lib/labels';
import { useUserNames, displayName } from '@/lib/useUserNames';
import { auditLog } from '@/lib/helpers';
import { ConfirmDialog } from '@/components/ui';
import { UserSelect } from '@/components/UserSelect';
import type { MediaAsset, MediaHistory, PresetOption } from '@/lib/types';
import { RotateCcw, Trash2 } from 'lucide-react';
import { ReloadButton } from '@/components/ReloadButton';

export function MediaPage() {
  const { user } = useAuth();
  const { names, loadNames } = useUserNames();
  const [items, setItems] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<MediaAsset | null>(null);
  const [historyItem, setHistoryItem] = useState<MediaAsset | null>(null);
  const [history, setHistory] = useState<MediaHistory[]>([]);
  const [deleteItem, setDeleteItem] = useState<MediaAsset | null>(null);
  const [presetOpts, setPresetOpts] = useState<Record<string, string[]>>({ preacher: [], platform: [], event_name: [] });
  const [filters, setFilters] = useState({
    status: 'all', preacher: '', dateFrom: '', dateTo: '', editor: 'all', pubResponsible: 'all',
  });
  const [sortDesc, setSortDesc] = useState(true);

  const load = async () => {
    setLoading(true);
    let q = supabase.from('media_assets').select('*').order('cult_date', { ascending: !sortDesc });
    if (filters.status !== 'all') q = q.eq('status', filters.status);
    if (filters.editor !== 'all') q = q.eq('editor_id', filters.editor);
    if (filters.pubResponsible !== 'all') q = q.eq('publication_responsible_id', filters.pubResponsible);
    if (filters.dateFrom) q = q.gte('cult_date', filters.dateFrom);
    if (filters.dateTo) q = q.lte('cult_date', filters.dateTo);
    const { data } = await q;
    let list = (data ?? []) as MediaAsset[];
    if (filters.preacher) {
      list = list.filter((m) => (m.preacher ?? '').toLowerCase().includes(filters.preacher.toLowerCase()));
    }
    setItems(list);
    loadNames(list.map((m) => [m.status_reported_by, m.editor_id, m.publication_responsible_id]).flat().filter(Boolean) as string[]);
    const { data: opts } = await supabase.from('preset_options').select('*').eq('is_active', true);
    if (opts) {
      const grouped: Record<string, string[]> = { preacher: [], platform: [], event_name: [] };
      (opts as PresetOption[]).forEach((o) => {
        if (grouped[o.category]) grouped[o.category].push(o.value);
      });
      setPresetOpts(grouped);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filters.status, filters.editor, filters.pubResponsible, filters.dateFrom, filters.dateTo, sortDesc]);

  const clearFilters = () => setFilters({ status: 'all', preacher: '', dateFrom: '', dateTo: '', editor: 'all', pubResponsible: 'all' });

  const viewHistory = async (m: MediaAsset) => {
    const { data } = await supabase.from('media_history').select('*').eq('media_id', m.id).order('created_at', { ascending: false });
    setHistory((data ?? []) as MediaHistory[]);
    setHistoryItem(m);
  };

  const stats = {
    awaitingEdit: items.filter((m) => m.status === 'awaiting_edit').length,
    inEdit: items.filter((m) => m.status === 'in_edit').length,
    awaitingPub: items.filter((m) => m.status === 'awaiting_publication').length,
    published: items.filter((m) => m.status === 'published').length,
    notFound: items.filter((m) => m.status === 'not_found' || m.status === 'reported_lost').length,
    noResponsible: items.filter((m) => !m.editor_id && !m.publication_responsible_id && m.status !== 'archived' && m.status !== 'published').length,
  };

  return (
    <div>
      <PageHeader title="Acervo de cultos" description="Cultos gravados e transmitidos" actions={
        <div className="flex gap-2">
          <ReloadButton onClick={load} />
          <Button onClick={() => setShowForm(true)}>Cadastrar culto</Button>
        </div>
      } />

      <div className="mb-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        <StatBox label="Aguard. edição" value={stats.awaitingEdit} tone="amber" />
        <StatBox label="Em edição" value={stats.inEdit} tone="blue" />
        <StatBox label="Aguard. pub." value={stats.awaitingPub} tone="amber" />
        <StatBox label="Publicados" value={stats.published} tone="green" />
        <StatBox label="Não encontrados" value={stats.notFound} tone="red" />
        <StatBox label="Sem responsável" value={stats.noResponsible} tone="red" />
      </div>

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select value={filters.preacher} onChange={(e) => setFilters({ ...filters, preacher: e.target.value })}>
            <option value="">Todos os pregadores</option>
            {presetOpts.preacher.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="all">Todos os estados</option>
            {MEDIA_STATUS_KEYS.map((k) => <option key={k} value={k}>{MEDIA_STATUS[k]}</option>)}
          </Select>
          <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
          <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={clearFilters}>Limpar filtros</Button>
          <Button size="sm" variant="ghost" onClick={() => setSortDesc(!sortDesc)}>{sortDesc ? 'Mais recentes primeiro' : 'Mais antigos primeiro'}</Button>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <EmptyState title="Nenhum culto no acervo" description="Cadastre um culto gravado ou transmitido." action={<Button onClick={() => setShowForm(true)}>Cadastrar culto</Button>} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Pregador</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Editor</th>
                  <th className="px-4 py-3 font-medium">Informado por</th>
                  <th className="px-4 py-3 font-medium">Atualizado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-900">{dateUtils.fmtDateBr(m.cult_date)}</td>
                    <td className="px-4 py-3 text-slate-700">{m.preacher || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={m.status === 'published' ? 'green' : m.status === 'not_found' || m.status === 'reported_lost' ? 'red' : m.status === 'archived' ? 'neutral' : 'blue'}>
                        {MEDIA_STATUS[m.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{m.editor_id ? displayName(names, m.editor_id) : 'Sem responsável'}</td>
                    <td className="px-4 py-3 text-slate-600">{displayName(names, m.status_reported_by)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{dateUtils.fmtDateTimeBr(m.updated_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditItem(m)}>Editar</Button>
                        <Button size="sm" variant="ghost" onClick={() => viewHistory(m)}>Histórico</Button>
                        <button onClick={() => setDeleteItem(m)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showForm && <MediaForm presetOpts={presetOpts} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      {editItem && <MediaForm item={editItem} presetOpts={presetOpts} onClose={() => setEditItem(null)} onSaved={() => { setEditItem(null); load(); }} />}
      {historyItem && (
        <Modal open onClose={() => setHistoryItem(null)} title="Histórico do culto">
          {history.length === 0 ? <p className="text-sm text-slate-500">Sem registros.</p> : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <p className="text-slate-700">
                    {h.previous_status && <span>{MEDIA_STATUS[h.previous_status] ?? h.previous_status} → </span>}
                    {h.new_status && <span className="font-medium">{MEDIA_STATUS[h.new_status] ?? h.new_status}</span>}
                  </p>
                  {h.comment && <p className="text-slate-500">{h.comment}</p>}
                  <p className="text-xs text-slate-400">{dateUtils.fmtDateTimeBr(h.created_at)} · por {displayName(names, h.author)}</p>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
      <ConfirmDialog
        open={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={async () => {
          if (!deleteItem) return;
          await supabase.from('media_history').delete().eq('media_id', deleteItem.id);
          await supabase.from('media_assets').delete().eq('id', deleteItem.id);
          await auditLog('delete', 'media_asset', deleteItem.id, null, null);
          setDeleteItem(null);
          load();
        }}
        title="Excluir culto"
        message="Tem certeza? O registro do culto e seu histórico serão removidos."
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}

function StatBox({ label, value, tone }: { label: string; value: number; tone: 'amber' | 'blue' | 'green' | 'red' }) {
  const tones = { amber: 'text-amber-600', blue: 'text-blue-600', green: 'text-emerald-600', red: 'text-red-600' };
  return (
    <Card className="p-3 text-center">
      <p className={`text-2xl font-semibold ${tones[tone]}`}>{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </Card>
  );
}

function PresetOrInput({ label, presets, value, onChange, placeholder }: {
  label: string; presets: string[]; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [useCustom, setUseCustom] = useState(value && !presets.includes(value));
  if (presets.length === 0 || useCustom) {
    return (
      <Field label={label}>
        <div className="flex gap-2">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="flex-1" />
          {presets.length > 0 && <Button size="sm" variant="ghost" type="button" onClick={() => { setUseCustom(false); onChange(''); }}>Usar lista</Button>}
        </div>
      </Field>
    );
  }
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Select value={value} onChange={(e) => onChange(e.target.value)} className="flex-1">
          <option value="">{placeholder ?? 'Selecione...'}</option>
          {presets.map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Button size="sm" variant="ghost" type="button" onClick={() => setUseCustom(true)}>Personalizar</Button>
      </div>
    </Field>
  );
}

function MediaForm({ item, presetOpts, onClose, onSaved }: { item?: MediaAsset; presetOpts: Record<string, string[]>; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const isEdit = !!item;
  const [form, setForm] = useState({
    cult_date: item ? dateUtils.toInputDate(item.cult_date) : '',
    cult_time: item?.cult_time ?? '',
    preacher: item?.preacher ?? '',
    event_name: item?.event_name ?? '',
    record_type: item?.record_type ?? 'both',
    status: item?.status ?? 'awaiting_edit',
    editor_id: item?.editor_id ?? '',
    publication_responsible_id: item?.publication_responsible_id ?? '',
    publication_platform: item?.publication_platform ?? '',
    publication_url: item?.publication_url ?? '',
    observations: item?.observations ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
      cult_date: form.cult_date,
      cult_time: form.cult_time || null,
      preacher: form.preacher || null,
      event_name: form.event_name || null,
      record_type: form.record_type,
      status: form.status,
      editor_id: form.editor_id || null,
      publication_responsible_id: form.publication_responsible_id || null,
      publication_platform: form.publication_platform || null,
      publication_url: form.publication_url || null,
      observations: form.observations || null,
      status_reported_by: user?.id,
    };
    if (isEdit && item) {
      const prevStatus = item.status;
      const { error } = await supabase.from('media_assets').update(payload).eq('id', item.id);
      if (error) { setError(error.message); setLoading(false); return; }
      if (prevStatus !== form.status) {
        await supabase.from('media_history').insert({
          media_id: item.id, previous_status: prevStatus, new_status: form.status, comment: 'Alteração de estado', author: user?.id,
        });
      }
      await auditLog('update', 'media_asset', item.id, { status: prevStatus }, { status: form.status });
    } else {
      const { data, error } = await supabase.from('media_assets').insert(payload).select().single();
      if (error) { setError(error.message); setLoading(false); return; }
      await supabase.from('media_history').insert({
        media_id: data.id, new_status: form.status, comment: 'Cadastro inicial', author: user?.id,
      });
    }
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Editar culto' : 'Cadastrar culto'} size="lg">
      <form onSubmit={submit} className="space-y-3">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data do culto"><Input type="date" value={form.cult_date} onChange={set('cult_date')} required /></Field>
          <Field label="Horário (opcional)"><Input type="time" value={form.cult_time} onChange={set('cult_time')} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <PresetOrInput label="Pregador" presets={presetOpts.preacher} value={form.preacher} onChange={(v) => setForm({ ...form, preacher: v })} placeholder="Selecione ou personalize..." />
          <PresetOrInput label="Evento (nome/tipo)" presets={presetOpts.event_name} value={form.event_name} onChange={(v) => setForm({ ...form, event_name: v })} placeholder="Selecione ou personalize..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo"><Select value={form.record_type} onChange={set('record_type')}>
            {Object.entries(RECORD_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select></Field>
          <Field label="Estado"><Select value={form.status} onChange={set('status')}>
            {MEDIA_STATUS_KEYS.map((k) => <option key={k} value={k}>{MEDIA_STATUS[k]}</option>)}
          </Select></Field>
        </div>
        <Field label="Editor"><UserSelect value={form.editor_id} onChange={(uid) => setForm({ ...form, editor_id: uid })} placeholder="Selecione..." /></Field>
        <Field label="Responsável pela publicação"><UserSelect value={form.publication_responsible_id} onChange={(uid) => setForm({ ...form, publication_responsible_id: uid })} placeholder="Selecione..." /></Field>
        <div className="grid grid-cols-2 gap-3">
          <PresetOrInput label="Plataforma de publicação" presets={presetOpts.platform} value={form.publication_platform} onChange={(v) => setForm({ ...form, publication_platform: v })} placeholder="Selecione ou personalize..." />
          <Field label="Link da publicação"><Input value={form.publication_url} onChange={set('publication_url')} placeholder="https://..." /></Field>
        </div>
        <Field label="Observações"><Textarea rows={2} value={form.observations} onChange={set('observations')} /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>{isEdit ? 'Salvar' : 'Cadastrar'}</Button></div>
      </form>
    </Modal>
  );
}
