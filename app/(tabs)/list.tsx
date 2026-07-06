import { FlatList, Text, View, StyleSheet, ActivityIndicator, Button, ViewToken, TextInput } from 'react-native';
import React, { useRef, useState } from 'react';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { usePokemonList } from '../../src/features/pokemon/hooks/usePokemonList';
import { usePokemonSearch } from '../../src/features/pokemon/hooks/usePokemonSearch';
import { Pokemon } from '../../src/features/pokemon/model/types';
import { PokemonListItem } from '../../src/features/pokemon/ui/PokemonListItem';
import { useFavouritesContext } from '../../src/features/favourites/context/FavouritesContext';
import { preloadRandomPokemon3dForm } from '../../src/features/pokemon/api/pokemon3dApi';
import { getPokemonIdFromUrl } from '../../src/shared/utils/getPokemonIdFromUrl';
import { usePokemonCryPlayer, getCryPlayerHtml } from '../../src/features/pokemon/hooks/usePokemonCryPlayer';

const ListScreen = () => {
  const router = useRouter();
  const { pokemons, isLoading, isLoadingMore, isRefreshing, error, fetchPokemons, handleLoadMore, handleRefresh } =
    usePokemonList();
  const { isFavourite, toggleFavourite } = useFavouritesContext();
  const { webViewRef, playPokemonCry } = usePokemonCryPlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const { isSearchActive, results: searchResults, isLoading: isSearchLoading, error: searchError } =
    usePokemonSearch(searchQuery);
  const [visiblePokemonNames, setVisiblePokemonNames] = useState<Set<string>>(new Set());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 });
  const visiblePokemons = isSearchActive ? searchResults : pokemons;

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
        onPress={() => {
          const pokemonId = getPokemonIdFromUrl(item.url);
          if (pokemonId) {
            preloadRandomPokemon3dForm(pokemonId).catch((error) => {
              console.warn('Nie udało się przygotować modelu 3D:', error);
            });
          }

          router.push(`/pokemon/${item.name}`);
        }}
        isFavourite={isFavourite(item.name)}
        onToggleFavourite={toggleFavourite}
        onPlayCry={(pokemon) => {
          const pokemonId = getPokemonIdFromUrl(pokemon.url);
          if (pokemonId) {
            playPokemonCry(pokemonId);
          }
        }}
      />
    );
  };

  const renderFooter = () => {
    if (isSearchActive || !isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3b4cca" />
      </View>
    );
  };

  const renderEmptySearch = () => {
    if (!isSearchActive) return null;

    if (isSearchLoading) {
      return (
        <View style={styles.searchState}>
          <ActivityIndicator size="small" color="#3b4cca" />
          <Text style={styles.searchStateText}>Szukam Pokémona...</Text>
        </View>
      );
    }

    return (
      <View style={styles.searchState}>
        <Text style={styles.searchStateText}>
          {searchError ?? 'Nie znaleziono Pokémona o takiej nazwie.'}
        </Text>
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
      {/* Hidden WebView for OGG audio playback */}
      <WebView
        ref={webViewRef}
        source={{ html: getCryPlayerHtml() }}
        style={styles.hiddenWebView}
        javaScriptEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
      />

      <Text style={styles.title}>Lista Pokémonów</Text>

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Szukaj Pokémona po nazwie"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={styles.searchInput}
      />

      <FlatList
        data={visiblePokemons}
        renderItem={renderPokemonItem}
        keyExtractor={(item) => item.name}
        contentContainerStyle={styles.listPadding}
        getItemLayout={(data, index) => ({ length: 82, offset: 82 * index, index })}
        viewabilityConfig={viewabilityConfig.current}
        onViewableItemsChanged={onViewableItemsChanged}
        extraData={[visiblePokemonNames, isFavourite, isSearchActive]}
        onEndReached={isSearchActive ? undefined : handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmptySearch}
        refreshing={isSearchActive ? false : isRefreshing}
        onRefresh={isSearchActive ? undefined : handleRefresh}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenWebView: {
    width: 0,
    height: 0,
    position: 'absolute',
  },
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
  searchInput: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#111827',
    backgroundColor: '#f8f9fa',
    fontSize: 16,
  },
  listPadding: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  searchState: {
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
  },
  searchStateText: {
    color: '#6b7280',
    fontSize: 15,
    textAlign: 'center',
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
