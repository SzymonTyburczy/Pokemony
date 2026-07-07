import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import MapView, { LongPressEvent, MapPressEvent, Marker, Region } from 'react-native-maps';
import { useFavouritesContext } from '../../src/features/favourites/context/FavouritesContext';
import { useMapPins } from '../../src/features/map/hooks/useMapPins';
import { PendingMapPinLocation, PokemonMapPin } from '../../src/features/map/model/types';
import { Pokemon } from '../../src/features/pokemon/model/types';
import { formatPokemonName } from '../../src/shared/utils/formatPokemonName';
import { getPokemonImageUrl } from '../../src/shared/utils/getPokemonImageUrl';

type SheetMode = 'pin-details' | 'pokemon-picker' | 'empty-favourites' | 'pin-list';

const INITIAL_REGION: Region = {
  latitude: 52.2297,
  longitude: 21.0122,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const MIN_DELTA = 0.002;
const MAX_DELTA = 80;
const PIN_FOCUS_DELTA = 0.02;
const USER_LOCATION_DELTA = 0.02;

function clampDelta(delta: number): number {
  return Math.min(MAX_DELTA, Math.max(MIN_DELTA, delta));
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { favourites, isLoaded: areFavouritesLoaded } = useFavouritesContext();
  const {
    pins,
    isLoaded: arePinsLoaded,
    addPin,
    removePin,
    updatePinPokemon,
    updatePinLocation,
  } = useMapPins();
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [sheetMode, setSheetMode] = useState<SheetMode>('empty-favourites');
  const [pendingLocation, setPendingLocation] = useState<PendingMapPinLocation | null>(null);
  const [selectedPin, setSelectedPin] = useState<PokemonMapPin | null>(null);
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [movingPinId, setMovingPinId] = useState<string | null>(null);
  const [selectedPokemonFilter, setSelectedPokemonFilter] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isUserLocationVisible, setIsUserLocationVisible] = useState(false);

  const snapPoints = useMemo(
    () => {
      if (sheetMode === 'pokemon-picker') {
        if (favourites.length >= 3) {
          return [Math.round(SCREEN_HEIGHT * 0.45), Math.round(SCREEN_HEIGHT * 0.90)];
        }
        return [Math.round(SCREEN_HEIGHT * 0.35), Math.round(SCREEN_HEIGHT * 0.50), Math.round(SCREEN_HEIGHT * 0.90)];
      }

      if (sheetMode === 'pin-details') {
        return [Math.round(SCREEN_HEIGHT * 0.45)];
      }

      return [Math.round(SCREEN_HEIGHT * 0.3)];
    },
    [sheetMode, favourites.length]
  );

  const isLoaded = areFavouritesLoaded && arePinsLoaded;

  const pokemonFilterOptions = useMemo(
    () => Array.from(new Set(pins.map((pin) => pin.pokemonName))).sort(),
    [pins]
  );

  const listedPins = useMemo(
    () => (selectedPokemonFilter ? pins.filter((pin) => pin.pokemonName === selectedPokemonFilter) : pins),
    [pins, selectedPokemonFilter]
  );

  useEffect(() => {
    if (selectedPokemonFilter && !pokemonFilterOptions.includes(selectedPokemonFilter)) {
      setSelectedPokemonFilter(null);
    }
  }, [pokemonFilterOptions, selectedPokemonFilter]);

  const animateToRegion = useCallback((nextRegion: Region) => {
    setRegion(nextRegion);
    mapRef.current?.animateToRegion(nextRegion, 250);
  }, []);

  const getPinFocusRegion = useCallback(
    (pin: PokemonMapPin): Region => ({
      latitude: pin.latitude,
      longitude: pin.longitude,
      latitudeDelta: Math.min(region.latitudeDelta, PIN_FOCUS_DELTA),
      longitudeDelta: Math.min(region.longitudeDelta, PIN_FOCUS_DELTA),
    }),
    [region.latitudeDelta, region.longitudeDelta]
  );

  const openSheet = useCallback((mode: SheetMode) => {
    setSheetMode(mode);
    requestAnimationFrame(() => {
      bottomSheetRef.current?.snapToIndex(0);
    });
  }, []);

  const handleZoom = useCallback(
    (direction: 'in' | 'out') => {
      const factor = direction === 'in' ? 0.5 : 2;
      animateToRegion({
        ...region,
        latitudeDelta: clampDelta(region.latitudeDelta * factor),
        longitudeDelta: clampDelta(region.longitudeDelta * factor),
      });
    },
    [animateToRegion, region]
  );

  const handleCenterOnUser = useCallback(async () => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Brak dostępu do lokalizacji', 'Nadaj uprawnienie, aby wycentrować mapę na swoim położeniu.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextRegion: Region = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: Math.min(region.latitudeDelta, USER_LOCATION_DELTA),
        longitudeDelta: Math.min(region.longitudeDelta, USER_LOCATION_DELTA),
      };

      setIsUserLocationVisible(true);
      animateToRegion(nextRegion);
    } catch (error) {
      console.error('Nie udało się pobrać aktualnej lokalizacji:', error);
      Alert.alert('Nie udało się pobrać lokalizacji', 'Sprawdź ustawienia lokalizacji i spróbuj ponownie.');
    } finally {
      setIsLocating(false);
    }
  }, [animateToRegion, region.latitudeDelta, region.longitudeDelta]);

  const handleLongPress = useCallback(
    (event: LongPressEvent) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      const location = { latitude, longitude };

      if (movingPinId) {
        const pinToMove = pins.find((pin) => pin.id === movingPinId);

        updatePinLocation(movingPinId, location);
        setMovingPinId(null);
        setPendingLocation(null);

        if (pinToMove) {
          setSelectedPin({ ...pinToMove, ...location });
          openSheet('pin-details');
        }

        return;
      }

      setEditingPinId(null);
      setPendingLocation(location);
      setSelectedPin(null);
      openSheet(favourites.length > 0 ? 'pokemon-picker' : 'empty-favourites');
    },
    [favourites.length, movingPinId, openSheet, pins, updatePinLocation]
  );

  const handleOpenPinList = useCallback(
    (pokemonName: string | null) => {
      setSelectedPokemonFilter(pokemonName);
      setSelectedPin(null);
      setPendingLocation(null);
      setEditingPinId(null);
      setMovingPinId(null);
      openSheet('pin-list');
    },
    [openSheet]
  );

  const handleSelectListedPin = useCallback(
    (pin: PokemonMapPin) => {
      animateToRegion(getPinFocusRegion(pin));
      setSelectedPin(pin);
      setPendingLocation(null);
      setEditingPinId(null);
      setMovingPinId(null);
      openSheet('pin-details');
    },
    [animateToRegion, getPinFocusRegion, openSheet]
  );

  const handleMarkerPress = useCallback(
    (pin: PokemonMapPin) => {
      handleSelectListedPin(pin);
    },
    [handleSelectListedPin]
  );

  const handleChoosePokemon = useCallback(
    (pokemon: Pokemon) => {
      if (editingPinId) {
        const pinToEdit = pins.find((pin) => pin.id === editingPinId);

        updatePinPokemon(editingPinId, pokemon);
        setEditingPinId(null);

        if (pinToEdit) {
          setSelectedPin({
            ...pinToEdit,
            pokemonName: pokemon.name,
            pokemonUrl: pokemon.url,
          });
          openSheet('pin-details');
        }

        return;
      }

      if (!pendingLocation) {
        return;
      }

      const pin = addPin(pendingLocation, pokemon);
      setSelectedPin(pin);
      setPendingLocation(null);
      openSheet('pin-details');
    },
    [addPin, editingPinId, openSheet, pendingLocation, pins, updatePinPokemon]
  );

  const handleEditSelectedPokemon = useCallback(() => {
    if (!selectedPin) {
      return;
    }

    setEditingPinId(selectedPin.id);
    setPendingLocation(null);
    openSheet(favourites.length > 0 ? 'pokemon-picker' : 'empty-favourites');
  }, [favourites.length, openSheet, selectedPin]);

  const handleMoveSelectedPin = useCallback(() => {
    if (!selectedPin) {
      return;
    }

    setMovingPinId(selectedPin.id);
    setPendingLocation(null);
    bottomSheetRef.current?.close();
  }, [selectedPin]);

  const handleCancelMove = useCallback(() => {
    setMovingPinId(null);
  }, []);

  // Zamknięcie bottom sheeta po kliknięciu na mapę (pin pozostaje zapisany)
  const handleMapPress = useCallback(
    (_event: MapPressEvent) => {
      if (selectedPin) {
        setSelectedPin(null);
        bottomSheetRef.current?.close();
      }
    },
    [selectedPin]
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
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        onPress={handleMapPress}
        onLongPress={handleLongPress}
        onRegionChangeComplete={setRegion}
        showsUserLocation={isUserLocationVisible}
      >
        {pins.map((pin) => {
          const isSelected = selectedPin?.id === pin.id;

          return (
            <Marker
              key={pin.id}
              coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
              title={formatPokemonName(pin.pokemonName)}
              description="Kliknij, aby zobaczyć szczegóły"
              onPress={() => handleMarkerPress(pin)}
            >
              <View style={styles.markerContainer}>
                <View style={[styles.markerBubble, isSelected && styles.markerBubbleSelected]}>
                  <Image source={{ uri: getPokemonImageUrl(pin.pokemonUrl) }} style={styles.markerImage} />
                </View>
                <View style={[styles.markerPointer, isSelected && styles.markerPointerSelected]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View style={styles.header}>
        <Text style={styles.title}>Mapa Pokémonów</Text>
        <Text style={styles.subtitle}>{pins.length} zapisanych pinów</Text>
      </View>

      {pokemonFilterOptions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterBar}
          contentContainerStyle={styles.filterContent}
        >
          <Pressable
            style={({ pressed }) => [
              styles.filterChip,
              !selectedPokemonFilter && styles.filterChipActive,
              pressed && styles.pressed,
            ]}
            onPress={() => handleOpenPinList(null)}
          >
            <Text style={[styles.filterText, !selectedPokemonFilter && styles.filterTextActive]}>Wszystkie</Text>
          </Pressable>

          {pokemonFilterOptions.map((pokemonName) => {
            const isActive = selectedPokemonFilter === pokemonName;

            return (
              <Pressable
                key={pokemonName}
                style={({ pressed }) => [
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleOpenPinList(pokemonName)}
              >
                <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                  {formatPokemonName(pokemonName)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      {movingPinId && (
        <View style={styles.moveBanner}>
          <Text style={styles.moveText}>Przytrzymaj nowe miejsce, aby przenieść pin.</Text>
          <Pressable style={({ pressed }) => [styles.moveCancel, pressed && styles.pressed]} onPress={handleCancelMove}>
            <Text style={styles.moveCancelText}>Anuluj</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.controlsColumn}>
        <Pressable style={({ pressed }) => [styles.mapControlButton, pressed && styles.pressed]} onPress={() => handleZoom('in')}>
          <Text style={styles.mapControlText}>+</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.mapControlButton, pressed && styles.pressed]} onPress={() => handleZoom('out')}>
          <Text style={styles.mapControlText}>-</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.mapControlButton, pressed && styles.pressed]}
          onPress={handleCenterOnUser}
          disabled={isLocating}
        >
          {isLocating ? <ActivityIndicator size="small" color="#3b4cca" /> : <Text style={styles.locationText}>GPS</Text>}
        </Pressable>
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
      >
        {sheetMode === 'pokemon-picker' && (
          <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
            <Text style={styles.sheetTitle}>{editingPinId ? 'Zmień Pokémona' : 'Wybierz Pokémona'}</Text>
            <Text style={styles.sheetText}>
              {editingPinId
                ? 'Ten Pokémon zastąpi aktualnie przypisanego do pina.'
                : 'Ten Pokémon zostanie przypięty do wybranego miejsca.'}
            </Text>

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

            <View style={styles.actionsGrid}>
              <Pressable style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]} onPress={handleOpenDetails}>
                <Text style={styles.primaryButtonText}>Szczegóły</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                onPress={handleEditSelectedPokemon}
              >
                <Text style={styles.secondaryButtonText}>Zmień</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                onPress={handleMoveSelectedPin}
              >
                <Text style={styles.secondaryButtonText}>Przenieś</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
                onPress={handleRemoveSelectedPin}
              >
                <Text style={styles.dangerButtonText}>Usuń</Text>
              </Pressable>
            </View>
          </BottomSheetView>
        )}

        {sheetMode === 'pin-list' && (
          <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
            <Text style={styles.sheetTitle}>
              {selectedPokemonFilter ? formatPokemonName(selectedPokemonFilter) : 'Wszystkie lokalizacje'}
            </Text>
            <Text style={styles.sheetText}>Wybierz pozycję, żeby przesunąć mapę na zapisane miejsce.</Text>

            <View style={styles.pinList}>
              {listedPins.map((pin) => (
                <Pressable
                  key={pin.id}
                  style={({ pressed }) => [styles.pinListItem, pressed && styles.pressed]}
                  onPress={() => handleSelectListedPin(pin)}
                >
                  <Image source={{ uri: getPokemonImageUrl(pin.pokemonUrl) }} style={styles.pinListImage} />
                  <View style={styles.pinListContent}>
                    <Text style={styles.pinListName}>{formatPokemonName(pin.pokemonName)}</Text>
                    <Text style={styles.pinListCoordinates}>
                      {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </BottomSheetScrollView>
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
  filterBar: {
    position: 'absolute',
    top: 126,
    left: 0,
    right: 0,
  },
  filterContent: {
    gap: 8,
    paddingHorizontal: 20,
  },
  filterChip: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterChipActive: {
    backgroundColor: '#3b4cca',
    borderColor: '#3b4cca',
  },
  filterText: {
    color: '#1f2937',
    fontWeight: '700',
    fontSize: 13,
  },
  filterTextActive: {
    color: '#fff',
  },
  moveBanner: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 118,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(31,41,55,0.94)',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  moveText: {
    flex: 1,
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  moveCancel: {
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 10,
  },
  moveCancelText: {
    color: '#1f2937',
    fontWeight: '700',
    fontSize: 13,
  },
  controlsColumn: {
    position: 'absolute',
    right: 20,
    top: 178,
    gap: 8,
  },
  mapControlButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  mapControlText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1f2937',
    lineHeight: 26,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#3b4cca',
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerBubble: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#3b4cca',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  markerBubbleSelected: {
    borderColor: '#ffcb05',
    transform: [{ scale: 1.08 }],
  },
  markerImage: {
    width: 38,
    height: 38,
  },
  markerPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#3b4cca',
    marginTop: -2,
  },
  markerPointerSelected: {
    borderTopColor: '#ffcb05',
  },
  sheetBackground: {
    backgroundColor: '#fff',
  },
  sheetIndicator: {
    backgroundColor: '#9ca3af',
  },
  sheetContent: {
    paddingTop: 8,
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
  pinList: {
    gap: 10,
  },
  pinListItem: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pinListImage: {
    width: 52,
    height: 52,
  },
  pinListContent: {
    flex: 1,
  },
  pinListName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  pinListCoordinates: {
    marginTop: 3,
    fontSize: 13,
    color: '#6b7280',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  primaryButton: {
    minWidth: '47%',
    flexGrow: 1,
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
  secondaryButton: {
    minWidth: '47%',
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    color: '#3b4cca',
    fontSize: 15,
    fontWeight: '700',
  },
  dangerButton: {
    minWidth: '47%',
    flexGrow: 1,
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
