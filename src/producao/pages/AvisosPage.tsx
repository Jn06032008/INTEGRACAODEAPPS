import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PCard, PCardBody, PPageHeader, PButton } from "@/producao/components/ui";
import { formatarData } from "@/producao/lib/constants";
import { useProducaoAuth } from "@/producao/lib/auth";

type Notif = { id: string; titulo: string; mensagem: string | null; lida: boolean; created_at: string };

export function AvisosPage() {
  const { user } = useProducaoAuth();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    if (!user) return;
    const { data } = await supabase.from("producao_notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setNotifs((data ?? []) as Notif[]); setCarregando(false);
  }

  useEffect(() => { void carregar(); }, [user]);

  async function marcarLida(id: string) {
    await supabase.from("producao_notifications").update({ lida: true }).eq("id", id);
    void carregar();
  }
  async function marcarTodas() {
    if (!user) return;
    await supabase.from("producao_notifications").update({ lida: true }).eq("user_id", user.id).eq("lida", false);
    void carregar();
  }

  return (
    <div>
      <PPageHeader title="Avisos" description="Notificações do sistema" actions={<PButton size="sm" variant="secondary" onClick={() => void marcarTodas()}>Marcar todas como lidas</PButton>} />
      {carregando ? <p className="py-10 text-center text-sm text-slate-500">Carregando...</p> : (
        <div className="space-y-2">
          {notifs.map((n) => (
            <PCard key={n.id} className={n.lida ? "opacity-60" : ""}><PCardBody className="flex items-start justify-between gap-3 p-3">
              <div className="flex items-start gap-2"><Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.lida ? "text-slate-400" : "text-[#8B2635]"}`} /><div><p className="text-sm font-semibold">{n.titulo}</p>{n.mensagem && <p className="text-xs text-slate-500">{n.mensagem}</p>}<p className="mt-1 text-xs text-slate-400">{formatarData(n.created_at)}</p></div></div>
              {!n.lida && <PButton size="sm" variant="ghost" onClick={() => void marcarLida(n.id)}>Marcar lida</PButton>}
            </PCardBody></PCard>
          ))}
          {notifs.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Nenhuma notificação.</p>}
        </div>
      )}
    </div>
  );
}
