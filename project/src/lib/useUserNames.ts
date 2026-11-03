import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type NameMap = Record<string, string>;

let cache: NameMap = {};

export function useUserNames() {
  const [names, setNames] = useState<NameMap>(cache);

  const loadNames = async (ids: string[]) => {
    const unique = Array.from(new Set(ids)).filter((id) => id && !cache[id]);
    if (unique.length === 0) return;
    const { data } = await supabase
      .from('profiles')
      .select('auth_user_id, username, full_name')
      .in('auth_user_id', unique);
    if (data) {
      const next = { ...cache };
      data.forEach((p) => {
        next[p.auth_user_id] = p.full_name || p.username;
      });
      cache = next;
      setNames(next);
    }
  };

  return { names, loadNames };
}

export function displayName(names: NameMap, id: string | null | undefined): string {
  if (!id) return '—';
  return names[id] ?? id.slice(0, 8);
}

export function resetNameCache() {
  cache = {};
}
