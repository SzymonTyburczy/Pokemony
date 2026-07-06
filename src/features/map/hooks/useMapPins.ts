import { useCallback, useEffect, useState } from 'react';
import { Pokemon } from '../../pokemon/model/types';
import { PendingMapPinLocation, PokemonMapPin } from '../model/types';
import { getMapPins, saveMapPins } from '../storage/mapPinsStorage';

function createPinId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useMapPins() {
  const [pins, setPins] = useState<PokemonMapPin[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let isActive = true;

    getMapPins()
      .then((storedPins) => {
        if (isActive) {
          setPins(storedPins);
        }
      })
      .catch((error) => {
        console.error('Nie udało się załadować pinów mapy:', error);
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
      saveMapPins(pins);
    }
  }, [pins, isLoaded]);

  const addPin = useCallback((location: PendingMapPinLocation, pokemon: Pokemon) => {
    const nextPin: PokemonMapPin = {
      id: createPinId(),
      latitude: location.latitude,
      longitude: location.longitude,
      pokemonName: pokemon.name,
      pokemonUrl: pokemon.url,
      createdAt: new Date().toISOString(),
    };

    setPins((prev) => [...prev, nextPin]);
    return nextPin;
  }, []);

  const removePin = useCallback((id: string) => {
    setPins((prev) => prev.filter((pin) => pin.id !== id));
  }, []);

  return {
    pins,
    isLoaded,
    addPin,
    removePin,
  };
}
