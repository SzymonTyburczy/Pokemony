import { useEffect, useState } from 'react';
import { fetchPokemonDetails } from '../api/pokemonApi';
import { PokemonDetails } from '../model/types';

export function usePokemonDetails(pokemonName?: string) {
  const [pokemon, setPokemon] = useState<PokemonDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!pokemonName) {
        setError('Brak nazwy Pokémona.');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const data = await fetchPokemonDetails(pokemonName);
        setPokemon(data);
      } catch (err: unknown) {
        console.error('Błąd podczas pobierania szczegółów Pokémona:', err);
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Nie udało się pobrać szczegółów Pokémona.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [pokemonName]);

  return {
    pokemon,
    isLoading,
    error,
  };
}