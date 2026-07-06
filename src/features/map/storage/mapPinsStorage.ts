import AsyncStorage from '@react-native-async-storage/async-storage';
import { PokemonMapPin } from '../model/types';

const STORAGE_KEY = 'pokemon_map_pins';

function isStoredMapPin(value: unknown): value is PokemonMapPin {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const pin = value as Partial<PokemonMapPin>;
  return (
    typeof pin.id === 'string' &&
    typeof pin.latitude === 'number' &&
    Number.isFinite(pin.latitude) &&
    typeof pin.longitude === 'number' &&
    Number.isFinite(pin.longitude) &&
    typeof pin.pokemonName === 'string' &&
    typeof pin.pokemonUrl === 'string' &&
    typeof pin.createdAt === 'string'
  );
}

export async function getMapPins(): Promise<PokemonMapPin[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) {
      return [];
    }

    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn('Nieprawidłowy format pinów mapy w AsyncStorage.');
      return [];
    }

    return parsed.filter(isStoredMapPin);
  } catch (error) {
    console.error('Nie udało się odczytać pinów mapy:', error);
    return [];
  }
}

export async function saveMapPins(pins: PokemonMapPin[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch (error) {
    console.error('Nie udało się zapisać pinów mapy:', error);
  }
}
