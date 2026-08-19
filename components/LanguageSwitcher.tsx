import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES, loadLanguageAsync, LanguageCode } from '../src/i18n';

interface LanguageSwitcherProps {
  className?: string;
  dropdownPosition?: 'left' | 'right';
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  className = '',
  dropdownPosition = 'right',
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangCode = (i18n.language ? i18n.language.split('-')[0].toLowerCase() : 'en') as LanguageCode;
  
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLangCode) || SUPPORTED_LANGUAGES[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = async (langCode: LanguageCode) => {
    setIsOpen(false);
    if (langCode === currentLangCode) return;

    await loadLanguageAsync(langCode);
    await i18n.changeLanguage(langCode);
    localStorage.setItem('i18nextLng', langCode);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/10 transition-all duration-200 cursor-pointer shadow-sm focus:outline-none focus:ring-2 focus:ring-ug-teal"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Select Language / Changement de langue"
      >
        <span className="text-sm leading-none" role="img" aria-label={currentLangObj.label}>
          {currentLangObj.flag}
        </span>
        <span className="hidden sm:inline-block font-medium tracking-wide">
          {currentLangObj.label}
        </span>
        <ChevronDown size={14} className={`text-gray-300 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute ${dropdownPosition === 'right' ? 'right-0' : 'left-0'} mt-2 w-44 rounded-2xl bg-white shadow-2xl border border-gray-100 py-2 z-[9999] animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="px-3 py-1.5 text-[10px] font-black uppercase text-gray-400 tracking-wider border-b border-gray-100 mb-1">
            Language / Lugha / Kasa
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLangCode;
            return (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-ug-teal/10 text-ug-navy font-bold'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-ug-navy'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base leading-none" role="img" aria-label={lang.label}>
                    {lang.flag}
                  </span>
                  <span>{lang.label}</span>
                </div>
                {isSelected && <Check size={14} className="text-ug-teal shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
