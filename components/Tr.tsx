import React from 'react';
import { useTranslatedText } from '../services/translationService';

interface TrProps {
  text: string | undefined | null;
  className?: string;
  fallback?: string;
}

export const Tr: React.FC<TrProps> = ({ text, className, fallback }) => {
  const translated = useTranslatedText(text || fallback || '');
  return <span className={className}>{translated}</span>;
};

export default Tr;
