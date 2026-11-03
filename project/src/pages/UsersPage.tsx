import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import {
  Button, Card, Badge, Input, Select, Field, PageHeader,
  Spinner, EmptyState, Modal,
} from '@/components/ui';
import { dateUtils } from '@/lib/date';
import { ACCOUNT_STATUS_LABELS, ROLE_LABELS, SECTOR_NAMES } from '@/lib/labels';
import { auditLog } from '@/lib/helpers';
import type { Profile, Sector, Role } from '@/lib/types';

export function UsersPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [showSector, setShowSector] = useState(false);
  const [userRoles, setUserRoles] = useState<Record<string, string[]>>({});
  const [userSectors, setUserSectors] = useState<Record<string, string[]>>({});

  const load = async () => {
    setLoading(true);
    const [{ data: p }, { data: s }, { data: r }] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('sectors').select('*'),
      supabase.from('roles').select('*'),
    ]);
    setProfiles((p ?? []) as Profile[]);
    setSectors((s ?? []) as Sector[]);
    setRoles((r ?? []) as Role[]);

    const { data: ur } = await supabase.from('user_roles').select('user_id, role_id');
    const { data: us } = await supabase.from('user_sectors').select('user_id, sector_id');
    const rMap: Record<string, string[]> = {};
    (ur ?? []).forEach((x: any) => { (rMap[x.user_id] ??= []).push(x.role_id); });
    const sMap: Record<string, string[]> = {};
    (us ?? []).forEach((x: any) => { (sMap[x.user_id] ??= []).push(x.sector_id); });
    setUserRoles(rMap);
    setUserSectors(sMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = profiles.filter((p) =>
    !search || p.full_name.toLowerCase().includes(search.toLowerCase()) || p.username.toLowerCase().includes(search.toLowerCase()),
  );

  if (!user?.isSysadmin) {
    return <EmptyState title="Acesso restrito" description="Somente administradores do sistema podem gerenciar usuários." />;
  }

  return (
    <div>
      <PageHeader title="Usuários e setores" description="Gerenciar contas, setores e funções" actions={<Button onClick={() => setShowSector(true)}>Gerenciar setores</Button>} />
      <div className="mb-4">
        <Input placeholder="Buscar por nome ou usuário..." value={search} onChange={(e) => setSearch(e.target.value)} className="sm:max-w-xs" />
      </div>

      {loading ? <Spinner /> : filtered.length === 0 ? (
        <EmptyState title="Nenhum usuário" />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Usuário</th>
                  <th className="px-4 py-3 font-medium">Conta</th>
                  <th className="px-4 py-3 font-medium">Funções</th>
                  <th className="px-4 py-3 font-medium">Setores</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const rIds = userRoles[p.auth_user_id ?? ''] ?? [];
                  const sIds = userSectors[p.auth_user_id ?? ''] ?? [];
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{p.full_name}</td>
                      <td className="px-4 py-3 text-slate-600">@{p.username}</td>
                      <td className="px-4 py-3"><Badge tone={p.account_status === 'active' ? 'green' : p.account_status === 'suspended' ? 'red' : 'amber'}>{ACCOUNT_STATUS_LABELS[p.account_status]}</Badge></td>
                      <td className="px-4 py-3 text-slate-600">{rIds.map((id) => ROLE_LABELS[roles.find((r) => r.id === id)?.key ?? ''] ?? '').filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{sIds.map((id) => sectors.find((s) => s.id === id)?.name).filter(Boolean).join(', ') || '—'}</td>
                      <td className="px-4 py-3"><Button size="sm" variant="ghost" onClick={() => setEditProfile(p)}>Editar</Button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {editProfile && (
        <EditProfileModal
          profile={editProfile}
          roles={roles}
          sectors={sectors}
          currentRoles={userRoles[editProfile.auth_user_id ?? ''] ?? []}
          currentSectors={userSectors[editProfile.auth_user_id ?? ''] ?? []}
          onClose={() => setEditProfile(null)}
          onSaved={() => { setEditProfile(null); load(); }}
        />
      )}

      {showSector && <SectorModal sectors={sectors} onClose={() => setShowSector(false)} onSaved={() => { setShowSector(false); load(); }} />}
    </div>
  );
}

function EditProfileModal({ profile, roles, sectors, currentRoles, currentSectors, onClose, onSaved }: {
  profile: Profile; roles: Role[]; sectors: Sector[];
  currentRoles: string[]; currentSectors: string[];
  onClose: () => void; onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(profile.full_name);
  const [username, setUsername] = useState(profile.username);
  const [accountStatus, setAccountStatus] = useState(profile.account_status);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set(currentRoles));
  const [selectedSectors, setSelectedSectors] = useState<Set<string>>(new Set(currentSectors));
  const [loading, setLoading] = useState(false);

  const toggle = (set: Set<string>, id: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    setter(next);
  };

  const submit = async () => {
    setLoading(true);
    await supabase.from('profiles').update({ full_name: fullName, username, account_status: accountStatus }).eq('id', profile.id);

    const uid = profile.auth_user_id;
    if (uid) {
      await supabase.from('user_roles').delete().eq('user_id', uid);
      if (selectedRoles.size > 0) {
        await supabase.from('user_roles').insert(Array.from(selectedRoles).map((rid) => ({ user_id: uid, role_id: rid })));
      }
      await supabase.from('user_sectors').delete().eq('user_id', uid);
      if (selectedSectors.size > 0) {
        await supabase.from('user_sectors').insert(Array.from(selectedSectors).map((sid) => ({ user_id: uid, sector_id: sid })));
      }
    }
    await auditLog('update', 'profile', profile.id, null, { username, account_status: accountStatus });
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title={`Editar — ${profile.full_name}`} size="lg">
      <div className="space-y-4">
        <Field label="Nome completo"><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
        <Field label="Nome de usuário"><Input value={username} onChange={(e) => setUsername(e.target.value)} /></Field>
        <Field label="Situação da conta"><Select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value)}>
          {Object.entries(ACCOUNT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select></Field>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Funções</p>
          <div className="space-y-1">
            {roles.map((r) => (
              <label key={r.id} className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={selectedRoles.has(r.id)} onChange={() => toggle(selectedRoles, r.id, setSelectedRoles)} />
                {ROLE_LABELS[r.key] ?? r.name} — <span className="text-xs text-slate-400">{r.description}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Setores</p>
          <div className="space-y-1">
            {sectors.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={selectedSectors.has(s.id)} onChange={() => toggle(selectedSectors, s.id, setSelectedSectors)} />
                {s.name}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={submit} loading={loading}>Salvar</Button></div>
      </div>
    </Modal>
  );
}

function SectorModal({ sectors, onClose, onSaved }: { sectors: Sector[]; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const addSector = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await supabase.from('sectors').insert({ name });
    setName('');
    setLoading(false);
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Gerenciar setores">
      <div className="space-y-3">
        <ul className="space-y-1">
          {sectors.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <span className="text-slate-700">{s.name}</span>
              <Button size="sm" variant="ghost" onClick={async () => { await supabase.from('sectors').delete().eq('id', s.id); onSaved(); }}>Remover</Button>
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <Input placeholder="Novo setor..." value={name} onChange={(e) => setName(e.target.value)} />
          <Button size="sm" onClick={addSector} loading={loading}>Adicionar</Button>
        </div>
        <div className="flex justify-end"><Button variant="secondary" onClick={onClose}>Fechar</Button></div>
      </div>
    </Modal>
  );
}
