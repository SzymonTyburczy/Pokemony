import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Pokemon3dForm, Pokemon3dSelection } from '../model/pokemon3d';
import { formatPokemonName } from '../../../shared/utils/formatPokemonName';

interface PokemonAnimationModalProps {
  animation: Pokemon3dSelection | null;
  onClose: () => void;
  onPokemonSound?: (pokemonId: number) => void;
  hasCry?: boolean;
}

function createModelViewerHtml(animation: Pokemon3dSelection, hasCry: boolean): string {
  const forms = animation.forms;
  // Start from the initially selected (random) form
  const initialFormIndex = Math.max(
    0,
    forms.findIndex((f) => f.model === animation.form.model)
  );
  const formsJson = JSON.stringify(
    forms.map((f: Pokemon3dForm) => ({ name: f.name, formName: f.formName, model: f.model }))
  );

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
        left: 10px;
        right: 10px;
        bottom: 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .controls-row {
        display: flex;
        gap: 6px;
        align-items: center;
      }

      select, button {
        padding: 9px 10px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.92);
        color: #1f2937;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid rgba(209, 213, 219, 0.9);
        flex: 1;
      }

      .sound-button {
        flex: 0 0 auto;
        background: rgba(59, 76, 202, 0.95);
        color: #ffffff;
        border-color: rgba(59, 76, 202, 0.95);
      }

      .sound-button.disabled {
        background: rgba(156, 163, 175, 0.7);
        color: rgba(255,255,255,0.6);
        border-color: rgba(156, 163, 175, 0.5);
        cursor: not-allowed;
      }

      .random-button {
        flex: 0 0 auto;
      }

      .status {
        position: absolute;
        left: 16px;
        right: 16px;
        bottom: 16px;
        padding: 10px 12px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.92);
        color: #1f2937;
        font-size: 12px;
        font-weight: 700;
        border: 1px solid rgba(209, 213, 219, 0.9);
        text-align: center;
      }

      body.is-loaded .status { display: none; }

      /* During initial load (before any attempt): hide controls, show status */
      body.loading .controls { display: none; }

      /* On error: hide animation row (no animations), keep form row visible */
      body.is-error .animation-row { display: none; }

      /* Hide animation row when model has no animations */
      body:not(.has-animations) .animation-row { display: none; }

      /* Hide form row when only one form */
      body.single-form .form-row { display: none; }

      body.is-error model-viewer { display: none; }
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
      camera-controls
      auto-rotate
      autoplay
      exposure="1"
      shadow-intensity="0.7"
      environment-image="neutral"
    ></model-viewer>
    <div class="status" id="status">Ladowanie modelu 3D</div>
    <div class="controls" id="controls">
      <!-- Row 1: Form picker -->
      <div class="controls-row form-row" id="form-row">
        <select id="form-select" aria-label="Forma"></select>
        <button class="sound-button${hasCry ? '' : ' disabled'}" id="sound-button" type="button">♪</button>
      </div>
      <!-- Row 2: Animation picker + random -->
      <div class="controls-row animation-row" id="animation-row">
        <select id="animation-select" aria-label="Animacja"></select>
        <button class="random-button" id="random-button" type="button">Losuj</button>
      </div>
    </div>
    <script>
      const HAS_CRY = ${hasCry ? 'true' : 'false'};
      const FORMS = ${formsJson};
      let currentFormIndex = ${initialFormIndex};
      let animations = [];
      let lastTouchSoundAt = 0;

      const viewer = document.getElementById('pokemon-model');
      const status = document.getElementById('status');
      const formSelect = document.getElementById('form-select');
      const animationSelect = document.getElementById('animation-select');
      const randomButton = document.getElementById('random-button');
      const soundButton = document.getElementById('sound-button');

      function notifyNative(type) {
        window.ReactNativeWebView?.postMessage(JSON.stringify({ type }));
      }

      function notifyTouchSound() {
        if (!HAS_CRY) return;
        const now = Date.now();
        if (now - lastTouchSoundAt < 650) return;
        lastTouchSoundAt = now;
        notifyNative('model-press');
      }

      // Populate form dropdown
      function buildFormSelect() {
        formSelect.replaceChildren(
          ...FORMS.map((form, i) => {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = form.formName || form.name;
            return opt;
          })
        );
        formSelect.value = String(currentFormIndex);
        if (FORMS.length <= 1) {
          document.body.classList.add('single-form');
        }
      }

      function playAnimation(animationName) {
        if (!animationName) return;
        viewer.animationName = animationName;
        viewer.setAttribute('animation-name', animationName);
        viewer.play();
        animationSelect.value = animationName;
      }

      function pickRandomAnimation() {
        if (animations.length === 0) return;
        const pick = animations[Math.floor(Math.random() * animations.length)];
        playAnimation(pick);
      }

      function loadForm(index) {
        currentFormIndex = index;
        const form = FORMS[index];
        if (!form) return;

        // Reset state for new form load
        animations = [];
        animationSelect.replaceChildren();
        document.body.classList.remove('is-loaded', 'is-error', 'has-animations');
        document.body.classList.add('loading');
        status.textContent = 'Ladowanie modelu 3D';

        viewer.src = form.model;
        viewer.alt = form.name;
      }

      viewer.addEventListener('load', () => {
        document.body.classList.remove('loading');
        document.body.classList.add('is-loaded');
        animations = viewer.availableAnimations || [];

        if (animations.length > 0) {
          document.body.classList.add('has-animations');
          animationSelect.replaceChildren(
            ...animations.map((name) => {
              const opt = document.createElement('option');
              opt.value = name;
              opt.textContent = name;
              return opt;
            })
          );
          // Always start from random animation
          pickRandomAnimation();
        } else {
          animationSelect.replaceChildren();
        }

        notifyNative('model-ready');
      });

      viewer.addEventListener('error', () => {
        document.body.classList.remove('loading');
        document.body.classList.add('is-error');
        status.textContent = 'Model niedostepny';
      });

      formSelect.addEventListener('change', (e) => {
        loadForm(Number(e.target.value));
      });

      animationSelect.addEventListener('change', (e) => {
        playAnimation(e.target.value);
      });

      randomButton.addEventListener('click', pickRandomAnimation);

      soundButton.addEventListener('click', () => {
        if (HAS_CRY) notifyNative('sound-button');
      });

      // Initial load
      buildFormSelect();
      document.body.classList.add('loading');
      loadForm(currentFormIndex);
    </script>
  </body>
</html>`;
}

export function PokemonAnimationModal({ animation, onClose, onPokemonSound, hasCry = true }: PokemonAnimationModalProps) {
  const html = useMemo(
    () => (animation ? createModelViewerHtml(animation, hasCry) : ''),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [animation?.id, animation?.form.model, hasCry]
  );

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    if (!animation || !hasCry) {
      return;
    }

    try {
      const message = JSON.parse(event.nativeEvent.data) as { type?: string };
      if (message.type === 'model-ready' || message.type === 'sound-button') {
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
              <Text style={styles.closeText}>✕</Text>
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
    fontSize: 20,
    lineHeight: 22,
  },
  pressed: {
    opacity: 0.72,
  },
  webView: {
    height: 400,
    backgroundColor: '#f8f9fa',
  },
});
