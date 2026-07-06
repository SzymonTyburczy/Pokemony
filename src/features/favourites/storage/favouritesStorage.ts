import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pokemon } from '../../pokemon/model/types';

const STORAGE_KEY = 'favourites_pokemon';

function isStoredPokemon(value: unknown): value is Pokemon {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const pokemon = value as Partial<Pokemon>;
  return typeof pokemon.name === 'string' && typeof pokemon.url === 'string';
}

export async function getFavourites(): Promise<Pokemon[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) {
      return [];
    }

    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn('Nieprawidłowy format ulubionych Pokémonów w AsyncStorage.');
      return [];
    }

    return parsed.filter(isStoredPokemon);
  } catch (error) {
    console.error('Nie udało się odczytać ulubionych Pokémonów:', error);
    return [];
  }
}

export async function saveFavourites(favourites: Pokemon[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favourites));
  } catch (error) {
    console.error('Nie udało się zapisać ulubionych Pokémonów:', error);
  }
}
