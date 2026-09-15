import React from 'react';
import { useTranslation } from 'react-i18next';

interface BrandLockupProps {
  showIast?: boolean;
  compact?: boolean;
  className?: string;
}

const BrandLockup: React.FC<BrandLockupProps> = ({ showIast = false, compact = false, className = '' }) => {
  const { t } = useTranslation();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${compact ? 'h-9 w-11' : 'h-12 w-16'} shrink-0 overflow-hidden rounded-xl border border-white/20 bg-white p-1 shadow-lg`}>
        <img src="/logo.svg" alt="University of Ghana crest" className="h-full w-full object-contain" onError={(event) => { event.currentTarget.src = '/image-fallback.svg'; }} />
      </div>
      <div className="min-w-0">
        {showIast && <div className="type-caption font-bold tracking-[0.2em] text-ug-gold">IAST</div>}
        <div className={`${compact ? 'text-sm' : 'text-base'} font-bold leading-tight tracking-tight text-current`}>
          {t('nav.brand')}
        </div>
        {!compact && <div className="type-caption mt-0.5 text-current/60">University of Ghana</div>}
      </div>
    </div>
  );
};

export default BrandLockup;
