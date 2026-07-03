import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Pokemon } from '../model/types';
import { getPokemonImageUrl } from '../../../shared/utils/getPokemonImageUrl';
import { formatPokemonName } from '../../../shared/utils/formatPokemonName';

interface PokemonListItemProps {
  item: Pokemon;
  isImageVisible: boolean;
  onPress: () => void;
}

export function PokemonListItem({ item, isImageVisible, onPress }: PokemonListItemProps) {
  const imageUrl = getPokemonImageUrl(item.url);

  return (
    <Pressable style={({ pressed }) => [styles.itemRow, pressed && styles.itemPressed]} onPress={onPress}>
      <View style={styles.imageWrapper}>
        {isImageVisible ? (
          <Image source={{ uri: imageUrl }} style={styles.pokemonImage} />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}
      </View>
      <Text style={styles.pokemonName}>{formatPokemonName(item.name)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  itemRow: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    marginVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemPressed: {
    opacity: 0.75,
  },
  imageWrapper: {
    width: 50,
    height: 50,
    marginRight: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e9ecef',
  },
  pokemonName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#212529',
  },
  pokemonImage: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
});