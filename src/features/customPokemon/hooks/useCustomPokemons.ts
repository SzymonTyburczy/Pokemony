import { useCallback, useEffect, useMemo, useState } from "react";
import { CustomPokemon } from "../model/types";
import {
  getCustomPokemons,
  saveCustomPokemons,
} from "../storage/customPokemonStorage";

export function useCustomPokemons() {
  const [customPokemons, setCustomPokemons] = useState<CustomPokemon[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isActive = true;
    getCustomPokemons()
      .then((data) => {
        if (isActive) setCustomPokemons(data);
      })
      .catch((err) =>
        console.error("Błąd ładowania customowych Pokémonów:", err),
      )
      .finally(() => {
        if (isActive) setIsLoaded(true);
      });
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveCustomPokemons(customPokemons);
    }
  }, [customPokemons, isLoaded]);

  const addCustomPokemon = useCallback((pokemon: CustomPokemon) => {
    setCustomPokemons((prev) => [...prev, pokemon]);
  }, []);

  const removeCustomPokemon = useCallback((id: string) => {
    setCustomPokemons((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return useMemo(
    () => ({
      customPokemons,
      isLoaded,
      addCustomPokemon,
      removeCustomPokemon,
    }),
    [addCustomPokemon, customPokemons, isLoaded, removeCustomPokemon],
  );
}
