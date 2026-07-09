import React, { useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ImageBackground, Dimensions, Alert, ScrollView, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraRef, useCameraPermission, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import { Face, useFaceDetectorOutput } from 'react-native-vision-camera-face-detector';

import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { Asset as MediaAsset, requestPermissionsAsync } from 'expo-media-library';
import * as Location from 'expo-location';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';

import { useFavouritesContext } from '../../src/features/favourites/context/FavouritesContext';
import { useMapPins } from '../../src/features/map/hooks/useMapPins';
import { getPokemonImageUrl } from '../../src/shared/utils/getPokemonImageUrl';
import { useObjectDetection } from '../../src/features/camera/detection/useObjectDetection';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type FaceDetectorOutputOptions = {
  performanceMode: 'fast' | 'accurate';
  runContours: boolean;
  runLandmarks: boolean;
  autoMode: boolean;
  cameraFacing: 'front' | 'back';
  windowWidth: number;
  windowHeight: number;
  onError: () => void;
  onFacesDetected: (faces: Face[]) => void;
};

type UseFaceDetectorOutput = (options: FaceDetectorOutputOptions) => unknown | null;

const useOptionalFaceDetectorOutput: UseFaceDetectorOutput = (() => {
  try {
    return require('react-native-vision-camera-face-detector').useFaceDetectorOutput;
  } catch (error) {
    console.warn('Face detector native module is unavailable in this build:', error);
    return () => null;
  }
})();

export default function CameraScreen() {
  const insets = useSafeAreaInsets();
  const controlsBottom = Math.max(insets.bottom, 16) + 8;
  const selectorBottom = controlsBottom + 92;

  const { hasPermission: cameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const device = useCameraDevice(cameraFacing);
  const cameraRef = useRef<CameraRef>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const photoOutput = usePhotoOutput();
  const viewShotRef = useRef<ViewShotRef>(null);

  const { favourites } = useFavouritesContext();
  const { addPin } = useMapPins();

  const [activePokemonIndex, setActivePokemonIndex] = useState<number | null>(0);
  const activePokemon =
    activePokemonIndex !== null ? (favourites[activePokemonIndex] ?? favourites[0] ?? null) : null;
  const [showPokemonSelector, setShowPokemonSelector] = useState(false);

  useEffect(() => {
    if (activePokemonIndex !== null && activePokemonIndex >= favourites.length) {
      setActivePokemonIndex(favourites.length > 0 ? favourites.length - 1 : null);
    }
  }, [favourites.length, activePokemonIndex]);

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // --- REANIMATED SHARED VALUES ---
  const targetX = useSharedValue(SCREEN_WIDTH / 2 - 50);
  const targetY = useSharedValue(SCREEN_HEIGHT / 2 - 50);
  const targetDetected = useSharedValue(false);

  // --- TRYB DETEKCJI OBIEKTÓW ---
  const [isObjectMode, setIsObjectMode] = useState(false);
  const [lockedObj, setLockedObj] = useState(false);

  // --- FLIP KAMERY ---
  const flipCamera = () => {
    setCameraError(null);
    setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  // --- DETEKTOR TWARZY ---
  const faceDetectorOutput = useOptionalFaceDetectorOutput({
    performanceMode: 'fast',
    runContours: false,
    runLandmarks: false,
    autoMode: true,
    cameraFacing: cameraFacing,
    windowWidth: SCREEN_WIDTH,
    windowHeight: SCREEN_HEIGHT,
    onError: () => {
      if (!isObjectMode) targetDetected.value = false;
    },
    onFacesDetected: (faces: Face[]) => {
      if (isObjectMode || lockedObj) return;
      if (faces.length > 0) {
        const face = faces[0];
        const centerX = face.bounds.x + face.bounds.width / 2;
        const foreheadY = face.bounds.y;

        targetX.value = centerX - 50;
        targetY.value = foreheadY - 50;
        targetDetected.value = true;
      } else {
        targetDetected.value = false;
      }
    },
  });

  // --- DETEKTOR OBIEKTÓW (EfficientDet-Lite0 TFLite) ---
  // Cała logika (model, resizer, worklet, throttling) jest w hooku.
  const {
    frameOutput: objectFrameOutput,
    modelState,
    detectedLabel: detectedObjName,
  } = useObjectDetection({
    isEnabled: isObjectMode,
    isLocked: lockedObj,
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    targetX,
    targetY,
    targetDetected,
  });

  // --- UPRAWNIENIA ---
  useEffect(() => {
    (async () => {
      if (!cameraPermission) await requestCameraPermission();

      const mediaStatus = await requestPermissionsAsync();
      setHasMediaLibraryPermission(mediaStatus.status === 'granted');

      const locStatus = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(locStatus.status === 'granted');
    })();
  }, [cameraPermission, requestCameraPermission]);

  const cameraOutputs = useMemo(() => {
    const outs: any[] = photoOutput ? [photoOutput] : [];
    if (isObjectMode) {
      outs.push(objectFrameOutput);
    } else if (faceDetectorOutput) {
      outs.push(faceDetectorOutput);
    }
    return outs;
  }, [faceDetectorOutput, photoOutput, isObjectMode, objectFrameOutput]);

  // --- STYL ANIMOWANY POKEMONA ---
  // Pozycja przez transform (nie left/top — brak przeliczania layoutu co klatkę).
  // Pozycja jest już wygładzana po stronie detekcji, więc bez springów,
  // które przy retargetowaniu co klatkę dociążały wątek UI.
  const pokemonStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: 0,
      top: 0,
      transform: [{ translateX: targetX.value }, { translateY: targetY.value }],
      opacity: withTiming(targetDetected.value ? 1 : 0.5, { duration: 150 }),
      width: 100,
      height: 100,
    };
  });

  // --- ROBIENIE ZDJĘCIA ---
  const takePhoto = async () => {
    if (photoOutput) {
      try {
        const photo = await photoOutput.capturePhotoToFile({}, {});
        setPreviewPhoto(`file://${photo.filePath}`);
      } catch (e) {
        Alert.alert('Błąd', 'Nie udało się zrobić zdjęcia.');
      }
    }
  };

  // --- ZAPIS (Zrzut ViewShot + Galeria + Mapa) ---
  const saveCompositePhoto = async () => {
    if (!viewShotRef.current || !previewPhoto) return;
    try {
      const uri = await viewShotRef.current.capture();
      if (hasMediaLibraryPermission) {
        await MediaAsset.create(uri);
      }
      if (activePokemon) {
        let coords = { latitude: 52.2297, longitude: 21.0122 };
        if (hasLocationPermission) {
          const loc = await Location.getCurrentPositionAsync({});
          coords = loc.coords;
        }
        addPin(coords, activePokemon);
        Alert.alert('Sukces!', 'Zdjęcie zapisane w galerii i dodane na mapę!');
      } else {
        Alert.alert('Sukces!', 'Zdjęcie zapisane w galerii!');
      }
      setPreviewPhoto(null);
    } catch (e) {
      Alert.alert('Błąd', 'Nie udało się zapisać zrzutu.');
    }
  };

  if (!cameraPermission || !device) {
    return (
      <View style={styles.center}>
        <Text>Ładowanie kamery lub brak uprawnień...</Text>
      </View>
    );
  }

  if (cameraError) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorIcon}>📷</Text>
        <Text style={styles.errorTitle}>Kamera niedostępna</Text>
        <Text style={styles.errorMessage}>{cameraError}</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => {
            setCameraError(null);
            setCameraFacing('back');
          }}
        >
          <Text style={styles.retryBtnText}>Spróbuj ponownie</Text>
        </Pressable>
      </View>
    );
  }

  // --- WIDOK PODGLĄDU ZROBIONEGO ZDJĘCIA ---
  if (previewPhoto) {
    return (
      <View style={styles.container}>
        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }} style={styles.container}>
          <ImageBackground
            source={{ uri: previewPhoto }}
            style={styles.container}
            imageStyle={{
              transform: [{
                scaleX: cameraFacing === 'front' ? (Platform.OS === 'ios' ? -1 : 1) : 1
              }]
            }}
          >
            {activePokemon && (
              <Animated.Image
                source={{ uri: getPokemonImageUrl(activePokemon.url) }}
                style={pokemonStyle}
                resizeMode="contain"
              />
            )}
          </ImageBackground>
        </ViewShot>

        <View style={[styles.previewControls, { bottom: controlsBottom }]}>
          <Pressable style={[styles.btn, styles.btnSecondary]} onPress={() => setPreviewPhoto(null)}>
            <Text style={styles.btnText}>Odrzuć</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={saveCompositePhoto}>
            <Text style={styles.btnText}>Zapisz 📍</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // --- GŁÓWNY WIDOK KAMERY ---
  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={!cameraError}
        outputs={cameraOutputs as any}
        onError={(error) => {
          const msg = error.message ?? String(error);
          if (
            msg.includes('device policy') ||
            msg.includes('Camera is disabled') ||
            msg.includes('fatal Camera error')
          ) {
            setCameraError(
              'Kamera jest wyłączona przez politykę urządzenia lub emulator nie obsługuje kamery.\n\nSprawdź uprawnienia lub użyj fizycznego telefonu.'
            );
          } else {
            setCameraError(`Błąd kamery: ${msg}`);
          }
        }}
      />

      {isObjectMode && (
        <View style={styles.modeIndicator}>
          <Text style={styles.modeIndicatorText}>
            {modelState === 'loading' ? 'Ładowanie modelu AI...' : modelState === 'error' ? 'Błąd ładowania modelu AI' : 'Szukam obiektów (banan, laptop...)'}
          </Text>
        </View>
      )}

      {isObjectMode && detectedObjName && !lockedObj && (
        <View style={styles.lockOverlay}>
          <Pressable style={styles.lockBtn} onPress={() => setLockedObj(true)}>
            <Text style={styles.lockBtnText}>Połóż na: {detectedObjName}</Text>
          </Pressable>
        </View>
      )}

      {isObjectMode && lockedObj && (
        <View style={styles.lockOverlay}>
          <Pressable style={styles.lockBtnActive} onPress={() => setLockedObj(false)}>
            <Text style={styles.lockBtnTextActive}>Odblokuj ({detectedObjName})</Text>
          </Pressable>
        </View>
      )}

      {activePokemon ? (
        <Animated.Image
          source={{ uri: getPokemonImageUrl(activePokemon.url) }}
          style={pokemonStyle}
          resizeMode="contain"
        />
      ) : (
        <View style={styles.noPokemonWarning}>
          <Text style={styles.warningText}>Wybierz ulubionego Pokémona na liście!</Text>
        </View>
      )}

      {favourites.length > 0 && (
        <View style={[styles.pokemonSelector, { bottom: selectorBottom, display: showPokemonSelector ? 'flex' : 'none' }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.selectorContent}
          >
            <Pressable
              style={[styles.selectorItem, activePokemonIndex === null && styles.selectorItemActive]}
              onPress={() => { setActivePokemonIndex(null); setShowPokemonSelector(false); }}
            >
              <Text style={styles.selectorNoneText}>✕</Text>
            </Pressable>
            {favourites.map((item, index) => {
              const isActive = index === activePokemonIndex;
              return (
                <Pressable
                  key={item.name}
                  style={[styles.selectorItem, isActive && styles.selectorItemActive]}
                  onPress={() => { setActivePokemonIndex(index); setShowPokemonSelector(false); }}
                >
                  <Image
                    source={{ uri: getPokemonImageUrl(item.url) }}
                    style={styles.selectorImage}
                    resizeMode="contain"
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      <View style={[styles.controls, { bottom: controlsBottom }]}>
        <Pressable style={styles.sideBtn} onPress={() => {
          setIsObjectMode(prev => !prev);
          setLockedObj(false);
          targetDetected.value = false;
        }}>
          <Ionicons name={isObjectMode ? "cube" : "happy-outline"} size={26} color={isObjectMode ? "#3b4cca" : "#fff"} />
        </Pressable>
        
        {favourites.length > 0 ? (
          <Pressable style={styles.sideBtn} onPress={() => setShowPokemonSelector(prev => !prev)}>
            <Ionicons name="paw-outline" size={24} color={activePokemonIndex === null ? 'rgba(255,255,255,0.4)' : '#fff'} />
          </Pressable>
        ) : (
          <View style={styles.sideBtn} />
        )}
        <Pressable style={styles.captureBtn} onPress={takePhoto}>
          <View style={styles.captureBtnInner} />
        </Pressable>
        <Pressable style={styles.sideBtn} onPress={flipCamera}>
          <Ionicons name="camera-reverse-outline" size={26} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#111' },
  errorIcon: { fontSize: 64, marginBottom: 16 },
  errorTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8, textAlign: 'center' },
  errorMessage: { fontSize: 14, color: '#aaa', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  retryBtn: { backgroundColor: '#3b4cca', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 10 },
  retryBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  modeIndicator: {
    position: 'absolute', top: 60, left: 20, right: 20,
    backgroundColor: 'rgba(59, 76, 202, 0.9)', padding: 10, borderRadius: 8, alignItems: 'center'
  },
  modeIndicatorText: { color: '#fff', fontWeight: 'bold' },
  lockOverlay: {
    position: 'absolute', top: 120, left: 20, right: 20,
    alignItems: 'center', zIndex: 10,
  },
  lockBtn: {
    backgroundColor: '#ffcc00', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24,
    shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
  },
  lockBtnText: { color: '#3b4cca', fontWeight: 'bold', fontSize: 16 },
  lockBtnActive: {
    backgroundColor: '#3b4cca', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24,
    shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
    borderWidth: 2, borderColor: '#ffcc00'
  },
  lockBtnTextActive: { color: '#ffcc00', fontWeight: 'bold', fontSize: 16 },
  noPokemonWarning: {
    position: 'absolute', top: 60, left: 20, right: 20,
    backgroundColor: 'rgba(255,255,255,0.8)', padding: 10, borderRadius: 8, alignItems: 'center'
  },
  warningText: { color: '#000', fontWeight: 'bold' },
  controls: {
    position: 'absolute', left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 16, gap: 16,
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.7)',
  },
  captureBtnInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  sideBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  pokemonSelector: { position: 'absolute', left: 0, right: 0 },
  selectorContent: { paddingHorizontal: 24, gap: 16 },
  selectorItem: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
  },
  selectorItemActive: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.4)' },
  selectorImage: { width: 40, height: 40 },
  selectorNoneText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },
  previewControls: {
    position: 'absolute', left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between'
  },
  btn: { backgroundColor: '#3b4cca', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  btnSecondary: { backgroundColor: '#6B7280' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
