import AsyncStorage from "@react-native-async-storage/async-storage";
import { CustomPokemon } from "../model/types";

const STORAGE_KEY = "@custom_pokemons";

function isStoredCustomPokemon(value: unknown): value is CustomPokemon {
  if (!value || typeof value !== "object") {
    return false;
  }

  const pokemon = value as Partial<CustomPokemon>;
  return (
    typeof pokemon.id === "string" &&
    typeof pokemon.name === "string" &&
    typeof pokemon.description === "string" &&
    (typeof pokemon.imageUri === "string" || pokemon.imageUri === null) &&
    typeof pokemon.height === "number" &&
    typeof pokemon.weight === "number" &&
    Array.isArray(pokemon.types) &&
    Array.isArray(pokemon.stats)
  );
}

export async function getCustomPokemons(): Promise<CustomPokemon[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      console.warn("Nieprawidłowy format własnych Pokémonów w AsyncStorage.");
      return [];
    }

    return parsed.filter(isStoredCustomPokemon);
  } catch (error) {
    console.error("Nie udało się odczytać własnych Pokémonów:", error);
    return [];
  }
}

export async function saveCustomPokemons(
  pokemons: CustomPokemon[],
): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pokemons));
  } catch (error) {
    console.error("Nie udało się zapisać własnych Pokémonów:", error);
  }
}
