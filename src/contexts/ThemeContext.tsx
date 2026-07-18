import React, { createContext, useContext, useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { NativeTheme } from '@/lib/native';
import { saveDeviceState, loadDeviceState } from '@/lib/storage';

type Theme = 'light' | 'dark' | 'system';

export type AccentColor = 'mint' | 'blue' | 'purple' | 'orange' | 'pink' | 'teal';

export const accentColors: { id: AccentColor; name: string; hue: string }[] = [
  { id: 'mint', name: 'Mint', hue: '162' },
  { id: 'blue', name: 'Blue', hue: '217' },
  { id: 'purple', name: 'Purple', hue: '270' },
  { id: 'orange', name: 'Orange', hue: '25' },
  { id: 'pink', name: 'Pink', hue: '340' },
  { id: 'teal', name: 'Teal', hue: '180' },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem('splitley-theme');
    return (stored as Theme) || 'system';
  });

  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    const stored = localStorage.getItem('splitley-accent-color');
    return (stored as AccentColor) || 'mint';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Load preferences from device storage on mount (non-blocking)
  useEffect(() => {
    loadDeviceState().then((deviceState) => {
      if (deviceState?.preferences) {
        const { theme: storedTheme, accent_color } = deviceState.preferences;
        if (storedTheme && !localStorage.getItem('splitley-theme')) {
          setThemeState(storedTheme);
        }
        if (accent_color && !localStorage.getItem('splitley-accent-color')) {
          setAccentColorState(accent_color as AccentColor);
        }
      }
    });
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const getSystemTheme = (): 'light' | 'dark' => {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const applyTheme = (newTheme: Theme) => {
      const resolved = newTheme === 'system' ? getSystemTheme() : newTheme;
      setResolvedTheme(resolved);
      
      root.classList.remove('light', 'dark');
      root.classList.add(resolved);
    };

    applyTheme(theme);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Keep the native status bar in sync with the app theme.
  // Colors match --background in index.css (light: 40 20% 98%, dark: 220 20% 8%).
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const dark = resolvedTheme === 'dark';
    NativeTheme.setStatusBar({
      color: dark ? '#101318' : '#faf9f7',
      lightIcons: dark,
    }).catch(() => {});
  }, [resolvedTheme]);

  useEffect(() => {
    const root = window.document.documentElement;
    const colorConfig = accentColors.find(c => c.id === accentColor) || accentColors[0];
    const hue = colorConfig.hue;
    
    // Apply accent color CSS variables
    root.style.setProperty('--primary', `${hue} 63% 41%`);
    root.style.setProperty('--primary-glow', `${hue} 63% 51%`);
    root.style.setProperty('--ring', `${hue} 63% 41%`);
    root.style.setProperty('--secondary', `${hue} 20% 94%`);
    root.style.setProperty('--secondary-foreground', `${hue} 63% 35%`);
    root.style.setProperty('--accent', `${hue} 63% 95%`);
    root.style.setProperty('--accent-foreground', `${hue} 63% 30%`);
    
    // Dark mode adjustments
    if (resolvedTheme === 'dark') {
      root.style.setProperty('--primary', `${hue} 63% 45%`);
      root.style.setProperty('--primary-glow', `${hue} 63% 55%`);
      root.style.setProperty('--ring', `${hue} 63% 45%`);
      root.style.setProperty('--secondary', `${hue} 15% 18%`);
      root.style.setProperty('--secondary-foreground', `${hue} 50% 70%`);
      root.style.setProperty('--accent', `${hue} 30% 15%`);
      root.style.setProperty('--accent-foreground', `${hue} 60% 70%`);
    }
  }, [accentColor, resolvedTheme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem('splitley-theme', newTheme);
    setThemeState(newTheme);
    
    // Persist to device storage (non-blocking)
    saveDeviceState({
      preferences: {
        theme: newTheme,
        accent_color: accentColor,
        currency: localStorage.getItem('splitease_currency') 
          ? JSON.parse(localStorage.getItem('splitease_currency')!).code 
          : 'USD',
        notifications_enabled: Notification.permission === 'granted',
      },
    });
  };

  const setAccentColor = (color: AccentColor) => {
    localStorage.setItem('splitley-accent-color', color);
    setAccentColorState(color);
    
    // Persist to device storage (non-blocking)
    saveDeviceState({
      preferences: {
        theme,
        accent_color: color,
        currency: localStorage.getItem('splitease_currency') 
          ? JSON.parse(localStorage.getItem('splitease_currency')!).code 
          : 'USD',
        notifications_enabled: Notification.permission === 'granted',
      },
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme, accentColor, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
