import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, Badge, PageHeader, Spinner, EmptyState, Button } from '@/components/ui';
import { dateUtils } from '@/lib/date';
import { useUserNames, displayName } from '@/lib/useUserNames';
import { ReloadButton } from '@/components/ReloadButton';

export function AuditPage() {
  const { names, loadNames } = useUserNames();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100);
    setLogs(data ?? []);
    loadNames((data ?? []).map((l: any) => l.actor).filter(Boolean));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <PageHeader
        title="Histórico e auditoria"
        description="Trilha de auditoria de ações relevantes"
        actions={<ReloadButton onClick={load} />}
      />
      {loading ? <Spinner /> : logs.length === 0 ? (
        <EmptyState title="Nenhum registro de auditoria" />
      ) : (
        <Card>
          <div className="divide-y divide-slate-100">
            {logs.map((l) => (
              <div key={l.id} className="px-4 py-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{l.action}</span>
                  <Badge tone="neutral">{l.entity}</Badge>
                </div>
                {l.justification && <p className="mt-0.5 text-slate-600">{l.justification}</p>}
                <p className="mt-0.5 text-xs text-slate-400">
                  {dateUtils.fmtDateTimeBr(l.created_at)} · por {displayName(names, l.actor)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
