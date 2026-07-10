import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useFrameOutput,
  type CameraFrameOutput,
  type Frame,
} from 'react-native-vision-camera';
import { useResizer } from 'react-native-vision-camera-resizer';
import { loadTensorflowModel, type TfliteModel } from 'react-native-fast-tflite';
import {
  runOnJS,
  useAnimatedReaction,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { COCO_CLASSES, getTranslation } from '../model/cocoClasses';

// EfficientDet-Lite0 (COCO, 320x320 RGB uint8) — dokładniejszy od SSD MobileNet v1
// przy porównywalnym rozmiarze. Kolejność wyjść: boxes, classes, scores, count.
const MODEL_INPUT_SIZE = 320;

// Minimalna pewność detekcji. Niżej = więcej fałszywych trafień.
const MIN_SCORE = 0.45;

// Inferencja max ~6-7x/s. Pełne 30-60 FPS nic nie daje wizualnie,
// a zapycha CPU i grzeje telefon (dotychczasowa przyczyna zacięć).
const MIN_INFERENCE_INTERVAL_MS = 150;

// Histereza: obiekt uznajemy za zgubiony dopiero po tym czasie bez detekcji,
// żeby pojedyncze słabsze klatki nie powodowały migotania.
const LOST_TIMEOUT_MS = 700;

// Wygładzanie pozycji (EMA): 1.0 = natychmiastowy skok, 0 = brak ruchu.
const POSITION_SMOOTHING = 0.35;

export type ObjectDetectionModelState = 'loading' | 'loaded' | 'error';

export interface UseObjectDetectionParams {
  /** Czy tryb detekcji obiektów jest aktywny (worklet nic nie robi gdy false). */
  isEnabled: boolean;
  screenWidth: number;
  screenHeight: number;
  /** Pozycja lewego górnego rogu sprite'a Pokemona (px ekranu). */
  targetX: SharedValue<number>;
  targetY: SharedValue<number>;
  targetDetected: SharedValue<boolean>;
  /** Połowa rozmiaru sprite'a — offset od środka wykrytego obiektu. */
  spriteHalfSize?: number;
}

export interface UseObjectDetectionResult {
  frameOutput: CameraFrameOutput;
  modelState: ObjectDetectionModelState;
  /** Polska nazwa aktualnie wykrytego obiektu albo null. */
  detectedLabel: string | null;
}

/**
 * Detekcja obiektów COCO na klatkach kamery (VisionCamera v5 + TFLite).
 *
 * Architektura zaprojektowana tak, by nie blokować ani pipeline'u kamery,
 * ani wątku JS:
 * - inferencja jest throttlowana, żeby nie uruchamiać modelu co klatkę,
 * - klatki przychodzące w trakcie inferencji są od razu odrzucane,
 * - pozycja Pokemona idzie wyłącznie przez Reanimated shared values,
 * - przejście na wątek JS (re-render Reacta) dzieje się tylko przy ZMIANIE
 *   etykiety, a nie co klatkę.
 */
export function useObjectDetection({
  isEnabled,
  screenWidth,
  screenHeight,
  targetX,
  targetY,
  targetDetected,
  spriteHalfSize = 50,
}: UseObjectDetectionParams): UseObjectDetectionResult {
  const [model, setModel] = useState<TfliteModel | undefined>(undefined);
  const [modelState, setModelState] = useState<ObjectDetectionModelState>('loading');
  const [detectedClassIdx, setDetectedClassIdx] = useState(-1);

  // Stan React zdublowany w shared values, żeby worklet nie musiał być
  // odtwarzany przy każdym re-renderze ekranu.
  const isEnabledShared = useSharedValue(isEnabled);
  useEffect(() => {
    isEnabledShared.value = isEnabled;
  }, [isEnabled, isEnabledShared]);

  // Stan wewnętrzny workletu.
  const lastInferenceAt = useSharedValue(0);
  const lastSeenAt = useSharedValue(0);
  const lastClassIdx = useSharedValue(-1);

  // --- ŁADOWANIE MODELU ---
  useEffect(() => {
    let cancelled = false;
    let loadedModel: TfliteModel | undefined;
    (async () => {
      try {
        loadedModel = await loadTensorflowModel(
          require('../../../../assets/efficientdet_lite0.tflite'),
          []
        );
        if (cancelled) return;
        setModel(loadedModel);
        setModelState('loaded');
      } catch (e) {
        console.error('Nie udało się załadować modelu detekcji:', e);
        if (!cancelled) setModelState('error');
      }
    })();
    return () => {
      cancelled = true;
      try {
        loadedModel?.dispose();
      } catch {
        // model mógł być już zwolniony natywnie
      }
    };
  }, []);

  // Reset etykiety przy wyłączeniu trybu detekcji.
  useEffect(() => {
    if (!isEnabled) {
      setDetectedClassIdx(-1);
      lastClassIdx.value = -1;
      lastSeenAt.value = 0;
    }
  }, [isEnabled, lastClassIdx, lastSeenAt]);

  const { resizer } = useResizer({
    width: MODEL_INPUT_SIZE,
    height: MODEL_INPUT_SIZE,
    channelOrder: 'rgb',
    dataType: 'uint8',
    scaleMode: 'cover',
    pixelLayout: 'interleaved',
  });

  const onLabelChanged = useCallback((classIdx: number) => {
    setDetectedClassIdx(classIdx);
  }, []);

  useAnimatedReaction(
    () => lastClassIdx.value,
    (classIdx, previousClassIdx) => {
      if (classIdx !== previousClassIdx) {
        runOnJS(onLabelChanged)(classIdx);
      }
    },
    [onLabelChanged]
  );

  // Worklet zmemoizowany — odtwarza się tylko gdy załaduje się model/resizer,
  // a NIE przy każdym re-renderze ekranu (wcześniejsza wersja przepinała
  // callback natywny co render, co kończyło się crashem po paru sekundach).
  const onFrame = useCallback(
    (frame: Frame) => {
      'worklet';
      if (
        !isEnabledShared.value ||
        model == null ||
        resizer == null
      ) {
        frame.dispose();
        return;
      }

      const now = Date.now();
      if (now - lastInferenceAt.value < MIN_INFERENCE_INTERVAL_MS) {
        frame.dispose();
        return;
      }

      // Metadane klatki czytamy przed przekazaniem na wątek inferencji.
      const frameWidth = frame.width;
      const frameHeight = frame.height;
      const isMirrored = frame.isMirrored;

      lastInferenceAt.value = now;
      try {
        // Resizer robi wycentrowany kwadratowy crop ('cover') i skaluje
        // do wejścia modelu.
        const resized = resizer.resize(frame);
        const pixelBuffer = resized.getPixelBuffer();
        const outputs = model.runSync([pixelBuffer]);
        resized.dispose();

        if (outputs.length >= 4) {
          const boxes = new Float32Array(outputs[0]);
          const classes = new Float32Array(outputs[1]);
          const scores = new Float32Array(outputs[2]);
          const countArr = new Float32Array(outputs[3]);
          const count = Math.min(countArr[0] ?? 0, classes.length);

          // Najlepsza detekcja powyżej progu (a nie pierwsza jak wcześniej).
          let best = -1;
          let bestScore = MIN_SCORE;
          for (let i = 0; i < count; i++) {
            if (scores[i] >= bestScore) {
              bestScore = scores[i];
              best = i;
            }
          }

          const detectionTime = Date.now();
          if (best >= 0) {
            const ymin = boxes[best * 4];
            const xmin = boxes[best * 4 + 1];
            const ymax = boxes[best * 4 + 2];
            const xmax = boxes[best * 4 + 3];
            const cx = (xmin + xmax) / 2;
            const cy = (ymin + ymax) / 2;

            // Mapowanie: współrzędne modelu (kwadratowy crop) -> piksele
            // klatki -> piksele ekranu (podgląd kamery to aspect-fill).
            const cropSize = Math.min(frameWidth, frameHeight);
            const cropX = (frameWidth - cropSize) / 2;
            const cropY = (frameHeight - cropSize) / 2;
            let frameX = cropX + cx * cropSize;
            const frameY = cropY + cy * cropSize;
            if (isMirrored) {
              frameX = frameWidth - frameX;
            }
            const previewScale = Math.max(
              screenWidth / frameWidth,
              screenHeight / frameHeight
            );
            const screenX =
              frameX * previewScale - (frameWidth * previewScale - screenWidth) / 2;
            const screenY =
              frameY * previewScale - (frameHeight * previewScale - screenHeight) / 2;

            const newX = screenX - spriteHalfSize;
            const newY = screenY - spriteHalfSize;
            if (targetDetected.value) {
              // Wygładzanie, żeby Pokemon nie skakał między klatkami.
              targetX.value =
                targetX.value + (newX - targetX.value) * POSITION_SMOOTHING;
              targetY.value =
                targetY.value + (newY - targetY.value) * POSITION_SMOOTHING;
            } else {
              targetX.value = newX;
              targetY.value = newY;
            }
            targetDetected.value = true;
            lastSeenAt.value = detectionTime;

            const classIdx = Math.round(classes[best]);
            if (classIdx !== lastClassIdx.value) {
              lastClassIdx.value = classIdx;
            }
          } else if (
            targetDetected.value &&
            detectionTime - lastSeenAt.value > LOST_TIMEOUT_MS
          ) {
            targetDetected.value = false;
            if (lastClassIdx.value !== -1) {
              lastClassIdx.value = -1;
            }
          }
        }
      } catch {
        // Pojedyncza zepsuta klatka nie może wywalić pipeline'u.
      } finally {
        frame.dispose();
      }
    },
    [
      model,
      resizer,
      onLabelChanged,
      screenWidth,
      screenHeight,
      spriteHalfSize,
      isEnabledShared,
      lastInferenceAt,
      lastSeenAt,
      lastClassIdx,
      targetX,
      targetY,
      targetDetected,
    ]
  );

  const frameOutput = useFrameOutput({
    // Resizer na iOS wymaga YUV; przy `native` potrafi dostawać format,
    // którego nie umie przekonwertować i detekcja cicho nie zwraca wyników.
    pixelFormat: 'yuv',
    // Fizyczna rotacja bufora: model dostaje obraz "do góry głową w górę".
    // Bez tego (stara wersja) model widział obraz obrócony o 90 stopni,
    // przez co detekcja praktycznie nie działała.
    enablePhysicalBufferRotation: true,
    // Mniejsze bufory — do detekcji nie potrzeba pełnej rozdzielczości.
    enablePreviewSizedOutputBuffers: true,
    dropFramesWhileBusy: true,
    onFrame,
    onFrameDropped() {
      // Dropy są tu oczekiwane (throttling) — nie spamujemy konsoli.
    },
  });

  const detectedLabel = useMemo(() => {
    const name = COCO_CLASSES[detectedClassIdx];
    return name != null ? getTranslation(name) : null;
  }, [detectedClassIdx]);

  return { frameOutput, modelState, detectedLabel };
}
