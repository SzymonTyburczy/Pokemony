import React, { createContext, useContext, useMemo } from "react";
import { useCustomPokemons } from "../hooks/useCustomPokemons";
import { CustomPokemon } from "../model/types";

interface CustomPokemonContextValue {
  customPokemons: CustomPokemon[];
  isLoaded: boolean;
  addCustomPokemon: (pokemon: CustomPokemon) => void;
  removeCustomPokemon: (id: string) => void;
}

type CustomPokemonStateContextValue = Pick<
  CustomPokemonContextValue,
  "customPokemons" | "isLoaded"
>;
type CustomPokemonActionsContextValue = Pick<
  CustomPokemonContextValue,
  "addCustomPokemon" | "removeCustomPokemon"
>;

const CustomPokemonStateContext =
  createContext<CustomPokemonStateContextValue | null>(null);
const CustomPokemonActionsContext =
  createContext<CustomPokemonActionsContextValue | null>(null);

export function CustomPokemonProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useCustomPokemons();
  const stateValue = useMemo(
    () => ({
      customPokemons: value.customPokemons,
      isLoaded: value.isLoaded,
    }),
    [value.customPokemons, value.isLoaded],
  );
  const actionsValue = useMemo(
    () => ({
      addCustomPokemon: value.addCustomPokemon,
      removeCustomPokemon: value.removeCustomPokemon,
    }),
    [value.addCustomPokemon, value.removeCustomPokemon],
  );

  return (
    <CustomPokemonStateContext.Provider value={stateValue}>
      <CustomPokemonActionsContext.Provider value={actionsValue}>
        {children}
      </CustomPokemonActionsContext.Provider>
    </CustomPokemonStateContext.Provider>
  );
}

export function useCustomPokemonStateContext(): CustomPokemonStateContextValue {
  const ctx = useContext(CustomPokemonStateContext);
  if (!ctx) {
    throw new Error(
      "useCustomPokemonStateContext must be used within CustomPokemonProvider",
    );
  }
  return ctx;
}

export function useCustomPokemonActionsContext(): CustomPokemonActionsContextValue {
  const ctx = useContext(CustomPokemonActionsContext);
  if (!ctx) {
    throw new Error(
      "useCustomPokemonActionsContext must be used within CustomPokemonProvider",
    );
  }
  return ctx;
}

export function useCustomPokemonContext(): CustomPokemonContextValue {
  const state = useCustomPokemonStateContext();
  const actions = useCustomPokemonActionsContext();

  return useMemo(
    () => ({
      ...state,
      ...actions,
    }),
    [actions, state],
  );
}
