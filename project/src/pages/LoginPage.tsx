import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Button, Input, Label, Field } from '@/components/ui';


export function LoginPage() {
  const { authError, refreshUser } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Fallback: if onAuthStateChange doesn't fire quickly enough, manually refresh
        await refreshUser();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, username } },
        });
        if (error) throw error;
        // Profile is auto-created by the auth context when the session is established.
        if (data.user && !data.session) {
          setSuccess('Conta criada com sucesso. Você já pode entrar.');
          setMode('signin');
        }
        // If session was established, refreshUser will load the app user.
        if (data.session) {
          await refreshUser();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#fdf6ec] via-slate-100 to-[#f5ebe0] px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-28 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] shadow-md p-1">
            <img src="/111.png" alt="Estudio 40" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[#8B2635]">Estudio 40</h1>
          <p className="mt-1 text-sm text-slate-500">Mudança de Vida</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex rounded-lg bg-slate-100 p-1">
            <button
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === 'signin' ? 'bg-white text-[#8B2635] shadow-sm' : 'text-slate-500'}`}
              onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
            >
              Entrar
            </button>
            <button
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${mode === 'signup' ? 'bg-white text-[#8B2635] shadow-sm' : 'text-slate-500'}`}
              onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
            >
              Criar conta
            </button>
          </div>

          {success && (
            <div className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</div>
          )}
          {(error || authError) && (
            <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error || authError}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <>
                <Field label="Nome completo">
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                </Field>
                <Field label="Nome de usuário">
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} required placeholder="ex: joao.silva" />
                </Field>
              </>
            )}
            <Field label="E-mail">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </Field>
            <Field label="Senha">
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </Field>
            <Button type="submit" className="w-full" loading={loading}>
              {mode === 'signin' ? 'Entrar' : 'Criar conta'}
            </Button>
          </form>

          {mode === 'signup' && (
            <p className="mt-4 text-xs text-slate-400">
              O cadastro público pode ser desativado pela administração. Após criar sua conta, um administrador poderá atribuir setores e funções.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
