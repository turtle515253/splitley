import React, { createContext, useContext, useState, useCallback } from 'react';

interface HydrationContextType {
  isHydrated: boolean;
  markHydrated: () => void;
}

const HydrationContext = createContext<HydrationContextType>({
  isHydrated: false,
  markHydrated: () => {},
});

export function HydrationProvider({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);

  const markHydrated = useCallback(() => {
    setIsHydrated(true);
  }, []);

  return (
    <HydrationContext.Provider value={{ isHydrated, markHydrated }}>
      {children}
    </HydrationContext.Provider>
  );
}

export function useHydration() {
  return useContext(HydrationContext);
}
