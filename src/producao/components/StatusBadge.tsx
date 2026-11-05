import type { Tom } from "@/producao/lib/constants";

const ESTILO_TOM: Record<Tom, string> = {
  success: "bg-emerald-100 text-emerald-800",
  info: "bg-sky-100 text-sky-800",
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-red-100 text-red-800",
  primary: "bg-rose-100 text-rose-800",
  neutral: "bg-slate-100 text-slate-700",
};

export function StatusBadge({ label, tom }: { label: string; tom: Tom }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTILO_TOM[tom]}`}>
      {label}
    </span>
  );
}
