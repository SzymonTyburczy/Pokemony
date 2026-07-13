import React, { createContext, useContext, useMemo } from "react";
import { useMapPins } from "../hooks/useMapPins";

type MapPinsContextValue = ReturnType<typeof useMapPins>;

type MapPinsStateContextValue = Pick<MapPinsContextValue, "pins" | "isLoaded">;
type MapPinsActionsContextValue = Omit<
  MapPinsContextValue,
  "pins" | "isLoaded"
>;

const MapPinsStateContext = createContext<MapPinsStateContextValue | null>(
  null,
);
const MapPinsActionsContext = createContext<MapPinsActionsContextValue | null>(
  null,
);

export function MapPinsProvider({ children }: { children: React.ReactNode }) {
  const value = useMapPins();
  const stateValue = useMemo(
    () => ({
      pins: value.pins,
      isLoaded: value.isLoaded,
    }),
    [value.isLoaded, value.pins],
  );
  const actionsValue = useMemo(
    () => ({
      addPin: value.addPin,
      removePin: value.removePin,
      removePinsForPokemonUrl: value.removePinsForPokemonUrl,
      updatePinPokemon: value.updatePinPokemon,
      updatePinLocation: value.updatePinLocation,
    }),
    [
      value.addPin,
      value.removePin,
      value.removePinsForPokemonUrl,
      value.updatePinLocation,
      value.updatePinPokemon,
    ],
  );

  return (
    <MapPinsStateContext.Provider value={stateValue}>
      <MapPinsActionsContext.Provider value={actionsValue}>
        {children}
      </MapPinsActionsContext.Provider>
    </MapPinsStateContext.Provider>
  );
}

export function useMapPinsStateContext(): MapPinsStateContextValue {
  const ctx = useContext(MapPinsStateContext);
  if (!ctx) {
    throw new Error(
      "useMapPinsStateContext must be used within MapPinsProvider",
    );
  }
  return ctx;
}

export function useMapPinsActionsContext(): MapPinsActionsContextValue {
  const ctx = useContext(MapPinsActionsContext);
  if (!ctx) {
    throw new Error(
      "useMapPinsActionsContext must be used within MapPinsProvider",
    );
  }
  return ctx;
}

export function useMapPinsContext(): MapPinsContextValue {
  const state = useMapPinsStateContext();
  const actions = useMapPinsActionsContext();

  return useMemo(
    () => ({
      ...state,
      ...actions,
    }),
    [actions, state],
  );
}
