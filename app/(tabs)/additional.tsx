import React, { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useFavouritesContext } from '../../src/features/favourites/context/FavouritesContext';
import { Pokemon } from '../../src/features/pokemon/model/types';
import { formatPokemonName } from '../../src/shared/utils/formatPokemonName';
import { getPokemonImageUrl } from '../../src/shared/utils/getPokemonImageUrl';

function FavouriteRow({
  pokemon,
  onPress,
  onRemove,
}: {
  pokemon: Pokemon;
  onPress: () => void;
  onRemove: () => void;
}) {
  const shouldIgnoreNextPressRef = useRef(false);
  const [rowWidth, setRowWidth] = useState(0);
  const imageUrl = useMemo(() => getPokemonImageUrl(pokemon.url), [pokemon.url]);
  const deleteThreshold = rowWidth > 0 ? rowWidth * 0.55 : 140;

  return (
    <Swipeable
      renderRightActions={() => (
        <View style={[styles.deleteActionContainer, rowWidth > 0 && { width: rowWidth }]}>
          <View style={styles.deleteAction}>
            <Text style={styles.deleteActionText}>Usun</Text>
          </View>
        </View>
      )}
      onSwipeableOpenStartDrag={() => {
        shouldIgnoreNextPressRef.current = true;
      }}
      onSwipeableCloseStartDrag={() => {
        shouldIgnoreNextPressRef.current = true;
      }}
      onSwipeableOpen={(direction) => {
        if (direction === 'left') {
          onRemove();
        }
      }}
      onSwipeableClose={() => {
        requestAnimationFrame(() => {
          shouldIgnoreNextPressRef.current = false;
        });
      }}
      friction={1.2}
      overshootRight={false}
      overshootFriction={10}
      rightThreshold={deleteThreshold}
      dragOffsetFromRightEdge={20}
      animationOptions={{
        damping: 42,
        stiffness: 220,
        mass: 0.95,
      }}
    >
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onLayout={(event) => {
          const nextWidth = event.nativeEvent.layout.width;
          if (nextWidth !== rowWidth) {
            setRowWidth(nextWidth);
          }
        }}
        onPress={() => {
          if (shouldIgnoreNextPressRef.current) {
            shouldIgnoreNextPressRef.current = false;
            return;
          }
          onPress();
        }}
      >
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="contain" />
        <View style={styles.rowText}>
          <Text style={styles.name}>{formatPokemonName(pokemon.name)}</Text>
          <Text style={styles.hint}>Mocne pociagniecie albo przeciagniecie do konca usuwa z ulubionych</Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

export default function AdditionalScreen() {
  const router = useRouter();
  const { favourites, isLoaded, removeFavourite } = useFavouritesContext();

  if (!isLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b4cca" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ulubione</Text>
      <Text style={styles.subtitle}>Przewijaj w dol, a swipe w lewo usuwa Pokemona z ulubionych.</Text>

      <FlatList
        data={favourites}
        keyExtractor={(item) => item.name}
        contentContainerStyle={[styles.listContent, favourites.length === 0 && styles.emptyListContent]}
        renderItem={({ item }) => (
          <FavouriteRow
            pokemon={item}
            onPress={() => router.push(`/pokemon/${item.name}`)}
            onRemove={() => removeFavourite(item.name)}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Brak ulubionych</Text>
            <Text style={styles.emptyText}>Dodaj Pokemony w zakladce Lista i wroc tutaj.</Text>
            <Pressable style={styles.goToListButton} onPress={() => router.push('/(tabs)/list')}>
              <Text style={styles.goToListText}>Przejdz do listy</Text>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 56,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3b4cca',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 24,
    marginTop: 8,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  row: {
    backgroundColor: '#fbfbfc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 3,
  },
  rowPressed: {
    opacity: 0.82,
  },
  image: {
    width: 60,
    height: 60,
    marginRight: 14,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1f2937',
  },
  hint: {
    marginTop: 5,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  deleteAction: {
    flex: 1,
    marginVertical: 2,
    borderRadius: 20,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  deleteActionContainer: {
    flex: 1,
  },
  deleteActionText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  separator: {
    height: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 18,
  },
  goToListButton: {
    backgroundColor: '#3b4cca',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  goToListText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
