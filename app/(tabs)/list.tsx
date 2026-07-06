import { FlatList, Text, View, StyleSheet, ActivityIndicator, Button, ViewToken } from 'react-native';
import React, { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { usePokemonList } from '../../src/features/pokemon/hooks/usePokemonList';
import { Pokemon } from '../../src/features/pokemon/model/types';
import { PokemonListItem } from '../../src/features/pokemon/ui/PokemonListItem';
import { useFavouritesContext } from '../../src/features/favourites/context/FavouritesContext';

const ListScreen = () => {
  const router = useRouter();
  const { pokemons, isLoading, isLoadingMore, isRefreshing, error, fetchPokemons, handleLoadMore, handleRefresh } =
    usePokemonList();
  const { isFavourite, toggleFavourite } = useFavouritesContext();
  const [visiblePokemonNames, setVisiblePokemonNames] = useState<Set<string>>(new Set());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    setVisiblePokemonNames(
      new Set(
        viewableItems
          .map((viewableItem) => viewableItem.item as Pokemon)
          .map((pokemon) => pokemon.name)
      )
    );
  }).current;

  const renderPokemonItem = ({ item }: { item: Pokemon }) => {
    const isImageVisible = visiblePokemonNames.has(item.name);

    return (
      <PokemonListItem
        item={item}
        isImageVisible={isImageVisible}
        onPress={() => router.push(`/pokemon/${item.name}`)}
        isFavourite={isFavourite(item.name)}
        onToggleFavourite={toggleFavourite}
      />
    );
  };

  const renderFooter = () => {
    if (!isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3b4cca" />
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b4cca" />
      </View>
    );
  }

  if (error && pokemons.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>⚠️ Coś poszło nie tak!</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <Button title="Spróbuj ponownie" onPress={() => fetchPokemons(true)} color="#3b4cca" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Lista Pokémonów</Text>

      <FlatList
        data={pokemons}
        renderItem={renderPokemonItem}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listPadding}
        getItemLayout={(data, index) => ({ length: 82, offset: 82 * index, index })}
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged}
        extraData={[visiblePokemonNames, isFavourite]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        refreshing={isRefreshing}
        onRefresh={handleRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 50,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    color: '#3b4cca',
  },
  listPadding: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 10,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 20,
  },
  footerLoader: {
    paddingVertical: 20,
  },
});

export default ListScreen;