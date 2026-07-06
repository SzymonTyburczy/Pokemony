import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Pokemon } from '../model/types';
import { getPokemonImageUrl } from '../../../shared/utils/getPokemonImageUrl';
import { formatPokemonName } from '../../../shared/utils/formatPokemonName';

interface PokemonListItemProps {
  item: Pokemon;
  isImageVisible: boolean;
  onPress: () => void;
  isFavourite?: boolean;
  onToggleFavourite?: (pokemon: Pokemon) => void;
}

export function PokemonListItem({
  item,
  isImageVisible,
  onPress,
  isFavourite = false,
  onToggleFavourite,
}: PokemonListItemProps) {
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
      {onToggleFavourite && (
        <Pressable
          style={({ pressed }) => [styles.heartButton, pressed && styles.heartPressed]}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleFavourite(item);
          }}
          hitSlop={8}
        >
          <Text style={styles.heartIcon}>{isFavourite ? '❤️' : '🤍'}</Text>
        </Pressable>
      )}
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
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: '#212529',
  },
  pokemonImage: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  heartButton: {
    padding: 6,
  },
  heartPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.85 }],
  },
  heartIcon: {
    fontSize: 22,
  },
});