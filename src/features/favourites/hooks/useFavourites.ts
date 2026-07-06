import { useCallback, useEffect, useState } from 'react';
import { Pokemon } from '../../pokemon/model/types';
import { getFavourites, saveFavourites } from '../storage/favouritesStorage';

export function useFavourites() {
  const [favourites, setFavourites] = useState<Pokemon[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    getFavourites().then((data) => {
      setFavourites(data);
      setIsLoaded(true);
    });
  }, []);

  const toggleFavourite = useCallback(
    (pokemon: Pokemon) => {
      setFavourites((prev) => {
        const exists = prev.some((p) => p.name === pokemon.name);
        const next = exists
          ? prev.filter((p) => p.name !== pokemon.name)
          : [...prev, pokemon];
        saveFavourites(next);
        return next;
      });
    },
    []
  );

  const removeFavourite = useCallback((name: string) => {
    setFavourites((prev) => {
      const next = prev.filter((p) => p.name !== name);
      saveFavourites(next);
      return next;
    });
  }, []);

  const isFavourite = useCallback(
    (name: string) => favourites.some((p) => p.name === name),
    [favourites]
  );

  return { favourites, isLoaded, toggleFavourite, removeFavourite, isFavourite };
}
