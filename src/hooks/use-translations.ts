"use client";

import { useLanguage } from '@/context/language-context';
import pt from '@/locales/pt.json';
import en from '@/locales/en.json';

const translations = { pt, en };

type TranslationKey = keyof typeof pt;

export const useTranslations = () => {
  const { language } = useLanguage();

  const t = (key: TranslationKey): string => {
    return translations[language][key] || key;
  };

  return { t };
};