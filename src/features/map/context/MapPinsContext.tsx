import React, { createContext, useContext } from 'react';
import { useMapPins } from '../hooks/useMapPins';

type MapPinsContextValue = ReturnType<typeof useMapPins>;

const MapPinsContext = createContext<MapPinsContextValue | null>(null);

export function MapPinsProvider({ children }: { children: React.ReactNode }) {
  const value = useMapPins();
  return <MapPinsContext.Provider value={value}>{children}</MapPinsContext.Provider>;
}

export function useMapPinsContext(): MapPinsContextValue {
  const ctx = useContext(MapPinsContext);
  if (!ctx) {
    throw new Error('useMapPinsContext must be used within MapPinsProvider');
  }
  return ctx;
}
