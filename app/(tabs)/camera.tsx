import React, { useEffect, useRef, useState, useMemo } from 'react';
import { StyleSheet, Text, View, Pressable, ImageBackground, Dimensions, Alert, ScrollView, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraRef, useCameraPermission, useCameraDevice, usePhotoOutput, useFrameOutput } from 'react-native-vision-camera';
import { Face, useFaceDetectorOutput } from 'react-native-vision-camera-face-detector';
import { loadTensorflowModel, type TfliteModel } from 'react-native-fast-tflite';
import { useResizer } from 'react-native-vision-camera-resizer';

import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';

import { Asset as MediaAsset, requestPermissionsAsync } from 'expo-media-library';
import { Asset as ExpoAsset } from 'expo-asset';
import * as Location from 'expo-location';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';

import { useFavouritesContext } from '../../src/features/favourites/context/FavouritesContext';
import { useMapPins } from '../../src/features/map/hooks/useMapPins';
import { getPokemonImageUrl } from '../../src/shared/utils/getPokemonImageUrl';
import { COCO_CLASSES, getTranslation } from '../../src/features/camera/model/cocoClasses';

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
  const [detectedObjName, setDetectedObjName] = useState<string | null>(null);
  const [lockedObj, setLockedObj] = useState(false);
  // Shared values dostępne w worklecie
  const isObjectModeShared = useSharedValue(false);
  const lockedObjShared = useSharedValue(false);

  // --- FLIP KAMERY ---
  const flipCamera = () => {
    setCameraError(null);
    setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  // Synchronizacja stanów React ze shared values workletu
  useEffect(() => { isObjectModeShared.value = isObjectMode; }, [isObjectMode]);
  useEffect(() => { lockedObjShared.value = lockedObj; }, [lockedObj]);

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

  // --- DETEKTOR OBIEKTÓW TFLITE ---
  // Ręczne ładowanie modelu: expo-asset pobiera plik na dysk,
  // potem loadTensorflowModel ładuje go z file:// URI.
  // Model trzymany w stanie React — VisionCamera v5 aktualizuje
  // callback workletu przy każdym re-renderze przez setOnFrameCallback.
  const [actualModel, setActualModel] = useState<TfliteModel | undefined>(undefined);
  const [modelState, setModelState] = useState<'loading' | 'loaded' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setModelState('loading');
        const [asset] = await ExpoAsset.loadAsync(
          require('../../assets/ssd_mobilenet.tflite')
        );
        const localUri = asset.localUri;
        if (!localUri || cancelled) return;

        console.log('TFLite model localUri:', localUri);
        const model = await loadTensorflowModel({ url: localUri }, []);
        if (!cancelled) {
          setActualModel(model);
          setModelState('loaded');
          console.log('TFLite model loaded successfully!');
        }
      } catch (e) {
        console.error('Failed to load TFLite model:', e);
        if (!cancelled) setModelState('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Funkcje JS wywoływane z workletu przez runOnJS
  const onObjectFound = (classIdx: number, centerX: number, centerY: number) => {
    if (lockedObjShared.value) return;
    const nameToTranslate = COCO_CLASSES[classIdx] ?? COCO_CLASSES[classIdx + 1];
    if (!nameToTranslate) return;
    const polishName = getTranslation(nameToTranslate);
    setDetectedObjName(polishName);
    targetX.value = centerX - 50;
    targetY.value = centerY - 50;
    targetDetected.value = true;
  };

  const onObjectLost = () => {
    if (lockedObjShared.value) return;
    setDetectedObjName(null);
    targetDetected.value = false;
  };

  const onFrameError = (msg: string) => {
    console.warn('Frame processing error:', msg);
  };

  // Resizer konwertuje klatkę kamery do formatu akceptowanego przez TFLite.
  // SSD MobileNet v1 oczekuje 300x300 RGB uint8 input.
  const { resizer } = useResizer({
    width: 300,
    height: 300,
    channelOrder: 'rgb',
    dataType: 'uint8',
    scaleMode: 'cover',
    pixelLayout: 'interleaved',
  });

  const objectFrameOutput = useFrameOutput({
    pixelFormat: 'native',
    onFrame(frame) {
      'worklet';
      if (!isObjectModeShared.value || !actualModel || !resizer) {
        frame.dispose();
        return;
      }

      try {
        // Resize klatki do 300x300 RGB uint8 ArrayBuffer
        const resized = resizer.resize(frame);
        const pixelBuffer = resized.getPixelBuffer();

        // WAŻNE: pixelBuffer jest ważny tylko dopóki resized żyje!
        // Nie wolno dispose() przed runSync().
        const outputs = actualModel.runSync([pixelBuffer]);

        // Teraz można zwolnić GPUFrame
        resized.dispose();

        if (outputs && outputs.length >= 4) {
          const boxes = new Float32Array(outputs[0]);
          const classes = new Float32Array(outputs[1]);
          const scores = new Float32Array(outputs[2]);
          const numDetectionsArr = new Float32Array(outputs[3]);
          const numDetections = numDetectionsArr.length > 0 ? numDetectionsArr[0] : 0;

          let found = false;
          for (let i = 0; i < numDetections; i++) {
            if (scores[i] > 0.3) {
              const classIdx = Math.round(classes[i]);
              const ymin = boxes[i * 4];
              const xmin = boxes[i * 4 + 1];
              const ymax = boxes[i * 4 + 2];
              const xmax = boxes[i * 4 + 3];
              const centerX = ((xmin + xmax) / 2) * SCREEN_WIDTH;
              const centerY = ((ymin + ymax) / 2) * SCREEN_HEIGHT;

              if (!lockedObjShared.value) {
                targetX.value = centerX - 50;
                targetY.value = centerY - 50;
                targetDetected.value = true;
                runOnJS(onObjectFound)(classIdx, centerX, centerY);
              }
              found = true;
              break;
            }
          }
          if (!found && !lockedObjShared.value) {
            targetDetected.value = false;
            runOnJS(onObjectLost)();
          }
        }
      } catch (e) {
        runOnJS(onFrameError)(String(e));
      }

      frame.dispose();
    }
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
  const pokemonStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: withSpring(targetX.value),
      top: withSpring(targetY.value),
      opacity: withSpring(targetDetected.value ? 1 : 0.5),
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
          setDetectedObjName(null);
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
