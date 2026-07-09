import AsyncStorage from '@react-native-async-storage/async-storage';
import { CustomPokemon } from '../model/types';

const STORAGE_KEY = '@custom_pokemons';

export async function getCustomPokemons(): Promise<CustomPokemon[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as CustomPokemon[];
}

export async function saveCustomPokemons(pokemons: CustomPokemon[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pokemons));
}
