import { useEffect, useMemo, useState } from 'react';
import { fetchAllPokemon } from '../api/pokemonApi';
import { Pokemon } from '../model/types';

export function usePokemonSearch(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const [allPokemons, setAllPokemons] = useState<Pokemon[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!normalizedQuery || allPokemons) {
      return;
    }

    const abortController = new AbortController();
    let isActive = true;

    setIsLoading(true);
    setError(null);

    fetchAllPokemon(abortController.signal)
      .then((data) => {
        if (isActive) {
          setAllPokemons(data.results ?? []);
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        console.error('Nie udało się pobrać listy do wyszukiwania:', err);
        if (isActive) {
          setError('Nie udało się pobrać listy do wyszukiwania.');
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [allPokemons, normalizedQuery]);

  const results = useMemo(() => {
    if (!normalizedQuery || !allPokemons) {
      return [];
    }

    return allPokemons.filter((pokemon) => pokemon.name.toLowerCase().includes(normalizedQuery));
  }, [allPokemons, normalizedQuery]);

  return {
    isSearchActive: normalizedQuery.length > 0,
    results,
    isLoading,
    error,
  };
}
