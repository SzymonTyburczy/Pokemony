import { useCallback, useEffect, useState } from 'react';
import { Pokemon } from '../../pokemon/model/types';
import { getFavourites, saveFavourites } from '../storage/favouritesStorage';
import { Alert } from 'react-native';

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

  const toggleFavourite = useCallback((pokemon: Pokemon) => {
  setFavourites((prev) => {
    const exists = prev.some((p) => p.name === pokemon.name);

    if (exists) {
      return prev.filter((p) => p.name !== pokemon.name);
    }

    if (prev.length >= 7) {
      Alert.alert(
        'Ograniczenie ulubionych Pokémonów',
        'Możesz mieć maksymalnie 7 ulubionych Pokémonów.'
      );
      return prev;
    }

    return [...prev, pokemon];
  });
}, []);

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
