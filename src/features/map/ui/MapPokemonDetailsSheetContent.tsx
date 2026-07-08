import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { PokemonMapPin } from '../model/types';
import { formatPokemonName } from '../../../shared/utils/formatPokemonName';
import { usePokemonDetails } from '../../pokemon/hooks/usePokemonDetails';
import { PokemonDetailsCard } from '../../pokemon/ui/PokemonDetailsCard';
import { usePokemonShowcase } from '../../pokemon/hooks/usePokemonShowcase';
import { PokemonAnimationModal } from '../../pokemon/ui/PokemonAnimationModal';
import { getCryPlayerHtml } from '../../pokemon/hooks/usePokemonCryPlayer';
import { usePokemonCryExists } from '../../pokemon/hooks/usePokemonCryExists';

interface MapPokemonDetailsSheetContentProps {
  pin: PokemonMapPin | null;
}

export function MapPokemonDetailsSheetContent({ pin }: MapPokemonDetailsSheetContentProps) {
  const { pokemon, isLoading, error } = usePokemonDetails(pin?.pokemonName);
  const { selectedAnimation, playPokemonCry, webViewRef, showPokemonById, closeAnimation } = usePokemonShowcase();
  const hasCry = usePokemonCryExists(pokemon?.id);
  const cryAvailable = hasCry !== false;

  return (
    <>
      <WebView
        ref={webViewRef}
        source={{ html: getCryPlayerHtml() }}
        style={styles.hiddenWebView}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
      />

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3b4cca" />
          <Text style={styles.loadingText}>Laduje szczegoly Pokemona...</Text>
        </View>
      ) : error || !pokemon || !pin ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Nie udalo sie otworzyc szczegolow</Text>
          <Text style={styles.errorText}>{error || 'Brak danych Pokemona.'}</Text>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Pin na mapie</Text>
            <Text style={styles.title}>{formatPokemonName(pin.pokemonName)}</Text>
            <Text style={styles.coordinates}>
              {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
            </Text>
          </View>

          <PokemonDetailsCard
            pokemon={pokemon}
            onImagePress={() => showPokemonById(pokemon.id, pokemon.name)}
            onSoundPress={cryAvailable ? () => playPokemonCry(pokemon.id) : undefined}
            hasCry={cryAvailable}
          />
        </>
      )}

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
  center: {
    paddingHorizontal: 8,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 15,
  },
  errorTitle: {
    color: '#b91c1c',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorText: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  header: {
    marginBottom: 16,
  },
  eyebrow: {
    color: '#3b4cca',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  coordinates: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 4,
  },
});
