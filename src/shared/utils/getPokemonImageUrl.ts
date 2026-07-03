export function getPokemonImageUrl(url: string): string {
  const parts = url.split('/');
  const pokemonId = parts[parts.length - 2];
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`;
}