import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCustomPokemonContext } from '../../src/features/customPokemon/context/CustomPokemonContext';
import { formatPokemonName } from '../../src/shared/utils/formatPokemonName';

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

export default function CustomPokemonDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { customPokemons } = useCustomPokemonContext();

  const pokemon = customPokemons.find((p) => p.id === id);

  if (!pokemon) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Nie znaleziono Pokémona</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Wróć</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
    >
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <Text style={styles.backBtnText}>Wróć</Text>
      </Pressable>

      {/* Obrazek */}
      {pokemon.imageUri ? (
        <Image source={{ uri: pokemon.imageUri }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imagePlaceholderText}>?</Text>
        </View>
      )}

      {/* Nazwa i badge */}
      <Text style={styles.name}>{formatPokemonName(pokemon.name)}</Text>
      <View style={styles.ownBadge}>
        <Text style={styles.ownBadgeText}>Własny Pokémon</Text>
      </View>

      {/* Typy */}
      {pokemon.types.length > 0 && (
        <View style={styles.typesRow}>
          {pokemon.types.map((type) => (
            <View key={type} style={[styles.typeChip, { backgroundColor: TYPE_COLORS[type] ?? '#6b7280' }]}>
              <Text style={styles.typeChipText}>{type}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Opis */}
      {pokemon.description ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Opis</Text>
          <Text style={styles.description}>{pokemon.description}</Text>
        </View>
      ) : null}

      {/* Informacje */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Informacje</Text>
        <Text style={styles.infoText}>
          Wzrost: {pokemon.height > 0 ? `${pokemon.height} m` : '—'}
        </Text>
        <Text style={styles.infoText}>
          Waga: {pokemon.weight > 0 ? `${pokemon.weight} kg` : '—'}
        </Text>
      </View>

      {/* Statystyki */}
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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#3b4cca',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 24,
  },
  backBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
  },
  imagePlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 20,
    alignSelf: 'center',
    backgroundColor: '#e9ecef',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  imagePlaceholderText: {
    fontSize: 64,
    color: '#9ca3af',
    fontWeight: '800',
  },
  name: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1f2937',
    textAlign: 'center',
  },
  ownBadge: {
    alignSelf: 'center',
    backgroundColor: '#3b4cca',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 6,
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
    gap: 8,
    marginBottom: 20,
  },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
  },
  typeChipText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
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
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 16,
    textAlign: 'center',
  },
});
