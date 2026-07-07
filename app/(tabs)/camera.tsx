import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ImageBackground, Dimensions, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraRef, useCameraPermission, useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import { Face, useFaceDetectorOutput } from 'react-native-vision-camera-face-detector';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';

import { useFavouritesContext } from '../../src/features/favourites/context/FavouritesContext';
import { useMapPins } from '../../src/features/map/hooks/useMapPins';
import { getPokemonImageUrl } from '../../src/shared/utils/getPokemonImageUrl';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraScreen() {
  const { hasPermission: cameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const device = useCameraDevice(cameraFacing);
  const cameraRef = useRef<CameraRef>(null);
  const photoOutput = usePhotoOutput();
  const viewShotRef = useRef<ViewShotRef>(null);

  const { favourites } = useFavouritesContext();
  const { addPin } = useMapPins();
  const activePokemon = favourites[0] ?? null;

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // --- REANIMATED SHARED VALUES ---
  const faceX = useSharedValue(SCREEN_WIDTH / 2 - 50); // Domyślnie środek ekranu
  const faceY = useSharedValue(SCREEN_HEIGHT / 2 - 50);
  const faceDetected = useSharedValue(false);

  // --- FLIP KAMERY ---
  const flipCamera = () => {
    setCameraFacing((prev) => (prev === 'front' ? 'back' : 'front'));
  };

  // --- DETEKTOR TWARZY ---
  const faceDetectorOutput = useFaceDetectorOutput({
    performanceMode: 'fast',
    runContours: false,
    runLandmarks: false,
    autoMode: true,
    cameraFacing: cameraFacing,
    windowWidth: SCREEN_WIDTH,
    windowHeight: SCREEN_HEIGHT,
    onError: () => {
      faceDetected.value = false;
    },
    onFacesDetected: (faces: Face[]) => {
      handleFaces(faces);
    },
  });

  const handleFaces = (faces: Face[]) => {
    if (faces.length > 0) {
      const face = faces[0];

      const centerX = face.bounds.x + face.bounds.width / 2;
      const foreheadY = face.bounds.y;

      // Face detector output is auto-scaled to the preview, so these coordinates
      // can be applied directly to the overlay.
      faceX.value = centerX - 50;
      faceY.value = foreheadY - 50;
      faceDetected.value = true;
    } else {
      faceDetected.value = false;
    }
  };

  // --- UPRAWNIENIA ---
  useEffect(() => {
    (async () => {
      if (!cameraPermission) await requestCameraPermission();
      
      const mediaStatus = await MediaLibrary.requestPermissionsAsync();
      setHasMediaLibraryPermission(mediaStatus.status === 'granted');
      
      const locStatus = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(locStatus.status === 'granted');
    })();
  }, [cameraPermission, requestCameraPermission]);

  // --- STYL ANIMOWANY POKEMONA ---
  const pokemonStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      left: withSpring(faceX.value),
      top: withSpring(faceY.value),
      opacity: withSpring(faceDetected.value ? 1 : 0.5),
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
    if (!viewShotRef.current || !previewPhoto || !activePokemon) return;
    
    try {
      // 1. Zrzut ekranu widoku
      const uri = await viewShotRef.current.capture();
      
      // 2. Zapis do galerii
      if (hasMediaLibraryPermission) {
        await MediaLibrary.saveToLibraryAsync(uri);
      }

      // 3. Pobranie lokalizacji
      let coords = { latitude: 52.2297, longitude: 21.0122 }; // Fallback (Warszawa)
      if (hasLocationPermission) {
        const loc = await Location.getCurrentPositionAsync({});
        coords = loc.coords;
      }

      // 4. Zapis do AsyncStorage na Mapę
      addPin(coords, activePokemon);

      Alert.alert('Sukces!', 'Zdjęcie zapisane w galerii i dodane na mapę!');
      setPreviewPhoto(null); // Zamknięcie podglądu
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

  // --- WIDOK PODGLĄDU ZROBIONEGO ZDJĘCIA ---
  if (previewPhoto) {
    return (
      <View style={styles.container}>
        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9 }} style={styles.container}>
          <ImageBackground source={{ uri: previewPhoto }} style={styles.container}>
             {activePokemon && (
               <Animated.Image 
                 source={{ uri: getPokemonImageUrl(activePokemon.url) }} 
                 style={pokemonStyle} 
                 resizeMode="contain" 
               />
             )}
          </ImageBackground>
        </ViewShot>

        <View style={styles.previewControls}>
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
        isActive={true}
        outputs={[faceDetectorOutput, photoOutput]}
      />
      
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

      <View style={styles.controls}>
        {/* Placeholder lewy - dla symetrii */}
        <View style={styles.sideBtn} />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noPokemonWarning: {
    position: 'absolute', top: 60, left: 20, right: 20,
    backgroundColor: 'rgba(255,255,255,0.8)', padding: 10, borderRadius: 8, alignItems: 'center'
  },
  warningText: { color: '#000', fontWeight: 'bold' },
  controls: {
    position: 'absolute', bottom: 100, left: 0, right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 24,
  },
  captureBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.7)',
  },
  captureBtnInner: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#fff'
  },
  sideBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', alignItems: 'center',
  },
  // flipIcon style no longer needed (replaced by Ionicons)
  previewControls: {
    position: 'absolute', bottom: 100, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between'
  },
  btn: {
    backgroundColor: '#3b4cca', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12
  },
  btnSecondary: { backgroundColor: '#6B7280' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
