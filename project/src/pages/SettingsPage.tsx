import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, PageHeader, Badge, Button } from '@/components/ui';
import { ROLE_LABELS } from '@/lib/labels';
import { Moon, Sun } from 'lucide-react';

export function SettingsPage() {
  const { user } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const isSuperior = user?.isSysadmin || user?.isSeniorLead || user?.isStudioLead;

  useEffect(() => {
    const saved = localStorage.getItem('darkMode') === 'true';
    setDarkMode(saved);
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  return (
    <div>
      <PageHeader title="Configurações" description="Parâmetros gerais do sistema" />
      <div className="space-y-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Aparência</h2>
          <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon size={20} className="text-slate-600" /> : <Sun size={20} className="text-slate-600" />}
              <div>
                <p className="text-sm font-medium text-slate-800">Modo escuro</p>
                <p className="text-xs text-slate-500">Alterna entre tema claro e escuro</p>
              </div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative h-7 w-12 rounded-full transition-colors ${darkMode ? 'bg-[#8B2635]' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${darkMode ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </Card>

        {isSuperior && (
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Perfis e níveis</h2>
            <p className="mb-3 text-sm text-slate-500">Hierarquia de cargos do sistema. A gestão de usuários está na página de Usuários e setores.</p>
            <ul className="space-y-1">
              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                <li key={k} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="text-slate-700">{v}</span>
                  <Badge tone="neutral">{k}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">Sobre o sistema</h2>
          <p className="text-sm text-slate-500">Mudança de Vida — sistema operacional para o estúdio do Ministério Mudança de Vida, sob a liderança da Bispa Cléo Rossafa. Sistema fechado para aproximadamente 30 usuários, com identidade individual protegida e hierarquia configurável.</p>
        </Card>
      </div>
    </div>
  );
}
