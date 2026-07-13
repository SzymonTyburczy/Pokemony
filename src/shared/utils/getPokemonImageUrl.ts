import { getPokemonIdFromUrl } from "./getPokemonIdFromUrl";

export function getPokemonImageUrl(url: string): string {
  const pokemonId = getPokemonIdFromUrl(url);
  if (!pokemonId) {
    return "";
  }

  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}
