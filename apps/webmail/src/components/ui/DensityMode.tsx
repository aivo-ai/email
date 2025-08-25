import { useState, useCallback } from 'react';

// Temporary i18n hook until react-i18next is added
const useTranslation = () => ({
  t: (key: string) => key,
});

export type DensityMode = 'comfortable' | 'cozy' | 'compact';

interface DensitySettings {
  mode: DensityMode;
  itemHeight: number;
  padding: string;
  fontSize: string;
}

const DENSITY_CONFIGS: Record<DensityMode, DensitySettings> = {
  comfortable: {
    mode: 'comfortable',
    itemHeight: 72,
    padding: 'p-4',
    fontSize: 'text-base',
  },
  cozy: {
    mode: 'cozy',
    itemHeight: 56,
    padding: 'p-3',
    fontSize: 'text-sm',
  },
  compact: {
    mode: 'compact',
    itemHeight: 40,
    padding: 'p-2',
    fontSize: 'text-xs',
  },
};

export function useDensityMode() {
  const [densityMode, setDensityMode] = useState<DensityMode>(() => {
    const saved = localStorage.getItem('webmail-density-mode');
    return (saved as DensityMode) || 'comfortable';
  });

  const updateDensityMode = useCallback((mode: DensityMode) => {
    setDensityMode(mode);
    localStorage.setItem('webmail-density-mode', mode);
    
    // Update CSS custom properties for consistent styling
    document.documentElement.style.setProperty(
      '--email-item-height', 
      `${DENSITY_CONFIGS[mode].itemHeight}px`
    );
  }, []);

  return {
    densityMode,
    setDensityMode: updateDensityMode,
    config: DENSITY_CONFIGS[densityMode],
  };
}

export function DensityModeSelector() {
  const { densityMode, setDensityMode } = useDensityMode();
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        {t('settings.display.density')}
      </label>
      <div className="space-y-2">
        {Object.entries(DENSITY_CONFIGS).map(([mode]) => (
          <label key={mode} className="flex items-center space-x-2">
            <input
              type="radio"
              name="density"
              value={mode}
              checked={densityMode === mode}
              onChange={() => setDensityMode(mode as DensityMode)}
              className="form-radio text-blue-600"
            />
            <span className="text-sm text-gray-900">
              {t(`settings.display.density.${mode}`)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function EmailListItem({ 
  email, 
  onClick, 
  isSelected 
}: { 
  email: any; 
  onClick: () => void; 
  isSelected: boolean;
}) {
  const { config } = useDensityMode();

  return (
    <div
      className={`
        ${config.padding} 
        ${config.fontSize} 
        border-b border-gray-200 
        hover:bg-gray-50 
        cursor-pointer
        transition-colors
        ${isSelected ? 'bg-blue-50 border-blue-200' : ''}
      `}
      style={{ minHeight: config.itemHeight }}
      onClick={onClick}
      role="listitem"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              className="form-checkbox h-4 w-4 text-blue-600"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {email.from}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {email.subject}
              </p>
              {config.mode !== 'compact' && (
                <p className="text-xs text-gray-400 truncate">
                  {email.preview}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          <span className="text-xs text-gray-500">
            {email.date}
          </span>
          {email.hasAttachment && (
            <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
