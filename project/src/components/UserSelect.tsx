import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/types';

interface UserSelectProps {
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  required?: boolean;
}

export function useAllProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, auth_user_id, username, full_name, email, account_status')
        .eq('account_status', 'active')
        .order('full_name');
      setProfiles((data ?? []) as Profile[]);
      setLoading(false);
    })();
  }, []);

  return { profiles, loading };
}

export function UserSelect({ value, onChange, placeholder, required }: UserSelectProps) {
  const { profiles, loading } = useAllProfiles();

  return (
    <select
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#8B2635] focus:outline-none focus:ring-1 focus:ring-[#8B2635]"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      <option value="">{placeholder ?? 'Selecione um usuário...'}</option>
      {!loading && profiles.map((p) => (
        <option key={p.id} value={p.auth_user_id ?? p.id}>
          {p.full_name} (@{p.username})
        </option>
      ))}
    </select>
  );
}
