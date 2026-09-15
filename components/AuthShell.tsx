import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandLockup from './BrandLockup';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

const AuthShell: React.FC<AuthShellProps> = ({ eyebrow, title, description, children }) => (
  <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100 sm:py-12">
    <div className="mx-auto w-full max-w-md">
      <div className="mb-6 flex items-center justify-between">
        <Link to="/" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-ug-teal dark:text-slate-400">
          <ArrowLeft size={14} /> Back to Home
        </Link>
        <BrandLockup compact className="text-ug-navy dark:text-white" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_-36px_rgba(26,26,75,0.65)] dark:border-slate-800 dark:bg-slate-900">
        <header className="relative overflow-hidden bg-ug-navy px-6 py-8 text-white sm:px-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-ug-teal/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-52 w-52 rounded-full bg-ug-gold/10 blur-3xl" />
          <div className="relative">
            <p className="type-caption font-bold tracking-[0.2em] text-ug-gold">{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/70">{description}</p>
          </div>
        </header>
        <div className="p-6 sm:p-8">{children}</div>
      </section>
    </div>
  </div>
);

export default AuthShell;
