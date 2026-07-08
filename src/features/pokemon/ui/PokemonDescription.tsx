import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { fetchPokemonSpecies, translateTextToPolish } from '../api/pokemonApi';

interface PokemonDescriptionProps {
  pokemonName: string;
}

export function PokemonDescription({ pokemonName }: PokemonDescriptionProps) {
  const [description, setDescription] = useState<string | null>(null);
  const [translatedDescription, setTranslatedDescription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    const abortController = new AbortController();

    const loadDescription = async () => {
      setIsLoading(true);
      setDescription(null);
      try {
        const data = await fetchPokemonSpecies(pokemonName, abortController.signal);
        if (isActive) {
          const flavorTextEntry = data.flavor_text_entries.find(
            (entry: any) => entry.language.name === 'en'
          );
          if (flavorTextEntry) {
            // Remove newline/form-feed characters that pokeapi sometimes includes
            const cleanText = flavorTextEntry.flavor_text.replace(/[\n\f\r]/g, ' ');
            setDescription(cleanText);
            
            // Translate to Polish
            const plText = await translateTextToPolish(cleanText, abortController.signal);
            if (isActive) {
              setTranslatedDescription(plText);
            }
          } else {
            setDescription('No description available.');
            setTranslatedDescription('Brak dostępnego opisu.');
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (isActive) {
          setDescription('Failed to load description.');
          setTranslatedDescription('Nie udało się załadować opisu.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    if (pokemonName) {
      loadDescription();
    }

    return () => {
      isActive = false;
      abortController.abort();
    };
  }, [pokemonName]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#3b4cca" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.textEn}>{description}</Text>
      <Text style={styles.textPl}>{translatedDescription}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 60,
  },
  textEn: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  textPl: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
});
