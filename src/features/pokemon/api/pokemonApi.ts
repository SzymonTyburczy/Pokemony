import { PokemonDetailsDto, PokemonListResponseDto } from '../model/dto';

export const PAGE_LIMIT = 20;
export const INITIAL_POKEMON_URL = `https://pokeapi.co/api/v2/pokemon?limit=${PAGE_LIMIT}&offset=0`;

export async function fetchPokemonListByUrl(url: string, signal?: AbortSignal): Promise<PokemonListResponseDto> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchPokemonDetails(name: string, signal?: AbortSignal): Promise<PokemonDetailsDto> {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`, { signal });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}
