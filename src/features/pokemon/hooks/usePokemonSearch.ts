import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllPokemon } from '../api/pokemonApi';
import { pokemonQueryKeys } from '../queries/pokemonQueryKeys';

export function usePokemonSearch(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const isSearchActive = normalizedQuery.length > 0;

  const queryResult = useQuery({
    queryKey: pokemonQueryKeys.searchIndex(),
    queryFn: ({ signal }) => fetchAllPokemon(signal),
    enabled: isSearchActive,
    staleTime: 1000 * 60 * 60,
  });

  const results = useMemo(() => {
    if (!isSearchActive) {
      return [];
    }

    const allPokemons = queryResult.data?.results ?? [];
    return allPokemons.filter((pokemon) => pokemon.name.toLowerCase().includes(normalizedQuery));
  }, [isSearchActive, normalizedQuery, queryResult.data]);

  return {
    isSearchActive,
    results,
    isLoading: isSearchActive && queryResult.isPending,
    error: queryResult.error
      ? 'Nie udało się pobrać listy do wyszukiwania.'
      : null,
  };
}
