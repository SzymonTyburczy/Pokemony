import { FlatList, Text, View, StyleSheet, ActivityIndicator, Button, TextInput, Image, Pressable } from 'react-native';
import React, { memo, useState, useCallback, useMemo } from 'react';
import { WebView } from 'react-native-webview';
import { useRouter } from 'expo-router';
import { usePokemonList } from '../../src/features/pokemon/hooks/usePokemonList';
import { usePokemonSearch } from '../../src/features/pokemon/hooks/usePokemonSearch';
import { Pokemon } from '../../src/features/pokemon/model/types';
import { PokemonListItem } from '../../src/features/pokemon/ui/PokemonListItem';
import {
  useFavouritesActionsContext,
  useFavouritesStateContext,
} from '../../src/features/favourites/context/FavouritesContext';
import { preloadRandomPokemon3dForm } from '../../src/features/pokemon/api/pokemon3dApi';
import { getPokemonIdFromUrl } from '../../src/shared/utils/getPokemonIdFromUrl';
import { usePokemonCryPlayer, getCryPlayerHtml } from '../../src/features/pokemon/hooks/usePokemonCryPlayer';
import { useCustomPokemonStateContext } from '../../src/features/customPokemon/context/CustomPokemonContext';
import { CustomPokemon } from '../../src/features/customPokemon/model/types';
import { formatPokemonName } from '../../src/shared/utils/formatPokemonName';
import { customPokemonToFavourite } from '../../src/features/customPokemon/utils/customPokemonFavourites';
import { resolveCustomPokemonImageUri } from '../../src/features/customPokemon/storage/customPokemonImages';

function pokemonKeyExtractor(item: Pokemon) {
  return item.name;
}

const CustomPokemonSection = memo(function CustomPokemonSection({
  pokemons,
  onPress,
  favouriteUrlSet,
  onToggleFavourite,
}: {
  pokemons: CustomPokemon[];
  onPress: (id: string) => void;
  favouriteUrlSet: ReadonlySet<string>;
  onToggleFavourite: (pokemon: Pokemon) => void;
}) {
  if (pokemons.length === 0) return null;
  return (
    <View style={styles.customSection}>
      <Text style={styles.customSectionTitle}>Moje Pokémony ({pokemons.length})</Text>
      {pokemons.map((p) => {
        const favourite = customPokemonToFavourite(p);
        const imageUri = resolveCustomPokemonImageUri(p.imageUri);
        return (
          <Pressable
            key={p.id}
            style={({ pressed }) => [styles.customItem, pressed && { opacity: 0.75 }]}
            onPress={() => onPress(p.id)}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.customItemImage} resizeMode="cover" />
            ) : (
              <View style={[styles.customItemImage, styles.customItemImagePlaceholder]}>
                <Text style={styles.customItemPlaceholderText}>?</Text>
              </View>
            )}
            <View style={styles.customItemInfo}>
              <Text style={styles.customItemName}>{formatPokemonName(p.name)}</Text>
              {p.types.length > 0 && (
                <Text style={styles.customItemTypes}>{p.types.join(' / ')}</Text>
              )}
            </View>
            <Pressable
              style={({ pressed }) => [styles.customHeartButton, pressed && { opacity: 0.6 }]}
              onPress={(e) => {
                e.stopPropagation?.();
                onToggleFavourite(favourite);
              }}
              hitSlop={8}
            >
              <Text style={styles.customHeartIcon}>
                {favouriteUrlSet.has(favourite.url) ? '❤️' : '🤍'}
              </Text>
            </Pressable>
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>własny</Text>
            </View>
          </Pressable>
        );
      })}
      <View style={styles.customSectionDivider} />
    </View>
  );
});

const ListScreen = () => {
  const router = useRouter();
  const { pokemons, isLoading, isLoadingMore, isRefreshing, error, fetchPokemons, handleLoadMore, handleRefresh } =
    usePokemonList();
  const { favouriteUrlSet } = useFavouritesStateContext();
  const { toggleFavourite } = useFavouritesActionsContext();
  const { customPokemons } = useCustomPokemonStateContext();
  const { webViewRef, playPokemonCry } = usePokemonCryPlayer();
  const [searchQuery, setSearchQuery] = useState('');
  const { isSearchActive, results: searchResults, isLoading: isSearchLoading, error: searchError } =
    usePokemonSearch(searchQuery);
  const visiblePokemons = useMemo(
    () => (isSearchActive ? searchResults : pokemons),
    [isSearchActive, pokemons, searchResults]
  );

  const handlePressPokemon = useCallback((item: Pokemon) => {
    const pokemonId = getPokemonIdFromUrl(item.url);

    if (pokemonId) {
      preloadRandomPokemon3dForm(pokemonId).catch((error) => {
        console.warn('Nie udało się przygotować modelu 3D:', error);
      });
    }

    router.push(`/pokemon/${item.name}`);
  }, [router]);

  const handlePlayCry = useCallback((pokemon: Pokemon) => {
    const id = getPokemonIdFromUrl(pokemon.url);
    if (id) playPokemonCry(id);
  }, [playPokemonCry]);

  const handleOpenCustomPokemon = useCallback((id: string) => {
    router.push(`/custom-pokemon/${id}`);
  }, [router]);

  const renderPokemonItem = useCallback(({ item }: { item: Pokemon }) => (
    <PokemonListItem
      item={item}
      onPress={handlePressPokemon}
      isFavourite={favouriteUrlSet.has(item.url)}
      onToggleFavourite={toggleFavourite}
      onPlayCry={handlePlayCry}
    />
  ), [favouriteUrlSet, handlePlayCry, handlePressPokemon, toggleFavourite]);

  const renderFooter = useCallback(() => {
    if (isSearchActive || !isLoadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#3b4cca" />
      </View>
    );
  }, [isLoadingMore, isSearchActive]);

  const renderEmptySearch = useCallback(() => {
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
  }, [isSearchActive, isSearchLoading, searchError]);

  const listHeaderComponent = useMemo(
    () =>
      !isSearchActive ? (
        <CustomPokemonSection
          pokemons={customPokemons}
          onPress={handleOpenCustomPokemon}
          favouriteUrlSet={favouriteUrlSet}
          onToggleFavourite={toggleFavourite}
        />
      ) : null,
    [customPokemons, favouriteUrlSet, handleOpenCustomPokemon, isSearchActive, toggleFavourite]
  );

  const listExtraData = useMemo(
    () => ({
      favouriteUrlSet,
      isSearchActive,
    }),
    [favouriteUrlSet, isSearchActive]
  );

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
        keyExtractor={pokemonKeyExtractor}
        contentContainerStyle={styles.listPadding}
        extraData={listExtraData}
        onEndReached={isSearchActive ? undefined : handleLoadMore}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={listHeaderComponent}
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
  customSection: {
    marginBottom: 4,
  },
  customSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3b4cca',
    marginBottom: 10,
    marginTop: 4,
  },
  customItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f3ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#c7d0f8',
    padding: 10,
    marginBottom: 8,
    gap: 12,
  },
  customItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  customItemImagePlaceholder: {
    backgroundColor: '#dde3fc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customItemPlaceholderText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#3b4cca',
  },
  customItemInfo: {
    flex: 1,
  },
  customItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  customItemTypes: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
    textTransform: 'capitalize',
  },
  customBadge: {
    backgroundColor: '#3b4cca',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  customBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  customHeartButton: {
    padding: 4,
  },
  customHeartIcon: {
    fontSize: 22,
  },
  customSectionDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginBottom: 12,
    marginTop: 4,
  },
});

export default ListScreen;
