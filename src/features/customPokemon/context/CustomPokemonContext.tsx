import React, { createContext, useContext } from 'react';
import { useCustomPokemons } from '../hooks/useCustomPokemons';
import { CustomPokemon } from '../model/types';

interface CustomPokemonContextValue {
  customPokemons: CustomPokemon[];
  isLoaded: boolean;
  addCustomPokemon: (pokemon: CustomPokemon) => void;
  removeCustomPokemon: (id: string) => void;
}

const CustomPokemonContext = createContext<CustomPokemonContextValue | null>(null);

export function CustomPokemonProvider({ children }: { children: React.ReactNode }) {
  const value = useCustomPokemons();
  return <CustomPokemonContext.Provider value={value}>{children}</CustomPokemonContext.Provider>;
}

export function useCustomPokemonContext(): CustomPokemonContextValue {
  const ctx = useContext(CustomPokemonContext);
  if (!ctx) {
    throw new Error('useCustomPokemonContext must be used within CustomPokemonProvider');
  }
  return ctx;
}
