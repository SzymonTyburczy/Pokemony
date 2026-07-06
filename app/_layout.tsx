import { Stack } from 'expo-router';
import { FavouritesProvider } from '../src/features/favourites/context/FavouritesContext';

export default function RootLayout() {
  return (
    <FavouritesProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </FavouritesProvider>
  );
}
