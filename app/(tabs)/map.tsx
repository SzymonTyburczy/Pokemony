import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import MapView, { LongPressEvent, Marker } from 'react-native-maps';
import { useRouter } from 'expo-router';
import { useFavouritesContext } from '../../src/features/favourites/context/FavouritesContext';
import { useMapPins } from '../../src/features/map/hooks/useMapPins';
import { PendingMapPinLocation, PokemonMapPin } from '../../src/features/map/model/types';
import { Pokemon } from '../../src/features/pokemon/model/types';
import { formatPokemonName } from '../../src/shared/utils/formatPokemonName';
import { getPokemonImageUrl } from '../../src/shared/utils/getPokemonImageUrl';

type SheetMode = 'pin-details' | 'pokemon-picker' | 'empty-favourites';

const INITIAL_REGION = {
  latitude: 52.2297,
  longitude: 21.0122,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

export default function MapScreen() {
  const router = useRouter();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['34%', '62%'], []);
  const { favourites, isLoaded: areFavouritesLoaded } = useFavouritesContext();
  const { pins, isLoaded: arePinsLoaded, addPin, removePin } = useMapPins();
  const [sheetMode, setSheetMode] = useState<SheetMode>('empty-favourites');
  const [pendingLocation, setPendingLocation] = useState<PendingMapPinLocation | null>(null);
  const [selectedPin, setSelectedPin] = useState<PokemonMapPin | null>(null);

  const isLoaded = areFavouritesLoaded && arePinsLoaded;

  const openSheet = useCallback((mode: SheetMode) => {
    setSheetMode(mode);
    requestAnimationFrame(() => {
      bottomSheetRef.current?.snapToIndex(0);
    });
  }, []);

  const handleLongPress = useCallback(
    (event: LongPressEvent) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;

      setPendingLocation({ latitude, longitude });
      setSelectedPin(null);
      openSheet(favourites.length > 0 ? 'pokemon-picker' : 'empty-favourites');
    },
    [favourites.length, openSheet]
  );

  const handleMarkerPress = useCallback(
    (pin: PokemonMapPin) => {
      setSelectedPin(pin);
      setPendingLocation(null);
      openSheet('pin-details');
    },
    [openSheet]
  );

  const handleChoosePokemon = useCallback(
    (pokemon: Pokemon) => {
      if (!pendingLocation) {
        return;
      }

      const pin = addPin(pendingLocation, pokemon);
      setSelectedPin(pin);
      setPendingLocation(null);
      openSheet('pin-details');
    },
    [addPin, openSheet, pendingLocation]
  );

  const handleRemoveSelectedPin = useCallback(() => {
    if (!selectedPin) {
      return;
    }

    removePin(selectedPin.id);
    setSelectedPin(null);
    bottomSheetRef.current?.close();
  }, [removePin, selectedPin]);

  const handleOpenDetails = useCallback(() => {
    if (selectedPin) {
      router.push(`/pokemon/${selectedPin.pokemonName}`);
    }
  }, [router, selectedPin]);

  if (!isLoaded) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3b4cca" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={INITIAL_REGION}
        onLongPress={handleLongPress}
        showsUserLocation={false}
      >
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
            title={formatPokemonName(pin.pokemonName)}
            description="Kliknij, aby zobaczyć szczegóły"
            onPress={() => handleMarkerPress(pin)}
          />
        ))}
      </MapView>

      <View style={styles.header}>
        <Text style={styles.title}>Mapa Pokémonów</Text>
        <Text style={styles.subtitle}>{pins.length} zapisanych pinów</Text>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
      >
        {sheetMode === 'pokemon-picker' && (
          <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Wybierz Pokémona</Text>
            <Text style={styles.sheetText}>Ten Pokémon zostanie przypięty do wybranego miejsca.</Text>

            <View style={styles.pokemonGrid}>
              {favourites.map((pokemon) => (
                <Pressable
                  key={pokemon.name}
                  style={({ pressed }) => [styles.pokemonOption, pressed && styles.pressed]}
                  onPress={() => handleChoosePokemon(pokemon)}
                >
                  <Image source={{ uri: getPokemonImageUrl(pokemon.url) }} style={styles.optionImage} />
                  <Text style={styles.optionName}>{formatPokemonName(pokemon.name)}</Text>
                </Pressable>
              ))}
            </View>
          </BottomSheetScrollView>
        )}

        {sheetMode === 'pin-details' && selectedPin && (
          <BottomSheetView style={styles.sheetContent}>
            <Image source={{ uri: getPokemonImageUrl(selectedPin.pokemonUrl) }} style={styles.detailsImage} />
            <Text style={styles.sheetTitle}>{formatPokemonName(selectedPin.pokemonName)}</Text>
            <Text style={styles.sheetText}>
              Ten Pokémon został przypięty do miejsca: {selectedPin.latitude.toFixed(4)},{' '}
              {selectedPin.longitude.toFixed(4)}.
            </Text>

            <View style={styles.actionsRow}>
              <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={handleOpenDetails}>
                <Text style={styles.primaryButtonText}>Szczegóły</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
                onPress={handleRemoveSelectedPin}
              >
                <Text style={styles.dangerButtonText}>Usuń pin</Text>
              </Pressable>
            </View>
          </BottomSheetView>
        )}

        {sheetMode === 'empty-favourites' && (
          <BottomSheetView style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Brak ulubionych</Text>
            <Text style={styles.sheetText}>Dodaj najpierw Pokémona do ulubionych, a potem przypnij go na mapie.</Text>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
              onPress={() => router.push('/(tabs)/list')}
            >
              <Text style={styles.primaryButtonText}>Przejdź do listy</Text>
            </Pressable>
          </BottomSheetView>
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 52,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 14,
    color: '#6b7280',
  },
  sheetBackground: {
    backgroundColor: '#fff',
  },
  sheetIndicator: {
    backgroundColor: '#9ca3af',
  },
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  sheetText: {
    fontSize: 15,
    lineHeight: 21,
    color: '#4b5563',
    marginBottom: 18,
  },
  pokemonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pokemonOption: {
    width: '47%',
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
  },
  optionImage: {
    width: 58,
    height: 58,
    marginBottom: 8,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
  },
  detailsImage: {
    width: 110,
    height: 110,
    alignSelf: 'center',
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b4cca',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  dangerButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  dangerButtonText: {
    color: '#dc2626',
    fontSize: 15,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
});
