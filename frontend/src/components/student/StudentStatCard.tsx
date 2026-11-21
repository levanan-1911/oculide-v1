
import type { LucideIcon } from "lucide-react";

interface StudentStatCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  iconBackground: string;
}

export default function StudentStatCard({
  title,
  value,
  description,
  icon: Icon,
  iconColor,
  iconBackground,
}: StudentStatCardProps) {
  return (
    <div className="rounded-md border border-slate-300 bg-white p-5 shadow-sm transition dark:border-white/10 dark:bg-neutral-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-tight text-[#2A282D] dark:text-white tabular-nums">
            {value}
          </p>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
        </div>

        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${iconBackground} ${iconColor}`}
        >
          <Icon size={20} strokeWidth={1.8} />
        </div>
      </div>
    </div>
  );
}
