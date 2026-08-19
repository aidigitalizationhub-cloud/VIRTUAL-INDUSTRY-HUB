import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useSystemTheme } from '../hooks/useSystemTheme';

export const ThemeSwitcher: React.FC = () => {
  const { effectiveTheme, toggleTheme } = useSystemTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="p-2 sm:p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center cursor-pointer group"
      title={`Current Theme: ${effectiveTheme === 'dark' ? 'Dark' : 'Light'}. Click to toggle theme.`}
      aria-label="Toggle light and dark theme"
    >
      {effectiveTheme === 'dark' ? (
        <Sun size={16} className="text-amber-300 group-hover:rotate-45 transition-transform" />
      ) : (
        <Moon size={16} className="text-indigo-200 group-hover:-rotate-12 transition-transform" />
      )}
    </button>
  );
};

export default ThemeSwitcher;

