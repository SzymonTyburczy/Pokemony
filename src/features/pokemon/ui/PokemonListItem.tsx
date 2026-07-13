import React, { memo } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Pokemon } from "../model/types";
import { getPokemonImageUrl } from "../../../shared/utils/getPokemonImageUrl";
import { formatPokemonName } from "../../../shared/utils/formatPokemonName";

interface PokemonListItemProps {
  item: Pokemon;
  onPress: (pokemon: Pokemon) => void;
  isFavourite?: boolean;
  onToggleFavourite?: (pokemon: Pokemon) => void;
  onPlayCry?: (pokemon: Pokemon) => void;
}

export const PokemonListItem = memo(function PokemonListItem({
  item,
  onPress,
  isFavourite = false,
  onToggleFavourite,
  onPlayCry,
}: PokemonListItemProps) {
  const imageUrl = getPokemonImageUrl(item.url);

  return (
    <Pressable
      style={({ pressed }) => [styles.itemRow, pressed && styles.itemPressed]}
      onPress={() => onPress(item)}
    >
      <View style={styles.imageWrapper}>
        <Image source={{ uri: imageUrl }} style={styles.pokemonImage} />
      </View>
      <Text style={styles.pokemonName}>{formatPokemonName(item.name)}</Text>
      {onPlayCry && (
        <Pressable
          accessibilityLabel={`Odtworz dzwiek ${formatPokemonName(item.name)}`}
          style={({ pressed }) => [
            styles.cryButton,
            pressed && styles.actionPressed,
          ]}
          onPress={(e) => {
            e.stopPropagation?.();
            onPlayCry(item);
          }}
          hitSlop={8}
        >
          <Text style={styles.cryButtonText}>♪</Text>
        </Pressable>
      )}
      {onToggleFavourite && (
        <Pressable
          style={({ pressed }) => [
            styles.heartButton,
            pressed && styles.actionPressed,
          ]}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleFavourite(item);
          }}
          hitSlop={8}
        >
          <Text style={styles.heartIcon}>{isFavourite ? "❤️" : "🤍"}</Text>
        </Pressable>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  itemRow: {
    backgroundColor: "#f8f9fa",
    padding: 10,
    marginVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e9ecef",
    flexDirection: "row",
    alignItems: "center",
  },
  itemPressed: {
    opacity: 0.75,
  },
  imageWrapper: {
    width: 50,
    height: 50,
    marginRight: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  pokemonName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "500",
    color: "#212529",
  },
  pokemonImage: {
    width: 50,
    height: 50,
    marginRight: 15,
  },
  cryButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#e8edff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  cryButtonText: {
    color: "#3b4cca",
    fontSize: 19,
    fontWeight: "800",
  },
  heartButton: {
    padding: 6,
  },
  actionPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.85 }],
  },
  heartIcon: {
    fontSize: 22,
  },
});
