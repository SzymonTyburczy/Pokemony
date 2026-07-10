import React, { createContext, useContext, useMemo } from 'react';
import { useFavourites } from '../hooks/useFavourites';
import { Pokemon } from '../../pokemon/model/types';

interface FavouritesContextValue {
  favourites: Pokemon[];
  favouriteUrlSet: ReadonlySet<string>;
  isLoaded: boolean;
  toggleFavourite: (pokemon: Pokemon) => void;
  removeFavourite: (url: string) => void;
  isFavourite: (url: string) => boolean;
}

type FavouritesStateContextValue = Pick<
  FavouritesContextValue,
  'favourites' | 'favouriteUrlSet' | 'isLoaded' | 'isFavourite'
>;
type FavouritesActionsContextValue = Pick<
  FavouritesContextValue,
  'toggleFavourite' | 'removeFavourite'
>;

const FavouritesStateContext = createContext<FavouritesStateContextValue | null>(null);
const FavouritesActionsContext = createContext<FavouritesActionsContextValue | null>(null);

export function FavouritesProvider({ children }: { children: React.ReactNode }) {
  const value = useFavourites();
  const stateValue = useMemo(
    () => ({
      favourites: value.favourites,
      favouriteUrlSet: value.favouriteUrlSet,
      isLoaded: value.isLoaded,
      isFavourite: value.isFavourite,
    }),
    [value.favouriteUrlSet, value.favourites, value.isFavourite, value.isLoaded]
  );
  const actionsValue = useMemo(
    () => ({
      toggleFavourite: value.toggleFavourite,
      removeFavourite: value.removeFavourite,
    }),
    [value.removeFavourite, value.toggleFavourite]
  );

  return (
    <FavouritesStateContext.Provider value={stateValue}>
      <FavouritesActionsContext.Provider value={actionsValue}>
        {children}
      </FavouritesActionsContext.Provider>
    </FavouritesStateContext.Provider>
  );
}

export function useFavouritesStateContext(): FavouritesStateContextValue {
  const ctx = useContext(FavouritesStateContext);
  if (!ctx) {
    throw new Error('useFavouritesStateContext must be used within FavouritesProvider');
  }
  return ctx;
}

export function useFavouritesActionsContext(): FavouritesActionsContextValue {
  const ctx = useContext(FavouritesActionsContext);
  if (!ctx) {
    throw new Error('useFavouritesActionsContext must be used within FavouritesProvider');
  }
  return ctx;
}

export function useFavouritesContext(): FavouritesContextValue {
  const state = useFavouritesStateContext();
  const actions = useFavouritesActionsContext();

  return useMemo(
    () => ({
      ...state,
      ...actions,
    }),
    [actions, state]
  );
}
