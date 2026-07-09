export interface CustomPokemonStat {
  name: string;
  value: number;
}

export interface CustomPokemon {
  id: string;
  name: string;
  description: string;
  imageUri: string | null;
  height: number;
  weight: number;
  types: string[];
  stats: CustomPokemonStat[];
}
