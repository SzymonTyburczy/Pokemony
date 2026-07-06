import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pokemon } from '../../pokemon/model/types';

const STORAGE_KEY = 'favourites_pokemon';

export async function getFavourites(): Promise<Pokemon[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    return json ? (JSON.parse(json) as Pokemon[]) : [];
  } catch {
    return [];
  }
}

export async function saveFavourites(favourites: Pokemon[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(favourites));
  } catch {
    // ignorujemy błędy zapisu
  }
}
