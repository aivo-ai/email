import { useState, useEffect, createContext, useContext } from 'react';

export type Language = 'en' | 'ar' | 'he' | 'fr' | 'es' | 'de' | 'pseudo';
export type Direction = 'ltr' | 'rtl';

interface I18nContextType {
  language: Language;
  direction: Direction;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

// Simple translation store - in production would use i18next
const translations: Record<Language, Record<string, string>> = {
  en: {
    'inbox.title': 'Inbox',
    'compose.title': 'Compose',
    'search.placeholder': 'Search emails...',
    'email.archive': 'Archive',
    'email.delete': 'Delete',
    'email.star': 'Star',
    'email.reply': 'Reply',
    'email.forward': 'Forward',
    'settings.display.density': 'Display Density',
    'settings.display.density.comfortable': 'Comfortable',
    'settings.display.density.cozy': 'Cozy',
    'settings.display.density.compact': 'Compact',
    'keyboard.shortcuts': 'Keyboard Shortcuts',
  },
  ar: {
    'inbox.title': 'البريد الوارد',
    'compose.title': 'إنشاء',
    'search.placeholder': 'البحث في الرسائل...',
    'email.archive': 'أرشفة',
    'email.delete': 'حذف',
    'email.star': 'نجمة',
    'email.reply': 'رد',
    'email.forward': 'إعادة توجيه',
    'settings.display.density': 'كثافة العرض',
    'settings.display.density.comfortable': 'مريح',
    'settings.display.density.cozy': 'متوسط',
    'settings.display.density.compact': 'مضغوط',
    'keyboard.shortcuts': 'اختصارات لوحة المفاتيح',
  },
  he: {
    'inbox.title': 'תיבת דואר נכנס',
    'compose.title': 'חדש',
    'search.placeholder': 'חיפוש בהודעות...',
    'email.archive': 'ארכב',
    'email.delete': 'מחק',
    'email.star': 'כוכב',
    'email.reply': 'השב',
    'email.forward': 'העבר',
    'settings.display.density': 'צפיפות תצוגה',
    'settings.display.density.comfortable': 'נוח',
    'settings.display.density.cozy': 'בינוני',
    'settings.display.density.compact': 'דחוס',
    'keyboard.shortcuts': 'קיצורי מקלדת',
  },
  fr: {
    'inbox.title': 'Boîte de réception',
    'compose.title': 'Nouveau',
    'search.placeholder': 'Rechercher des emails...',
    'email.archive': 'Archiver',
    'email.delete': 'Supprimer',
    'email.star': 'Étoile',
    'email.reply': 'Répondre',
    'email.forward': 'Transférer',
    'settings.display.density': 'Densité d\'affichage',
    'settings.display.density.comfortable': 'Confortable',
    'settings.display.density.cozy': 'Moyen',
    'settings.display.density.compact': 'Compact',
    'keyboard.shortcuts': 'Raccourcis clavier',
  },
  es: {
    'inbox.title': 'Bandeja de entrada',
    'compose.title': 'Redactar',
    'search.placeholder': 'Buscar correos...',
    'email.archive': 'Archivar',
    'email.delete': 'Eliminar',
    'email.star': 'Estrella',
    'email.reply': 'Responder',
    'email.forward': 'Reenviar',
    'settings.display.density': 'Densidad de visualización',
    'settings.display.density.comfortable': 'Cómodo',
    'settings.display.density.cozy': 'Medio',
    'settings.display.density.compact': 'Compacto',
    'keyboard.shortcuts': 'Atajos de teclado',
  },
  de: {
    'inbox.title': 'Posteingang',
    'compose.title': 'Verfassen',
    'search.placeholder': 'E-Mails durchsuchen...',
    'email.archive': 'Archivieren',
    'email.delete': 'Löschen',
    'email.star': 'Stern',
    'email.reply': 'Antworten',
    'email.forward': 'Weiterleiten',
    'settings.display.density': 'Anzeigedichte',
    'settings.display.density.comfortable': 'Bequem',
    'settings.display.density.cozy': 'Mittel',
    'settings.display.density.compact': 'Kompakt',
    'keyboard.shortcuts': 'Tastaturkürzel',
  },
  pseudo: {
    'inbox.title': '[!!! Ìñƀöẋ ℓöřëɱ !!!]',
    'compose.title': '[!!! Ċöɱƥöšë ℓöř !!!]',
    'search.placeholder': '[!!! Šëàŕçħ ëɱàìľš ℓöŕëɱ ìƥšüɱ... !!!]',
    'email.archive': '[!!! Àŕçħìṽë ℓöřë !!!]',
    'email.delete': '[!!! Ðëľëţë ℓöř !!!]',
    'email.star': '[!!! Šţàŕ ℓöřë !!!]',
    'email.reply': '[!!! Řëƥľý ℓöřë !!!]',
    'email.forward': '[!!! Ḟöŕẅàŕđ ℓöŕëɱ !!!]',
    'settings.display.density': '[!!! Ðìšƥľàý Ðëñšìţý ℓöŕëɱ ìƥšüɱ !!!]',
    'settings.display.density.comfortable': '[!!! Ċöɱḟöŕţàƀľë ℓöŕëɱ !!!]',
    'settings.display.density.cozy': '[!!! Ċözý ℓöř !!!]',
    'settings.display.density.compact': '[!!! Ċöɱƥàçţ ℓöŕë !!!]',
    'keyboard.shortcuts': '[!!! Ķëýƀöàŕđ Šħöŕţçüţš ℓöŕëɱ ìƥšüɱ !!!]',
  },
};

const RTL_LANGUAGES: Language[] = ['ar', 'he'];

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('webmail-language');
    return (saved as Language) || 'en';
  });

  const direction: Direction = RTL_LANGUAGES.includes(language) ? 'rtl' : 'ltr';

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('webmail-language', lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = translations[language]?.[key] || translations.en[key] || key;
    
    // Simple parameter substitution
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{{${param}}}`, String(value));
      });
    }
    
    return translation;
  };

  // Update document direction when language changes
  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = language;
    
    // Add RTL class for styling
    if (direction === 'rtl') {
      document.documentElement.classList.add('rtl');
    } else {
      document.documentElement.classList.remove('rtl');
    }
  }, [language, direction]);

  return (
    <I18nContext.Provider value={{ language, direction, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

export function LanguageSelector() {
  const { language, setLanguage } = useI18n();

  const languages: { code: Language; name: string; nativeName: string }[] = [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'he', name: 'Hebrew', nativeName: 'עברית' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'pseudo', name: 'Pseudo', nativeName: '[!!! Ƥšëüđö !!!]' },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        Language / اللغة / שפה
      </label>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.nativeName} ({lang.name})
          </option>
        ))}
      </select>
    </div>
  );
}

// RTL-aware utility classes
export function useRTLClasses() {
  const { direction } = useI18n();
  
  return {
    marginLeft: direction === 'rtl' ? 'mr' : 'ml',
    marginRight: direction === 'rtl' ? 'ml' : 'mr',
    paddingLeft: direction === 'rtl' ? 'pr' : 'pl',
    paddingRight: direction === 'rtl' ? 'pl' : 'pr',
    textAlign: direction === 'rtl' ? 'text-right' : 'text-left',
    float: direction === 'rtl' ? 'float-right' : 'float-left',
    borderLeft: direction === 'rtl' ? 'border-r' : 'border-l',
    borderRight: direction === 'rtl' ? 'border-l' : 'border-r',
  };
}
