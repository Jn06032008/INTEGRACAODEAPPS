import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button, Card, Badge, PageHeader, Spinner, EmptyState, Modal, Field, Input, Textarea, Select, ConfirmDialog } from '@/components/ui';
import { dateUtils } from '@/lib/date';
import { UserSelect } from '@/components/UserSelect';
import { Send, Trash2 } from 'lucide-react';
import type { Profile } from '@/lib/types';

export function NotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [confirmClear, setConfirmClear] = useState(false);

  const isSuperior = user?.isSysadmin || user?.isSeniorLead || user?.isStudioLead || (user?.maxLevel ?? 0) >= 3;

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    setNotifications(data ?? []);
    if (isSuperior) {
      const { data: pData } = await supabase.from('profiles').select('id, auth_user_id, username, full_name, email, account_status').eq('account_status', 'active').order('full_name');
      setProfiles((pData ?? []) as Profile[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    load();
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).neq('read', true);
    load();
  };

  const clearRead = async () => {
    await supabase.from('notifications').delete().eq('read', true);
    setConfirmClear(false);
    load();
  };

  const clearAll = async () => {
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    setConfirmClear(false);
    load();
  };

  const hasRead = notifications.some((n) => n.read);

  return (
    <div>
      <PageHeader
        title="Notificações"
        description="Central de notificações internas"
        actions={
          <div className="flex flex-wrap gap-2">
            {isSuperior && <Button size="sm" onClick={() => setShowForm(true)}><Send size={16} /> Enviar notificação</Button>}
            {notifications.some((n) => !n.read) ? <Button variant="secondary" size="sm" onClick={markAllRead}>Marcar todas como lidas</Button> : undefined}
            {hasRead && <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}><Trash2 size={16} /> Limpar lidas</Button>}
            {notifications.length > 0 && <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}><Trash2 size={16} /> Limpar tudo</Button>}
          </div>
        }
      />
      {loading ? <Spinner /> : notifications.length === 0 ? (
        <EmptyState title="Nenhuma notificação" />
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            {notifications.map((n) => (
              <div key={n.id} className={`flex items-start justify-between px-4 py-3 ${n.read ? '' : 'bg-amber-50/40'}`}>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.read ? 'text-slate-700' : 'font-medium text-slate-900'}`}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-slate-400">{dateUtils.fmtDateTimeBr(n.created_at)}</p>
                </div>
                {!n.read && <Button size="sm" variant="ghost" onClick={() => markRead(n.id)}>Marcar lida</Button>}
              </div>
            ))}
          </div>
        </Card>
      )}
      {showForm && <SendNotificationForm profiles={profiles} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); load(); }} />}
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={hasRead ? clearRead : clearAll}
        title="Limpar notificações"
        message={hasRead ? "Deseja remover todas as notificações já lidas?" : "Deseja remover todas as notificações? Esta ação não pode ser desfeita."}
        confirmLabel="Limpar"
        danger
      />
    </div>
  );
}

function SendNotificationForm({ profiles, onClose, onSaved }: { profiles: Profile[]; onClose: () => void; onSaved: () => void }) {
  const [target, setTarget] = useState('all');
  const [specificUser, setSpecificUser] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!title.trim()) { setError('Título é obrigatório.'); setLoading(false); return; }
    if (target === 'all') {
      const { error } = await supabase.from('notifications').insert(
        profiles.map((p) => ({ user_id: p.auth_user_id, title, body: body || null }))
      );
      if (error) { setError(error.message); setLoading(false); return; }
    } else if (target === 'specific' && specificUser) {
      const { error } = await supabase.from('notifications').insert({ user_id: specificUser, title, body: body || null });
      if (error) { setError(error.message); setLoading(false); return; }
    }
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Enviar notificação">
      <form onSubmit={submit} className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Destinatários">
          <Select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="all">Todos os usuários ativos</option>
            <option value="specific">Usuário específico</option>
          </Select>
        </Field>
        {target === 'specific' && (
          <Field label="Usuário"><UserSelect value={specificUser} onChange={setSpecificUser} required placeholder="Selecione o usuário..." /></Field>
        )}
        <Field label="Título"><Input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="ex: Live imprevista, Cancelamento..." /></Field>
        <Field label="Mensagem"><Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Detalhes da notificação..." /></Field>
        <div className="flex justify-end gap-2"><Button variant="secondary" type="button" onClick={onClose}>Cancelar</Button><Button type="submit" loading={loading}>Enviar</Button></div>
      </form>
    </Modal>
  );
}
