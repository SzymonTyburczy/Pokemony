# Codebase Overview

Krotkie podsumowanie tego, co jest gdzie w projekcie.

## Root / konfiguracja

- `App.tsx`
  Starszy entry point React Native. Przy `expo-router` zwykle nie jest glownym miejscem logiki.
- `index.ts`
  Start aplikacji.
- `app.config.js`
  Konfiguracja Expo.
- `babel.config.js`
  Konfiguracja Babela.
- `expo-env.d.ts`
  Typy srodowiska Expo.
- `AGENTS.md`
  Instrukcje do pracy w tym repo.
- `CLAUDE.md`
  Dodatkowe notatki / instrukcje projektowe.
- `implementation_plan.md`
  Plan implementacyjny.
- `implementation_plan_camera_feature.md`
  Plan implementacyjny dla funkcji kamery.

## Routing / ekrany

- `app/_layout.tsx`
  Root layout aplikacji. Provider ulubionych, provider bottom sheet, gesture root.
- `app/(tabs)/_layout.tsx`
  Konfiguracja dolnych zakladek.
- `app/(tabs)/index.tsx`
  Glowny ekran ulubionych.
- `app/(tabs)/list.tsx`
  Lista Pokemonow.
- `app/(tabs)/map.tsx`
  Ekran mapy z pinami i bottom sheetem.
- `app/(tabs)/camera.tsx`
  Ekran kamery.
- `app/(tabs)/additional.tsx`
  Dodatkowy ekran z lista ulubionych i swipe do usuwania.
- `app/pokemon/[name].tsx`
  Pelny ekran szczegolow pojedynczego Pokemona.

## Favourites feature

- `src/features/favourites/context/FavouritesContext.tsx`
  Context udostepniajacy ulubione w calej aplikacji.
- `src/features/favourites/hooks/useFavourites.ts`
  Logika ladowania, zapisu i modyfikacji ulubionych.
- `src/features/favourites/storage/favouritesStorage.ts`
  AsyncStorage dla ulubionych.

## Map feature

- `src/features/map/model/types.ts`
  Typy pinow mapy i lokalizacji oczekujacej.
- `src/features/map/hooks/useMapPins.ts`
  Logika CRUD pinow mapy.
- `src/features/map/storage/mapPinsStorage.ts`
  AsyncStorage dla pinow mapy.
- `src/features/map/ui/MapPokemonDetailsSheetContent.tsx`
  Zawartosc pelnych szczegolow Pokemona pokazywana wewnatrz sheeta mapy.

## Pokemon feature: API i modele

- `src/features/pokemon/api/pokemonApi.ts`
  Pobieranie danych Pokemona z API.
- `src/features/pokemon/api/pokemon3dApi.ts`
  Pobieranie / przygotowanie modeli 3D Pokemonow.
- `src/features/pokemon/model/types.ts`
  Glowne typy Pokemonow i szczegolow.
- `src/features/pokemon/model/dto.ts`
  Typy DTO do danych z API.
- `src/features/pokemon/model/pokemon3d.ts`
  Typy zwiazane z modelami 3D i animacja.

## Pokemon feature: hooki

- `src/features/pokemon/hooks/usePokemonList.ts`
  Ladowanie listy Pokemonow.
- `src/features/pokemon/hooks/usePokemonSearch.ts`
  Wyszukiwanie Pokemona po nazwie.
- `src/features/pokemon/hooks/usePokemonDetails.ts`
  Pobieranie szczegolow jednego Pokemona.
- `src/features/pokemon/hooks/usePokemonShowcase.ts`
  Logika otwierania animacji 3D i odtwarzania cry.
- `src/features/pokemon/hooks/usePokemonCryPlayer.ts`
  Odtwarzanie cry przez ukryty WebView.
- `src/features/pokemon/hooks/usePokemonCryExists.ts`
  Sprawdzenie, czy dany Pokemon ma dostepny cry.

## Pokemon feature: UI

- `src/features/pokemon/ui/PokemonListItem.tsx`
  Wiersz na liscie Pokemonow.
- `src/features/pokemon/ui/PokemonDetailsCard.tsx`
  Karta ze szczegolami Pokemona.
- `src/features/pokemon/ui/PokemonDescription.tsx`
  Opis Pokemona.
- `src/features/pokemon/ui/PokemonAnimationModal.tsx`
  Modal z modelem 3D Pokemona.

## Shared utils

- `src/shared/utils/formatPokemonName.ts`
  Formatowanie nazwy Pokemona do UI.
- `src/shared/utils/getPokemonIdFromUrl.ts`
  Wyciagniecie ID Pokemona z URL API.
- `src/shared/utils/getPokemonImageUrl.ts`
  Budowanie URL obrazka Pokemona.
- `src/shared/utils/getPokemonCryUrl.ts`
  Budowanie URL pliku cry.

## Jak czytac projekt na start

Najlepsza kolejnosc na wejscie:

1. `app/(tabs)/_layout.tsx`
2. `app/(tabs)/list.tsx`
3. `app/(tabs)/map.tsx`
4. `src/features/favourites/context/FavouritesContext.tsx`
5. `src/features/pokemon/hooks/*`

To daje szybki obraz routingu, ekranow i logiki danych.
