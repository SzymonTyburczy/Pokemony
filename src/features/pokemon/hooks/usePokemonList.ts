import { useEffect, useRef, useState } from 'react';
import { fetchPokemonListByUrl, INITIAL_POKEMON_URL } from '../api/pokemonApi';
import { Pokemon } from '../model/types';

export function usePokemonList() {
  const [pokemons, setPokemons] = useState<Pokemon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextUrl, setNextUrl] = useState<string | null>(INITIAL_POKEMON_URL);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  const fetchPokemons = async (resetList: boolean = false) => {
    const requestUrl = resetList ? INITIAL_POKEMON_URL : nextUrl;

    if (isFetchingRef.current) {
      return;
    }

    if (!resetList && (!requestUrl || !hasMore || isLoadingMore || isRefreshing || isLoading)) {
      return;
    }

    if (!requestUrl) {
      return;
    }

    try {
      isFetchingRef.current = true;
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      if (resetList) {
        setIsLoading(pokemons.length === 0);
        setIsRefreshing(true);
        setHasMore(true);
      } else {
        setIsLoadingMore(true);
      }

      setError(null);

      const data = await fetchPokemonListByUrl(requestUrl, abortController.signal);

      if (!isMountedRef.current || abortController.signal.aborted) {
        return;
      }

      const nextPokemons = data.results ?? [];
      setPokemons((prevPokemons) =>
        resetList
          ? nextPokemons
          : [...prevPokemons, ...nextPokemons].filter(
              (pokemon, index, array) => array.findIndex((item) => item.name === pokemon.name) === index
            )
      );
      setNextUrl(data.next ?? null);
      setHasMore(Boolean(data.next));
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error('Błąd podczas pobierania danych:', err);
      if (resetList || pokemons.length === 0) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Nie udało się pobrać danych. Spróbuj ponownie później.');
        }
      }
    } finally {
      abortControllerRef.current = null;
      isFetchingRef.current = false;

      if (isMountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    fetchPokemons(true);

    return () => {
      isMountedRef.current = false;
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleLoadMore = () => {
    if (!isLoadingMore && hasMore && !isRefreshing && !isLoading) {
      fetchPokemons(false);
    }
  };

  const handleRefresh = () => {
    setNextUrl(INITIAL_POKEMON_URL);
    fetchPokemons(true);
  };

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
