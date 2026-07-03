import { Pokemon, PokemonDetails } from './types';

export interface PokemonListResponseDto {
  results: Pokemon[];
  next: string | null;
}

export type PokemonDetailsDto = PokemonDetails;