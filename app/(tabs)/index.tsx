import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { useFavouritesContext } from '../../src/features/favourites/context/FavouritesContext';
import { getPokemonImageUrl } from '../../src/shared/utils/getPokemonImageUrl';
import { formatPokemonName } from '../../src/shared/utils/formatPokemonName';
import { usePokemonShowcase } from '../../src/features/pokemon/hooks/usePokemonShowcase';
import { PokemonAnimationModal } from '../../src/features/pokemon/ui/PokemonAnimationModal';
import { getCryPlayerHtml } from '../../src/features/pokemon/hooks/usePokemonCryPlayer';

export default function FavouritesScreen() {
  const router = useRouter();
  const { favourites, isLoaded, removeFavourite } = useFavouritesContext();
  const { selectedAnimation, playPokemonCry, webViewRef, showPokemon, closeAnimation } = usePokemonShowcase();
  const [currentIndex, setCurrentIndex] = useState(0);
  const { width } = useWindowDimensions();

  // Clamp index synchronicznie podczas renderowania, nie przez useEffect
  const safeIndex = favourites.length > 0 ? Math.min(currentIndex, favourites.length - 1) : 0;

  if (!isLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b4cca" />
      </View>
    );
  }

  if (favourites.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyIcon}>🤍</Text>
        <Text style={styles.emptyTitle}>Brak ulubionych</Text>
        <Text style={styles.emptySubtitle}>Dodaj Pokémona z listy, klikając ❤️</Text>
        <Pressable style={styles.goToListButton} onPress={() => router.push('/(tabs)/list')}>
          <Text style={styles.goToListText}>Przejdź do listy</Text>
        </Pressable>
      </View>
    );
  }

  const pokemon = favourites[safeIndex];
  if (!pokemon) return null;
  const imageUrl = getPokemonImageUrl(pokemon.url);
  const hasNext = safeIndex < favourites.length - 1;
  const hasPrev = safeIndex > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Ulubione</Text>

      {/* Licznik */}
      <Text style={styles.counter}>
        {safeIndex + 1} / {favourites.length}
      </Text>

      {/* Karta pokémona */}
      <Pressable
        style={({ pressed }) => [styles.card, { width: width - 48 }, pressed && styles.cardPressed]}
        onPress={() => showPokemon(pokemon)}
      >
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
        <Text style={styles.pokemonName}>{formatPokemonName(pokemon.name)}</Text>

        {/* Przycisk usunięcia */}
        <Pressable
          style={({ pressed }) => [styles.removeButton, pressed && styles.removeButtonPressed]}
          onPress={(e) => {
            e.stopPropagation?.();
            removeFavourite(pokemon.name);
          }}
        >
          <Text style={styles.removeButtonText}>💔 Usuń z ulubionych</Text>
        </Pressable>
      </Pressable>

      {/* Nawigacja */}
      <View style={styles.navRow}>
        <Pressable
          style={({ pressed }) => [styles.navButton, !hasPrev && styles.navButtonDisabled, pressed && styles.navPressed]}
          onPress={() => setCurrentIndex((i) => i - 1)}
          disabled={!hasPrev}
        >
          <Text style={[styles.navArrow, !hasPrev && styles.navArrowDisabled]}>←</Text>
        </Pressable>

        {/* Kropki */}
        <View style={styles.dotsRow}>
          {favourites.map((_, i) => (
            <Pressable key={i} onPress={() => setCurrentIndex(i)}>
              <View style={[styles.dot, i === safeIndex && styles.dotActive]} />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.navButton, !hasNext && styles.navButtonDisabled, pressed && styles.navPressed]}
          onPress={() => setCurrentIndex((i) => i + 1)}
          disabled={!hasNext}
        >
          <Text style={[styles.navArrow, !hasNext && styles.navArrowDisabled]}>→</Text>
        </Pressable>
      </View>

      <WebView
        ref={webViewRef}
        source={{ html: getCryPlayerHtml() }}
        style={styles.hiddenWebView}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
      />

      <PokemonAnimationModal
        animation={selectedAnimation}
        onClose={closeAnimation}
        onPokemonSound={playPokemonCry}
        hasCry
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hiddenWebView: {
    width: 0,
    height: 0,
    position: 'absolute',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 60,
  },
  center: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3b4cca',
    marginBottom: 4,
  },
  counter: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    alignItems: 'center',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardPressed: {
    opacity: 0.82,
  },
  image: {
    width: 200,
    height: 200,
    marginBottom: 16,
  },
  pokemonName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
    textAlign: 'center',
  },
  removeButton: {
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  removeButtonPressed: {
    opacity: 0.7,
  },
  removeButtonText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 15,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 32,
    gap: 16,
  },
  navButton: {
    backgroundColor: '#3b4cca',
    borderRadius: 12,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    backgroundColor: '#e5e7eb',
  },
  navPressed: {
    opacity: 0.75,
  },
  navArrow: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  navArrowDisabled: {
    color: '#9ca3af',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
    maxWidth: 160,
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  dotActive: {
    backgroundColor: '#3b4cca',
    width: 20,
  },
  // Empty state
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 28,
  },
  goToListButton: {
    backgroundColor: '#3b4cca',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  goToListText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
