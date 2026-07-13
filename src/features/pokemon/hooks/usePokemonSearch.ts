import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchAllPokemon } from "../api/pokemonApi";
import { pokemonQueryKeys } from "../queries/pokemonQueryKeys";
import { Pokemon } from "../model/types";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";

const SEARCH_DEBOUNCE_MS = 300;
const MAX_SEARCH_RESULTS = 50;

type SearchablePokemon = Pokemon & {
  normalizedName: string;
};

export function usePokemonSearch(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  const debouncedQuery = useDebouncedValue(normalizedQuery, SEARCH_DEBOUNCE_MS);
  const isSearchActive = normalizedQuery.length > 0;
  const isDebouncing = isSearchActive && normalizedQuery !== debouncedQuery;

  const queryResult = useQuery({
    queryKey: pokemonQueryKeys.searchIndex(),
    queryFn: ({ signal }) => fetchAllPokemon(signal),
    enabled: debouncedQuery.length > 0,
    select: (data): SearchablePokemon[] =>
      (data.results ?? []).map((pokemon) => ({
        ...pokemon,
        normalizedName: pokemon.name.toLowerCase(),
      })),
    staleTime: 1000 * 60 * 60,
  });

  const results = useMemo(() => {
    if (!isSearchActive || isDebouncing) {
      return [];
    }

    const allPokemons = queryResult.data ?? [];
    return allPokemons
      .filter((pokemon) => pokemon.normalizedName.includes(debouncedQuery))
      .slice(0, MAX_SEARCH_RESULTS);
  }, [debouncedQuery, isDebouncing, isSearchActive, queryResult.data]);

  return {
    isSearchActive,
    results,
    isLoading: isSearchActive && (isDebouncing || queryResult.isPending),
    error: queryResult.error
      ? "Nie udało się pobrać listy do wyszukiwania."
      : null,
  };
}
