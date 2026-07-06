export function getPokemonIdFromUrl(url: string): number | null {
  const match = url.match(/\/pokemon\/(\d+)\/?$/);
  if (match?.[1]) {
    return Number(match[1]);
  }

  const parts = url.split('/').filter(Boolean);
  const pokemonId = Number(parts.at(-1));
  return Number.isFinite(pokemonId) ? pokemonId : null;
}
