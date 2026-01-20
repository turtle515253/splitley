import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { saveDeviceState, loadDeviceState } from '@/lib/storage';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

export const currencies: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', locale: 'en-US' },
  { code: 'EUR', symbol: '€', name: 'Euro', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', name: 'British Pound', locale: 'en-GB' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', locale: 'ja-JP' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', locale: 'en-CA' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', locale: 'en-AU' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', locale: 'en-IN' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', locale: 'zh-CN' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', locale: 'pt-BR' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso', locale: 'es-MX' },
];

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  formatCurrency: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_STORAGE_KEY = 'splitease_currency';

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>(() => {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return currencies.find(c => c.code === parsed.code) || currencies[0];
    }
    return currencies[0];
  });
  const [userId, setUserId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load currency from device storage on mount (non-blocking)
  useEffect(() => {
    loadDeviceState().then((deviceState) => {
      if (deviceState?.preferences?.currency && !localStorage.getItem(CURRENCY_STORAGE_KEY)) {
        const savedCurrency = currencies.find(c => c.code === deviceState.preferences!.currency);
        if (savedCurrency) {
          setCurrencyState(savedCurrency);
        }
      }
    });
  }, []);

  // Listen for auth state changes and load currency from profile
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const newUserId = session?.user?.id ?? null;
        setUserId(newUserId);
        
        if (newUserId && !isInitialized) {
          // Defer to avoid deadlock
          setTimeout(() => {
            loadCurrencyFromProfile(newUserId);
          }, 0);
        }
      }
    );

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      const newUserId = session?.user?.id ?? null;
      setUserId(newUserId);
      
      if (newUserId) {
        loadCurrencyFromProfile(newUserId);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadCurrencyFromProfile = async (uid: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('currency')
      .eq('id', uid)
      .maybeSingle();

    if (!error && data?.currency) {
      const savedCurrency = currencies.find(c => c.code === data.currency);
      if (savedCurrency) {
        setCurrencyState(savedCurrency);
        localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(savedCurrency));
      }
    }
    setIsInitialized(true);
  };

  // Save to localStorage whenever currency changes
  useEffect(() => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, JSON.stringify(currency));
  }, [currency]);

  const setCurrency = async (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    
    // Persist to device storage (non-blocking)
    saveDeviceState({
      preferences: {
        currency: newCurrency.code,
        theme: (localStorage.getItem('splitley-theme') as 'light' | 'dark' | 'system') || 'system',
        accent_color: localStorage.getItem('splitley-accent-color') || 'mint',
        notifications_enabled: Notification.permission === 'granted',
      },
    });
    
    // Save to database if user is logged in
    if (userId) {
      await supabase
        .from('profiles')
        .update({ currency: newCurrency.code })
        .eq('id', userId);
    }
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
    }).format(Math.abs(amount));
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
