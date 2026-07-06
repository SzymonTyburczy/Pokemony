import React, { createContext, useContext } from 'react';
import { useFavourites } from '../hooks/useFavourites';
import { Pokemon } from '../../pokemon/model/types';

interface FavouritesContextValue {
  favourites: Pokemon[];
  isLoaded: boolean;
  toggleFavourite: (pokemon: Pokemon) => void;
  removeFavourite: (name: string) => void;
  isFavourite: (name: string) => boolean;
}

const FavouritesContext = createContext<FavouritesContextValue | null>(null);

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const value = useFavourites();
  return <FavouritesContext.Provider value={value}>{children}</FavouritesContext.Provider>;
}

export function useFavouritesContext(): FavouritesContextValue {
  const ctx = useContext(FavouritesContext);
  if (!ctx) {
    throw new Error('useFavouritesContext must be used within FavouritesProvider');
  }
  return ctx;
}
