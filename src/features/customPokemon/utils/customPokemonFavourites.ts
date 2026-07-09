import { Pokemon } from '../../pokemon/model/types';
import { CustomPokemon } from '../model/types';
import { getPokemonImageUrl } from '../../../shared/utils/getPokemonImageUrl';

export const CUSTOM_POKEMON_URL_PREFIX = 'custom://';

export function customPokemonToFavourite(pokemon: CustomPokemon): Pokemon {
  return {
    name: pokemon.name,
    url: `${CUSTOM_POKEMON_URL_PREFIX}${pokemon.id}`,
  };
}

export function isCustomPokemonFavourite(pokemon: Pokemon): boolean {
  return pokemon.url.startsWith(CUSTOM_POKEMON_URL_PREFIX);
}

export function getCustomPokemonIdFromFavourite(pokemon: Pokemon): string | null {
  if (!isCustomPokemonFavourite(pokemon)) return null;
  return pokemon.url.slice(CUSTOM_POKEMON_URL_PREFIX.length);
}

export function getFavouriteImageUrl(pokemon: Pokemon, customPokemons: CustomPokemon[]): string {
  const customId = getCustomPokemonIdFromFavourite(pokemon);
  if (customId) {
    return customPokemons.find((p) => p.id === customId)?.imageUri ?? '';
  }
  return getPokemonImageUrl(pokemon.url);
}

export function getFavouriteDetailsRoute(pokemon: Pokemon): string {
  const customId = getCustomPokemonIdFromFavourite(pokemon);
  if (customId) return `/custom-pokemon/${customId}`;
  return `/pokemon/${pokemon.name}`;
}

export function isCustomPokemonUrl(url: string): boolean {
  return url.startsWith(CUSTOM_POKEMON_URL_PREFIX);
}

export function getCustomPokemonByUrl(
  url: string,
  customPokemons: CustomPokemon[],
): CustomPokemon | undefined {
  if (!isCustomPokemonUrl(url)) return undefined;
  const id = url.slice(CUSTOM_POKEMON_URL_PREFIX.length);
  return customPokemons.find((p) => p.id === id);
}

export function getPokemonUrlImage(url: string, customPokemons: CustomPokemon[]): string {
  return getFavouriteImageUrl({ name: '', url }, customPokemons);
}
