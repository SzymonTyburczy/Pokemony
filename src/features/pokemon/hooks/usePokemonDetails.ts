import { useQuery } from "@tanstack/react-query";
import { fetchPokemonDetails } from "../api/pokemonApi";
import { pokemonQueryKeys } from "../queries/pokemonQueryKeys";

export function usePokemonDetails(pokemonName?: string) {
  const query = useQuery({
    queryKey: pokemonQueryKeys.details(pokemonName ?? ""),
    queryFn: ({ signal }) => fetchPokemonDetails(pokemonName!, signal),
    enabled: Boolean(pokemonName),
    staleTime: 1000 * 60 * 10,
  });

  return {
    pokemon: query.data ?? null,
    isLoading: Boolean(pokemonName) && query.isPending,
    error: !pokemonName
      ? "Brak nazwy Pokémona."
      : query.error instanceof Error
        ? query.error.message
        : null,
    refetch: query.refetch,
  };
}
