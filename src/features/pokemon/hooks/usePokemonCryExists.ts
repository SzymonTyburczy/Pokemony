import { useQuery } from '@tanstack/react-query';
import { fetchAvailableCryIds } from '../api/pokemonCryApi';
import { pokemonQueryKeys } from '../queries/pokemonQueryKeys';

/**
 * Checks whether a cry audio file actually exists for the given Pokemon ID.
 * Returns `true` if available, `false` if not, `null` while loading.
 */
export function usePokemonCryExists(pokemonId: number | undefined): boolean | null {
  const query = useQuery({
    queryKey: pokemonQueryKeys.cryIds(),
    queryFn: ({ signal }) => fetchAvailableCryIds(signal),
    enabled: Boolean(pokemonId),
    staleTime: 1000 * 60 * 60 * 24,
  });

  if (!pokemonId) {
    return false;
  }

  if (query.isPending) {
    return null;
  }

  if (query.isError || !query.data) {
    return true;
  }

  return query.data.has(pokemonId);
}
