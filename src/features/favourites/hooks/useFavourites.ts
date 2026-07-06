import { useCallback, useEffect, useState } from 'react';
import { Pokemon } from '../../pokemon/model/types';
import { getFavourites, saveFavourites } from '../storage/favouritesStorage';

export function useFavourites() {
  const [favourites, setFavourites] = useState<Pokemon[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isActive = true;

    getFavourites()
      .then((data) => {
        if (isActive) {
          setFavourites(data);
        }
      })
      .catch((error) => {
        console.error('Nie udało się załadować ulubionych Pokémonów:', error);
      })
      .finally(() => {
        if (isActive) {
          setIsLoaded(true);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveFavourites(favourites);
    }
  }, [favourites, isLoaded]);

  const toggleFavourite = useCallback(
    (pokemon: Pokemon) => {
      setFavourites((prev) => {
        const exists = prev.some((p) => p.name === pokemon.name);
        return exists
          ? prev.filter((p) => p.name !== pokemon.name)
          : [...prev, pokemon];
      });
    },
    []
  );

  const removeFavourite = useCallback(
    (name: string) => {
      setFavourites((prev) => prev.filter((p) => p.name !== name));
    },
    []
  );

  const isFavourite = useCallback(
    (name: string) => favourites.some((p) => p.name === name),
    [favourites]
  );

  return { favourites, isLoaded, toggleFavourite, removeFavourite, isFavourite };
}
