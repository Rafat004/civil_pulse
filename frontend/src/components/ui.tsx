"use client";

import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ReportStatus } from "@/lib/types";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary/90 shadow-[0_8px_18px_rgba(23,50,74,0.16)]",
  secondary: "bg-white text-primary border border-[#d8d6cf] hover:border-primary/40 hover:bg-[#faf9f5]",
  ghost: "text-on-surface-variant hover:text-primary hover:bg-[#ece9e1]",
  danger: "bg-[#a13a32] text-white hover:bg-[#8f312b]",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <button
      className={cn(
        "civic-focus inline-flex items-center justify-center gap-2 rounded-xl font-label-md text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "min-h-9 px-3 text-xs",
        size === "md" && "min-h-11 px-4",
        size === "lg" && "min-h-13 px-5",
        buttonVariants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "civic-focus inline-flex h-10 w-10 items-center justify-center rounded-xl text-on-surface-variant transition-colors hover:bg-[#ece9e1] hover:text-primary disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Surface({ children, className, subtle = false, ...props }: HTMLAttributes<HTMLDivElement> & { children: ReactNode; subtle?: boolean }) {
  return <div className={cn(subtle ? "civic-surface-subtle" : "civic-surface", className)} {...props}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-5 border-b border-[#d8d6cf] pb-6 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="civic-kicker mb-2">{eyebrow}</p>}
        <h1 className="font-headline-lg text-headline-lg font-bold tracking-[-0.04em] text-on-surface">{title}</h1>
        {description && <p className="mt-2 max-w-xl text-sm leading-6 text-on-surface-variant">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

const statusStyles: Record<ReportStatus, string> = {
  Reported: "bg-[#fff3df] text-[#8c5a13] border-[#f2d09a]",
  Verified: "bg-[#e9f2fb] text-[#2c5e86] border-[#bdd6ec]",
  Assigned: "bg-[#f0ebf8] text-[#684d89] border-[#d7c9e7]",
  "In Progress": "bg-[#fff0d4] text-[#925d12] border-[#f0ca88]",
  Resolved: "bg-[#e8f4eb] text-[#39704a] border-[#b9ddc1]",
  Rejected: "bg-[#fcebea] text-[#9a3d38] border-[#efc3c0]",
  Duplicate: "bg-[#efefec] text-[#5c646c] border-[#d4d5d1]",
  Reopened: "bg-[#fff4d9] text-[#84651a] border-[#ecd28b]",
};

export function StatusPill({ status, className }: { status: ReportStatus; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-extrabold tracking-wide", statusStyles[status], className)}>{status}</span>;
}

export function CategoryLabel({ category }: { category: string }) {
  return <span className="inline-flex items-center rounded-full border border-[#d8d6cf] bg-[#f8f7f2] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-on-surface-variant">{category}</span>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <Surface className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-primary/70">{icon}</div>}
      <h2 className="font-headline-md text-headline-md font-bold text-on-surface">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-on-surface-variant">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </Surface>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-[#e7e4dc]", className)} />;
}

export function InlineError({ children }: { children: ReactNode }) {
  return <div role="alert" className="rounded-xl border border-[#efc3c0] bg-[#fff1ef] px-4 py-3 text-sm leading-5 text-[#9a3d38]">{children}</div>;
}

export function SegmentedControl<T extends string>({ options, value, onChange }: { options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-xl border border-[#d8d6cf] bg-[#eeece6] p-1" role="tablist">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          role="tab"
          aria-selected={value === option}
          onClick={() => onChange(option)}
          className={cn("civic-focus whitespace-nowrap rounded-lg px-3 py-2 text-xs font-extrabold transition-colors", value === option ? "bg-white text-primary shadow-sm" : "text-on-surface-variant hover:text-primary")}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export function MetricCard({ label, value, detail, icon, tone = "ink" }: { label: string; value: string | number; detail?: string; icon?: ReactNode; tone?: "ink" | "amber" | "green" | "blue" }) {
  const tones = { ink: "text-primary", amber: "text-[#9a6119]", green: "text-[#39704a]", blue: "text-[#2c5e86]" };
  return (
    <Surface className="relative overflow-hidden p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.08em] text-on-surface-variant">{label}</p>
        {icon && <span className={cn("text-xl", tones[tone])}>{icon}</span>}
      </div>
      <p className={cn("mt-3 font-headline-lg text-headline-lg font-bold tracking-[-0.05em]", tones[tone])}>{value}</p>
      {detail && <p className="mt-1 text-xs text-on-surface-variant">{detail}</p>}
    </Surface>
  );
}

export function Dialog({ open, title, description, onClose, children }: { open: boolean; title: string; description?: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[#172535]/35 p-0 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="civic-dialog-title" className="w-full max-w-lg rounded-t-2xl border border-[#d8d6cf] bg-[#fffefa] p-6 shadow-[0_24px_80px_rgba(23,37,53,0.2)] sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="civic-dialog-title" className="font-headline-md text-headline-md font-bold text-on-surface">{title}</h2>
            {description && <p className="mt-1 text-sm leading-5 text-on-surface-variant">{description}</p>}
          </div>
          <IconButton label="Close dialog" onClick={onClose}><X size={18} /></IconButton>
        </div>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

export function EvidenceImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return <img src={src} alt={alt} className={cn("h-full w-full object-cover", className)} />;
}

export function Timeline({ items }: { items: Array<{ label: string; date?: string; note?: string; active?: boolean; complete?: boolean }> }) {
  return (
    <ol className="relative ml-2 border-l border-[#d8d6cf] pl-6">
      {items.map((item, index) => (
        <li key={`${item.label}-${index}`} className="relative pb-7 last:pb-0">
          <span className={cn("absolute -left-[31px] top-0.5 h-3 w-3 rounded-full border-2 border-[#fffefa]", item.complete ? "bg-[#39704a]" : item.active ? "bg-[#b87924]" : "bg-[#c9cbd0]")} />
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className={cn("text-sm font-bold", item.active ? "text-primary" : "text-on-surface")}>{item.label}</span>
            {item.date && <time className="text-[11px] text-on-surface-variant">{item.date}</time>}
          </div>
          {item.note && <p className="mt-1 text-xs leading-5 text-on-surface-variant">{item.note}</p>}
        </li>
      ))}
    </ol>
  );
}
