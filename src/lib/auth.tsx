import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AppUser, Profile, Role, Sector } from '@/lib/types';

interface AuthContextValue {
  user: AppUser | null;
  session: Session | null;
  authUser: User | null;
  loading: boolean;
  authError: string | null;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function deriveUsername(email: string): string {
  const base = email.split('@')[0]?.replace(/[^a-zA-Z0-9._]/g, '').toLowerCase() || 'usuario';
  return base;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const loadAppUser = async (authUid: string, email?: string | null): Promise<AppUser | null> => {
    // Load profile
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', authUid)
      .maybeSingle();

    if (profErr) {
      console.error('Profile query error:', profErr.message);
    }

    // Auto-create profile if missing
    let profileData = profile;
    if (!profileData && email) {
      const { data: userData } = await supabase.auth.getUser();
      const meta = userData.user?.user_metadata;
      const fullName = meta?.full_name || meta?.name || email.split('@')[0] || 'Usuário';
      let username = meta?.username || deriveUsername(email);

      const { data: created, error } = await supabase
        .from('profiles')
        .insert({
          auth_user_id: authUid,
          username,
          full_name: fullName,
          email,
          account_status: 'active',
        })
        .select()
        .maybeSingle();

      if (error) {
        // Try with modified username in case of conflict
        username = `${username}_${Math.random().toString(36).slice(2, 6)}`;
        const { data: retry, error: err2 } = await supabase
          .from('profiles')
          .insert({
            auth_user_id: authUid,
            username,
            full_name: fullName,
            email,
            account_status: 'active',
          })
          .select()
          .maybeSingle();
        if (err2) {
          console.error('Profile creation failed:', err2.message);
          return null;
        }
        profileData = retry;
      } else {
        profileData = created;
      }
    }

    if (!profileData) {
      console.error('No profile found and could not create one');
      return null;
    }

    // Load roles and sectors
    const [{ data: roles, error: rolesErr }, { data: userSectors, error: sectorsErr }] = await Promise.all([
      supabase
        .from('user_roles')
        .select('role:roles(*)')
        .eq('user_id', authUid),
      supabase
        .from('user_sectors')
        .select('sector:sectors(*)')
        .eq('user_id', authUid),
    ]);

    if (rolesErr) console.error('Roles query error:', rolesErr.message);
    if (sectorsErr) console.error('Sectors query error:', sectorsErr.message);

    const roleList: Role[] = (roles ?? [])
      .map((r) => (r as unknown as { role: Role }).role)
      .filter(Boolean);
    const sectorList: Sector[] = (userSectors ?? [])
      .map((s) => (s as unknown as { sector: Sector }).sector)
      .filter(Boolean);

    const keys = new Set(roleList.map((r) => r.key));
    const p = profileData as Profile;

    return {
      id: authUid,
      email: email ?? null,
      profile: p,
      roles: roleList,
      sectors: sectorList,
      isSysadmin: keys.has('sysadmin'),
      isStudioLead: keys.has('studio_lead'),
      isSectorLead: keys.has('sector_lead'),
      isSeniorLead: keys.has('senior_lead'),
      isMember: keys.has('member'),
      maxLevel: roleList.reduce((m, r) => Math.max(m, r.level), 0),
    };
  };

  const refreshUser = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    setSession(s);
    if (s?.user) {
      const appUser = await loadAppUser(s.user.id, s.user.email);
      setUser(appUser);
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    refreshUser();

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      (async () => {
        try {
          setSession(s);
          if (s?.user) {
            setAuthError(null);
            const appUser = await loadAppUser(s.user.id, s.user.email);
            if (!appUser) {
              setAuthError('Não foi possível carregar seu perfil. Tente novamente ou contate o administrador.');
            }
            setUser(appUser);
          } else {
            setUser(null);
          }
        } catch (err) {
          console.error('onAuthStateChange error:', err);
          setAuthError(err instanceof Error ? err.message : 'Erro ao carregar sessão.');
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAuthError(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, authUser: session?.user ?? null, loading, authError, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
