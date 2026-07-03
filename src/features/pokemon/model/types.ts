export interface Pokemon {
  name: string;
  url: string;
}

export interface PokemonDetails {
  id: number;
  name: string;
  height: number;
  weight: number;
  types: Array<{ type: { name: string } }>;
  stats: Array<{ base_stat: number; stat: { name: string } }>;
  sprites: {
    other?: {
      'official-artwork'?: {
        front_default?: string | null;
      };
    };
    front_default?: string | null;
  };
}