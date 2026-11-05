import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

function juntar(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function PCard({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={juntar("rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>{children}</div>;
}

export function PCardBody({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={juntar("p-4", className)}>{children}</div>;
}

type PButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "md" | "sm";
  loading?: boolean;
};

const VARIANTE_BOTAO: Record<NonNullable<PButtonProps["variant"]>, string> = {
  primary: "bg-[#8B2635] text-white hover:bg-[#721f2c]",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
  ghost: "text-slate-700 hover:bg-slate-100",
  danger: "bg-red-700 text-white hover:bg-red-800",
};

export function PButton({ variant = "primary", size = "md", loading = false, className, disabled, children, type = "button", ...rest }: PButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={juntar(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B2635] disabled:cursor-not-allowed disabled:opacity-60",
        size === "sm" ? "px-3 py-1.5 text-sm" : "px-4 py-2.5 text-sm",
        VARIANTE_BOTAO[variant],
        className,
      )}
      {...rest}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function PInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={juntar(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#8B2635] focus:outline-none focus:ring-2 focus:ring-[#8B2635]/20 disabled:bg-slate-100",
        className,
      )}
      {...rest}
    />
  );
}

export function PTextarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={juntar(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#8B2635] focus:outline-none focus:ring-2 focus:ring-[#8B2635]/20 disabled:bg-slate-100",
        className,
      )}
      {...rest}
    />
  );
}

export function PSelect({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={juntar(
        "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-[#8B2635] focus:outline-none focus:ring-2 focus:ring-[#8B2635]/20 disabled:bg-slate-100",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function PLabel({ className, children }: { className?: string; children?: ReactNode }) {
  return <label className={juntar("mb-1.5 block text-sm font-medium text-slate-700", className)}>{children}</label>;
}

export function PPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
