import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePokemonDetails } from '../../src/features/pokemon/hooks/usePokemonDetails';
import { PokemonDetailsCard } from '../../src/features/pokemon/ui/PokemonDetailsCard';
import { usePokemonShowcase } from '../../src/features/pokemon/hooks/usePokemonShowcase';
import { PokemonAnimationModal } from '../../src/features/pokemon/ui/PokemonAnimationModal';

export default function PokemonDetailsScreen() {
  const router = useRouter();
  const { name } = useLocalSearchParams<{ name: string | string[] }>();
  const pokemonName = Array.isArray(name) ? name[0] : name;

  const { pokemon, isLoading, error } = usePokemonDetails(pokemonName);
  const { selectedAnimation, playPokemonCry, showPokemonById, closeAnimation } = usePokemonShowcase();

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

  return (
    <>
      <ScrollView contentContainerStyle={styles.container}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Wróć</Text>
        </Pressable>

        <PokemonDetailsCard
          pokemon={pokemon}
          onImagePress={() => showPokemonById(pokemon.id, pokemon.name)}
          onSoundPress={() => playPokemonCry(pokemon.id)}
        />
      </ScrollView>

      <PokemonAnimationModal
        animation={selectedAnimation}
        onClose={closeAnimation}
        onPokemonSound={playPokemonCry}
      />
    </>
  );
}

const styles = StyleSheet.create({
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
