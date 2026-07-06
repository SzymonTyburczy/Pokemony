import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePokemonDetails } from '../../src/features/pokemon/hooks/usePokemonDetails';
import { PokemonDetailsCard } from '../../src/features/pokemon/ui/PokemonDetailsCard';
import { usePokemonShowcase } from '../../src/features/pokemon/hooks/usePokemonShowcase';
import { PokemonAnimationModal } from '../../src/features/pokemon/ui/PokemonAnimationModal';
import { usePokemonCryExists } from '../../src/features/pokemon/hooks/usePokemonCryExists';
import { getCryPlayerHtml } from '../../src/features/pokemon/hooks/usePokemonCryPlayer';

export default function PokemonDetailsScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string | string[] }>();
  const pokemonName = Array.isArray(name) ? name[0] : name;

  const { pokemon, isLoading, error } = usePokemonDetails(pokemonName);
  const { selectedAnimation, playPokemonCry, webViewRef, showPokemonById, closeAnimation } = usePokemonShowcase();
  const hasCry = usePokemonCryExists(pokemon?.id);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b4cca" />
      </View>
    );
  }

  if (error || !pokemon) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>⚠️ Nie udało się otworzyć szczegółów</Text>
        <Text style={styles.errorText}>{error || 'Brak danych Pokémona.'}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Wróć</Text>
        </Pressable>
      </View>
    );
  }

  const cryAvailable = hasCry === true;

  return (
    <>
      {/* Hidden WebView for OGG audio playback (iOS doesn't support OGG natively) */}
      <WebView
        ref={webViewRef}
        source={{ html: getCryPlayerHtml() }}
        style={styles.hiddenWebView}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
      />

      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Wróć</Text>
        </Pressable>

        <PokemonDetailsCard
          pokemon={pokemon}
          onImagePress={() => showPokemonById(pokemon.id, pokemon.name)}
          onSoundPress={cryAvailable ? () => playPokemonCry(pokemon.id) : undefined}
          hasCry={cryAvailable}
        />
      </ScrollView>

      <PokemonAnimationModal
        animation={selectedAnimation}
        onClose={closeAnimation}
        onPokemonSound={cryAvailable ? playPokemonCry : undefined}
        hasCry={cryAvailable}
      />
    </>
  );
}

const styles = StyleSheet.create({
  hiddenWebView: {
    width: 0,
    height: 0,
    position: 'absolute',
  },
  container: {
    flexGrow: 1,
    backgroundColor: '#fff',
    padding: 20,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#3b4cca',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 20,
    textAlign: 'center',
  },
});
