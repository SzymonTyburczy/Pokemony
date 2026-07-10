import React from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { PokemonMapPin } from '../model/types';
import { formatPokemonName } from '../../../shared/utils/formatPokemonName';
import { usePokemonDetails } from '../../pokemon/hooks/usePokemonDetails';
import { PokemonDetailsCard } from '../../pokemon/ui/PokemonDetailsCard';
import { usePokemonShowcase } from '../../pokemon/hooks/usePokemonShowcase';
import { PokemonAnimationModal } from '../../pokemon/ui/PokemonAnimationModal';
import { getCryPlayerHtml } from '../../pokemon/hooks/usePokemonCryPlayer';
import { usePokemonCryExists } from '../../pokemon/hooks/usePokemonCryExists';
import { useCustomPokemonStateContext } from '../../customPokemon/context/CustomPokemonContext';
import {
  getCustomPokemonByUrl,
  getPokemonUrlImage,
  isCustomPokemonUrl,
} from '../../customPokemon/utils/customPokemonFavourites';

const TYPE_COLORS: Record<string, string> = {
  normal: '#a8a878', fire: '#f08030', water: '#6890f0', electric: '#f8d030',
  grass: '#78c850', ice: '#98d8d8', fighting: '#c03028', poison: '#a040a0',
  ground: '#e0c068', flying: '#a890f0', psychic: '#f85888', bug: '#a8b820',
  rock: '#b8a038', ghost: '#705898', dragon: '#7038f8', dark: '#705848',
  steel: '#b8b8d0', fairy: '#ee99ac',
};

const STAT_LABELS: Record<string, string> = {
  hp: 'HP',
  attack: 'Atak',
  defense: 'Obrona',
  'special-attack': 'Sp. Atak',
  'special-defense': 'Sp. Obr.',
  speed: 'Szybkość',
};

interface MapPokemonDetailsSheetContentProps {
  pin: PokemonMapPin | null;
}

function CustomPokemonMapDetails({ pin, imageUrl }: { pin: PokemonMapPin; imageUrl: string }) {
  const { customPokemons } = useCustomPokemonStateContext();
  const pokemon = getCustomPokemonByUrl(pin.pokemonUrl, customPokemons);

  if (!pokemon) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Nie znaleziono własnego Pokémona</Text>
        <Text style={styles.errorText}>Ten pin odnosi się do Pokémona, który został usunięty.</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Pin na mapie</Text>
        <Text style={styles.title}>{formatPokemonName(pin.pokemonName)}</Text>
        <Text style={styles.coordinates}>
          {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
        </Text>
      </View>

      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.customImage} resizeMode="cover" />
      ) : (
        <View style={styles.customImagePlaceholder}>
          <Text style={styles.customImagePlaceholderText}>?</Text>
        </View>
      )}

      <View style={styles.ownBadge}>
        <Text style={styles.ownBadgeText}>Własny Pokémon</Text>
      </View>

      {pokemon.types.length > 0 && (
        <View style={styles.typesRow}>
          {pokemon.types.map((type) => (
            <View key={type} style={[styles.typeChip, { backgroundColor: TYPE_COLORS[type] ?? '#6b7280' }]}>
              <Text style={styles.typeChipText}>{type}</Text>
            </View>
          ))}
        </View>
      )}

      {pokemon.description ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Opis</Text>
          <Text style={styles.description}>{pokemon.description}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informacje</Text>
        <Text style={styles.infoText}>
          Wzrost: {pokemon.height > 0 ? `${pokemon.height} m` : '—'}
        </Text>
        <Text style={styles.infoText}>
          Waga: {pokemon.weight > 0 ? `${pokemon.weight} kg` : '—'}
        </Text>
      </View>

      {pokemon.stats.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Statystyki</Text>
          {pokemon.stats.map((stat) => (
            <View key={stat.name} style={styles.statRow}>
              <Text style={styles.statLabel}>{STAT_LABELS[stat.name] ?? stat.name}</Text>
              <View style={styles.statBarWrap}>
                <View style={[styles.statBar, { width: `${(stat.value / 255) * 100}%` }]} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
            </View>
          ))}
        </View>
      )}
    </>
  );
}

export function MapPokemonDetailsSheetContent({ pin }: MapPokemonDetailsSheetContentProps) {
  const { customPokemons } = useCustomPokemonStateContext();
  const isCustom = pin ? isCustomPokemonUrl(pin.pokemonUrl) : false;
  const customImageUrl = pin ? getPokemonUrlImage(pin.pokemonUrl, customPokemons) : '';

  const { pokemon, isLoading, error } = usePokemonDetails(isCustom ? undefined : pin?.pokemonName);
  const { selectedAnimation, playPokemonCry, webViewRef, showPokemonById, closeAnimation } = usePokemonShowcase();
  const hasCry = usePokemonCryExists(pokemon?.id);
  const cryAvailable = hasCry !== false;

  if (!pin) {
    return null;
  }

  if (isCustom) {
    return <CustomPokemonMapDetails pin={pin} imageUrl={customImageUrl} />;
  }

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
      ) : error || !pokemon ? (
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
  customImage: {
    width: 180,
    height: 180,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 12,
  },
  customImagePlaceholder: {
    width: 180,
    height: 180,
    borderRadius: 20,
    alignSelf: 'center',
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  customImagePlaceholderText: {
    fontSize: 56,
    color: '#9ca3af',
    fontWeight: '800',
  },
  ownBadge: {
    alignSelf: 'center',
    backgroundColor: '#3b4cca',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  ownBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  typesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  typeChipText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3b4cca',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  infoText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 6,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  statLabel: {
    width: 80,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  statBarWrap: {
    flex: 1,
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statBar: {
    height: '100%',
    backgroundColor: '#3b4cca',
    borderRadius: 4,
  },
  statValue: {
    width: 36,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
});
