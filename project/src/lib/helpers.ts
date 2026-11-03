import { supabase } from '@/lib/supabase';

export async function pushNotification(
  userId: string,
  title: string,
  body: string,
  link?: string,
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    title,
    body,
    link,
  });
}

export async function auditLog(
  action: string,
  entity: string,
  entityId: string | null,
  previousState: Record<string, unknown> | null = null,
  newState: Record<string, unknown> | null = null,
  justification: string | null = null,
) {
  await supabase.from('audit_logs').insert({
    action,
    entity,
    entity_id: entityId,
    previous_state: previousState,
    new_state: newState,
    justification,
  });
}

export function classNames(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
