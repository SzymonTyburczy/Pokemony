import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Pokemon3dSelection } from '../model/pokemon3d';
import { formatPokemonName } from '../../../shared/utils/formatPokemonName';

interface PokemonAnimationModalProps {
  animation: Pokemon3dSelection | null;
  onClose: () => void;
  onPokemonSound?: (pokemonId: number) => void;
}

function createModelViewerHtml(animation: Pokemon3dSelection): string {
  const modelUrl = JSON.stringify(animation.form.model);
  const modelName = JSON.stringify(animation.form.name);

  return `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
    <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #f8f9fa;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      model-viewer {
        width: 100%;
        height: 100%;
        background: radial-gradient(circle at 50% 35%, #ffffff 0%, #edf2ff 52%, #dbe4ff 100%);
      }

      .controls {
        position: absolute;
        left: 16px;
        right: 16px;
        bottom: 16px;
        display: flex;
        gap: 8px;
        align-items: center;
      }

      .animation-select,
      .random-button,
      .sound-button,
      .status {
        padding: 10px 12px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.88);
        color: #1f2937;
        font-size: 13px;
        font-weight: 700;
        border: 1px solid rgba(209, 213, 219, 0.9);
      }

      .animation-select {
        flex: 1;
      }

      .random-button {
        flex: 0 0 auto;
      }

      .sound-button {
        flex: 0 0 auto;
        background: rgba(59, 76, 202, 0.95);
        color: #ffffff;
      }

      .status {
        position: absolute;
        left: 16px;
        right: 16px;
        bottom: 16px;
        text-align: center;
      }

      body.is-loaded .status {
        display: none;
      }

      body:not(.is-loaded) .controls,
      body.is-error .controls {
        display: none;
      }

      body:not(.has-animations) .animation-select,
      body:not(.has-animations) .random-button {
        display: none;
      }

      body.is-error model-viewer {
        display: none;
      }

      body.is-error .status {
        display: block;
        top: 50%;
        bottom: auto;
        transform: translateY(-50%);
      }
    </style>
  </head>
  <body>
    <model-viewer
      id="pokemon-model"
      src=${modelUrl}
      alt=${modelName}
      camera-controls
      auto-rotate
      autoplay
      exposure="1"
      shadow-intensity="0.7"
      environment-image="neutral"
    ></model-viewer>
    <div class="status" id="status">Ladowanie modelu 3D</div>
    <div class="controls" id="controls">
      <select class="animation-select" id="animation-select" aria-label="Animation"></select>
      <button class="random-button" id="random-button" type="button">Losuj</button>
      <button class="sound-button" id="sound-button" type="button">Dzwiek</button>
    </div>
    <script>
      const viewer = document.getElementById('pokemon-model');
      const status = document.getElementById('status');
      const animationSelect = document.getElementById('animation-select');
      const randomButton = document.getElementById('random-button');
      const soundButton = document.getElementById('sound-button');
      let lastTouchSoundAt = 0;
      let animations = [];

      function notifyNative(type) {
        window.ReactNativeWebView?.postMessage(JSON.stringify({ type }));
      }

      function playAnimation(animationName) {
        if (!animationName) {
          return;
        }

        viewer.animationName = animationName;
        viewer.setAttribute('animation-name', animationName);
        viewer.play();
        status.textContent = animationName;
        animationSelect.value = animationName;
      }

      function pickRandomAnimation() {
        if (animations.length === 0) {
          return;
        }

        const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
        playAnimation(randomAnimation);
      }

      function notifyTouchSound() {
        const now = Date.now();
        if (now - lastTouchSoundAt < 650) {
          return;
        }

        lastTouchSoundAt = now;
        notifyNative('model-press');
      }

      viewer.addEventListener('load', () => {
        document.body.classList.add('is-loaded');
        animations = viewer.availableAnimations || [];
        if (animations.length > 0) {
          document.body.classList.add('has-animations');
          animationSelect.replaceChildren(
            ...animations.map((animationName) => {
              const option = document.createElement('option');
              option.value = animationName;
              option.textContent = animationName;
              return option;
            })
          );
          pickRandomAnimation();
        } else {
          status.textContent = 'Model 3D';
        }

        notifyNative('model-ready');
      });

      viewer.addEventListener('click', notifyTouchSound);
      viewer.addEventListener('touchstart', notifyTouchSound, { passive: true });
      animationSelect.addEventListener('change', (event) => {
        playAnimation(event.target.value);
      });
      randomButton.addEventListener('click', pickRandomAnimation);
      soundButton.addEventListener('click', () => notifyNative('sound-button'));

      viewer.addEventListener('error', () => {
        document.body.classList.add('is-error');
        status.textContent = 'Model niedostepny';
      });
    </script>
  </body>
</html>`;
}

export function PokemonAnimationModal({ animation, onClose, onPokemonSound }: PokemonAnimationModalProps) {
  const html = useMemo(() => (animation ? createModelViewerHtml(animation) : ''), [animation]);

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    if (!animation) {
      return;
    }

    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string };
      if (message.type === 'model-ready' || message.type === 'model-press' || message.type === 'sound-button') {
        onPokemonSound?.(animation.id);
      }
    } catch {
      onPokemonSound?.(animation.id);
    }
  };

  return (
    <Modal visible={Boolean(animation)} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.number}>#{animation?.id}</Text>
              <Text style={styles.title}>
                {animation ? formatPokemonName(animation.pokemonName) : ''}
              </Text>
              <Text style={styles.formName}>{animation?.form.formName}</Text>
            </View>

            <Pressable style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]} onPress={onClose}>
              <Text style={styles.closeText}>X</Text>
            </Pressable>
          </View>

          {animation && (
            <WebView
              key={`${animation.id}-${animation.form.model}`}
              originWhitelist={['*']}
              source={{ html }}
              style={styles.webView}
              javaScriptEnabled
              domStorageEnabled
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              scrollEnabled={false}
              onMessage={handleWebViewMessage}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: 18,
  },
  content: {
    overflow: 'hidden',
    borderRadius: 16,
    backgroundColor: '#fff',
    minHeight: 460,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  header: {
    minHeight: 84,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
  },
  number: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '800',
  },
  title: {
    color: '#1f2937',
    fontSize: 22,
    fontWeight: '800',
  },
  formName: {
    color: '#3b4cca',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: '#1f2937',
    fontSize: 28,
    lineHeight: 30,
  },
  pressed: {
    opacity: 0.72,
  },
  webView: {
    height: 376,
    backgroundColor: '#f8f9fa',
  },
});
