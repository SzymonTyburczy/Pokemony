import { PokemonDetailsDto, PokemonListResponseDto } from '../model/dto';

export const PAGE_LIMIT = 20;
export const INITIAL_POKEMON_URL = `https://pokeapi.co/api/v2/pokemon?limit=${PAGE_LIMIT}&offset=0`;
export const ALL_POKEMON_URL = 'https://pokeapi.co/api/v2/pokemon?limit=100000&offset=0';

export async function fetchPokemonListByUrl(url: string, signal?: AbortSignal): Promise<PokemonListResponseDto> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export function fetchAllPokemon(signal?: AbortSignal): Promise<PokemonListResponseDto> {
  return fetchPokemonListByUrl(ALL_POKEMON_URL, signal);
}

export async function fetchPokemonDetails(name: string, signal?: AbortSignal): Promise<PokemonDetailsDto> {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`, { signal });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function fetchPokemonSpecies(name: string, signal?: AbortSignal): Promise<any> {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${name}`, { signal });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export async function translateTextToPolish(text: string, signal?: AbortSignal): Promise<string> {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=pl&dt=t&q=${encodeURIComponent(text)}`;
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  if (data && data[0]) {
    return data[0].map((item: any) => item[0]).join('');
  }
  return text;
}
