import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { PokemonDetails } from '../model/types';
import { formatPokemonName } from '../../../shared/utils/formatPokemonName';

interface PokemonDetailsCardProps {
  pokemon: PokemonDetails;
  onImagePress?: () => void;
  onSoundPress?: () => void;
}

export function PokemonDetailsCard({ pokemon, onImagePress, onSoundPress }: PokemonDetailsCardProps) {
  const imageUrl =
    pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default || null;

  return (
    <>
      {imageUrl ? (
        <Pressable
          style={({ pressed }) => [styles.imageButton, pressed && styles.imagePressed]}
          onPress={onImagePress}
          disabled={!onImagePress}
        >
          <Image source={{ uri: imageUrl }} style={styles.image} />
        </Pressable>
      ) : null}

      <Text style={styles.name}>{formatPokemonName(pokemon.name)}</Text>
      <Text style={styles.subtitle}>#{pokemon.id}</Text>

      {onSoundPress ? (
        <Pressable style={({ pressed }) => [styles.soundButton, pressed && styles.soundPressed]} onPress={onSoundPress}>
          <Text style={styles.soundButtonText}>♪ Odtworz dzwiek</Text>
        </Pressable>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Informacje</Text>
        <Text style={styles.infoText}>Wzrost: {pokemon.height / 10} m</Text>
        <Text style={styles.infoText}>Waga: {pokemon.weight / 10} kg</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Typy</Text>
        <View style={styles.tagsRow}>
          {pokemon.types.map((typeEntry) => (
            <View key={typeEntry.type.name} style={styles.tag}>
              <Text style={styles.tagText}>{typeEntry.type.name}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Statystyki</Text>
        {pokemon.stats.map((statEntry) => (
          <View key={statEntry.stat.name} style={styles.statRow}>
            <Text style={styles.statName}>{statEntry.stat.name}</Text>
            <Text style={styles.statValue}>{statEntry.base_stat}</Text>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  imageButton: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  imagePressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  image: {
    width: 220,
    height: 220,
  },
  name: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: 12,
  },
  soundButton: {
    alignSelf: 'center',
    backgroundColor: '#3b4cca',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 18,
    marginBottom: 20,
  },
  soundPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },
  soundButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#3b4cca',
  },
  infoText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#3b4cca',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    color: '#fff',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statName: {
    color: '#111827',
    textTransform: 'capitalize',
  },
  statValue: {
    fontWeight: '700',
    color: '#111827',
  },
});
