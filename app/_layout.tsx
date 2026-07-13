import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { FavouritesProvider } from "../src/features/favourites/context/FavouritesContext";
import { CustomPokemonProvider } from "../src/features/customPokemon/context/CustomPokemonContext";
import { CustomPokemonDataCleanup } from "../src/features/customPokemon/context/CustomPokemonDataCleanup";
import { MapPinsProvider } from "../src/features/map/context/MapPinsContext";
import { queryClient } from "../src/shared/query/queryClient";

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BottomSheetModalProvider>
          <FavouritesProvider>
            <MapPinsProvider>
              <CustomPokemonProvider>
                <CustomPokemonDataCleanup />
                <Stack screenOptions={{ headerShown: false }} />
              </CustomPokemonProvider>
            </MapPinsProvider>
          </FavouritesProvider>
        </BottomSheetModalProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
