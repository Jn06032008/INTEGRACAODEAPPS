import { cn } from "@/lib/utils";
import type { Tom } from "@/lib/constants";

const classes: Record<Tom, string> = {
  success: "bg-success/15 text-success border-success/30",
  info: "bg-info/15 text-info border-info/30",
  warning: "bg-warning/25 text-warning-foreground border-warning/40",
  danger: "bg-danger/15 text-danger border-danger/30",
  neutral: "bg-muted text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/25",
};

export function StatusBadge({
  label,
  tom = "neutral",
  className,
}: {
  label: string;
  tom?: Tom;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
        classes[tom],
        className,
      )}
    >
      {label}
    </span>
  );
}
