import React from 'react';
import type { LucideIcon } from 'lucide-react';

export const StatCard: React.FC<{ label: string; value: string | number; trend?: string; icon: LucideIcon }> = ({ label, value, trend, icon: Icon }) => (
  <div className="group relative flex min-h-[88px] min-w-0 flex-col justify-between border border-slate-200/80 bg-white p-3 shadow-[0_8px_24px_-18px_rgba(26,26,75,0.35)] transition hover:-translate-y-0.5 hover:border-ug-teal/30 hover:shadow-[0_14px_30px_-18px_rgba(26,26,75,0.45)] md:min-h-[118px] md:p-5">
    <div className="flex items-start justify-between gap-3">
      <span className="truncate text-[10px] font-medium text-slate-500 sm:text-xs">{label}</span>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-400 transition group-hover:bg-teal-50 group-hover:text-ug-teal md:h-8 md:w-8 md:rounded-lg">
        <Icon size={13} className="md:h-4 md:w-4" />
      </span>
    </div>
    <div className="flex items-baseline justify-between gap-2">
      <h3 className="text-xl font-semibold tracking-tight text-ug-navy md:text-3xl">{value}</h3>
      {trend && <span className="rounded-full bg-teal-50 px-2 py-1 text-[11px] font-semibold text-ug-teal">{trend}</span>}
    </div>
  </div>
);

export const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-6">
    <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-ug-navy md:text-xl"><span className="h-5 w-1 rounded-full bg-ug-teal" /> {title}</h2>
    {subtitle && <p className="ml-3 mt-1.5 max-w-2xl text-sm leading-relaxed text-slate-500">{subtitle}</p>}
  </div>
);
