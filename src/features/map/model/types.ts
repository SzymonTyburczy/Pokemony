export interface PokemonMapPin {
  id: string;
  latitude: number;
  longitude: number;
  pokemonName: string;
  pokemonUrl: string;
  createdAt: string;
}

export interface PendingMapPinLocation {
  latitude: number;
  longitude: number;
}
