import { useEffect } from 'react';
import { useFavouritesContext } from '../../favourites/context/FavouritesContext';
import { useMapPinsContext } from '../../map/context/MapPinsContext';
import { useCustomPokemonContext } from './CustomPokemonContext';
import { CUSTOM_POKEMON_URL_PREFIX, isCustomPokemonUrl } from '../utils/customPokemonFavourites';

function getCustomPokemonUrl(id: string): string {
  return `${CUSTOM_POKEMON_URL_PREFIX}${id}`;
}

export function CustomPokemonDataCleanup() {
  const { customPokemons, isLoaded: areCustomPokemonsLoaded } = useCustomPokemonContext();
  const { favourites, isLoaded: areFavouritesLoaded, removeFavourite } = useFavouritesContext();
  const { pins, isLoaded: arePinsLoaded, removePinsForPokemonUrl } = useMapPinsContext();

  useEffect(() => {
    if (!areCustomPokemonsLoaded || !areFavouritesLoaded || !arePinsLoaded) {
      return;
    }

    const existingCustomPokemonUrls = new Set(customPokemons.map((pokemon) => getCustomPokemonUrl(pokemon.id)));
    const orphanFavouriteUrls = favourites
      .map((pokemon) => pokemon.url)
      .filter((url) => isCustomPokemonUrl(url) && !existingCustomPokemonUrls.has(url));
    const orphanPinUrls = Array.from(
      new Set(
        pins
          .map((pin) => pin.pokemonUrl)
          .filter((url) => isCustomPokemonUrl(url) && !existingCustomPokemonUrls.has(url))
      )
    );

    orphanFavouriteUrls.forEach(removeFavourite);
    orphanPinUrls.forEach(removePinsForPokemonUrl);
  }, [
    areCustomPokemonsLoaded,
    areFavouritesLoaded,
    arePinsLoaded,
    customPokemons,
    favourites,
    pins,
    removeFavourite,
    removePinsForPokemonUrl,
  ]);

  return null;
}
