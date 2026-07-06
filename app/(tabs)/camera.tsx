import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, Pressable, ImageBackground, Dimensions, Alert } from 'react-native';
import { Camera, useCameraPermission, useCameraDevice, useFrameOutput, useAsyncRunner } from 'react-native-vision-camera';
import { useFaceDetector } from 'react-native-vision-camera-face-detector';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS } from 'react-native-reanimated';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
import ViewShot from 'react-native-view-shot';

import { useFavouritesContext } from '../../src/features/favourites/context/FavouritesContext';
import { useMapPins } from '../../src/features/map/hooks/useMapPins';
import { getPokemonImageUrl } from '../../src/shared/utils/getPokemonImageUrl';
import { PokemonPin } from '../../src/features/map/types/PokemonPin';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function CameraScreen() {
  const { hasPermission: cameraPermission, requestPermission: requestCameraPermission } = useCameraPermission();
  const [hasMediaLibraryPermission, setHasMediaLibraryPermission] = useState(false);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  
  const device = useCameraDevice('front');
  const cameraRef = useRef<Camera>(null);
  const viewShotRef = useRef<ViewShot>(null);

  const { favourites } = useFavouritesContext();
  const { addPin } = useMapPins();
  const activePokemon = favourites[0] ?? null;

  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // --- REANIMATED SHARED VALUES ---
  const faceX = useSharedValue(SCREEN_WIDTH / 2 - 50); // Domyślnie środek ekranu
  const faceY = useSharedValue(SCREEN_HEIGHT / 2 - 50);
  const faceDetected = useSharedValue(false);

  // --- DETEKTOR TWARZY ---
  const faceDetector = useFaceDetector({
    performanceMode: 'fast',
    runContours: false,
    runLandmarks: false,
  });

  const handleFaces = (faces: any[], frameWidth: number, frameHeight: number) => {
    if (faces.length > 0) {
      const face = faces[0];
      
      // Proste przeskalowanie z matrycy wideo do wymiarów ekranu telefonu
      // Uwaga: Dla przedniej kamery w portrecie współrzędne mogą wymagać lustrzanego odbicia
      const scaleX = SCREEN_WIDTH / frameWidth;
      const scaleY = SCREEN_HEIGHT / frameHeight;
      
      const centerX = face.bounds.x + face.bounds.width / 2;
      const foreheadY = face.bounds.y; // Góra bounding boxa jako czoło
      
      // Przypisanie do shared values z lekkim offsetem by obrazek był wycentrowany (-50 to połowa rozmiaru pokemona)
      faceX.value = centerX * scaleX - 50;
      faceY.value = foreheadY * scaleY - 50;
      faceDetected.value = true;
    } else {
      faceDetected.value = false;
    }
  };

  const asyncRunner = useAsyncRunner();

  const frameOutput = useFrameOutput({
    onFrame: (frame) => {
      'worklet';
      const wasHandled = asyncRunner.runAsync(() => {
        'worklet';
        const faces = faceDetector.detectFaces(frame);
        runOnJS(handleFaces)(faces, frame.width, frame.height);
        frame.dispose();
      });
      if (!wasHandled) {
        frame.dispose();
      }
    }
  });

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
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePhoto({
          qualityPrioritization: 'speed',
        });
        setPreviewPhoto(`file://${photo.path}`);
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
      const newPin: PokemonPin = {
        id: Date.now().toString(),
        coordinate: coords,
        pokemon: {
          name: activePokemon.name,
          url: activePokemon.url,
        },
        createdAt: Date.now(),
      };
      addPin(newPin);

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
        photo={true}
        outputs={[frameOutput]}
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
        <Pressable style={styles.captureBtn} onPress={takePhoto}>
          <View style={styles.captureBtnInner} />
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
    position: 'absolute', bottom: 40, left: 0, right: 0,
    alignItems: 'center'
  },
  captureBtn: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center'
  },
  captureBtnInner: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#fff'
  },
  previewControls: {
    position: 'absolute', bottom: 40, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between'
  },
  btn: {
    backgroundColor: '#3b4cca', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12
  },
  btnSecondary: { backgroundColor: '#6B7280' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
