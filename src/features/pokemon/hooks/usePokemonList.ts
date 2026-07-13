import { useCallback, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchPokemonListByUrl, INITIAL_POKEMON_URL } from "../api/pokemonApi";
import { pokemonQueryKeys } from "../queries/pokemonQueryKeys";

export function usePokemonList() {
  const {
    data,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
    isRefetching,
    refetch,
  } = useInfiniteQuery({
    queryKey: pokemonQueryKeys.list(),
    queryFn: ({ pageParam, signal }) =>
      fetchPokemonListByUrl(pageParam, signal),
    initialPageParam: INITIAL_POKEMON_URL,
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
    staleTime: 1000 * 60 * 10,
  });

  const pokemons = useMemo(() => {
    const seenPokemonNames = new Set<string>();
    const pages = data?.pages ?? [];

    return pages
      .flatMap((page) => page.results ?? [])
      .filter((pokemon) => {
        if (seenPokemonNames.has(pokemon.name)) {
          return false;
        }

        seenPokemonNames.add(pokemon.name);
        return true;
      });
  }, [data]);

  const isLoadingMore = isFetchingNextPage;
  const isLoading = isPending;
  const isRefreshing = isRefetching && !isFetchingNextPage && !isPending;
  const hasMore = Boolean(hasNextPage);
  const error = queryError instanceof Error ? queryError.message : null;

  const fetchPokemons = useCallback(
    async (resetList: boolean = false) => {
      if (resetList) {
        await refetch();
        return;
      }

      if (!hasNextPage || isFetchingNextPage || isPending || isRefetching) {
        return;
      }

      await fetchNextPage();
    },
    [
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isPending,
      isRefetching,
      refetch,
    ],
  );

  const handleLoadMore = useCallback(() => {
    fetchPokemons(false);
  }, [fetchPokemons]);

  const handleRefresh = useCallback(() => {
    fetchPokemons(true);
  }, [fetchPokemons]);

  return {
    pokemons,
    isLoading,
    isLoadingMore,
    isRefreshing,
    hasMore,
    error,
    fetchPokemons,
    handleLoadMore,
    handleRefresh,
  };
}
