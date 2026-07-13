import { useCallback, useRef } from "react";
import { WebView } from "react-native-webview";
import { getPokemonCryUrl } from "../../../shared/utils/getPokemonCryUrl";

/**
 * Hook that returns a hidden WebView ref and a play function.
 * iOS does not support OGG natively; we use a WebView with HTML5 Audio
 * so the browser engine (WKWebView) handles OGG decoding.
 */
export function usePokemonCryPlayer() {
  const webViewRef = useRef<WebView | null>(null);

  const playPokemonCry = useCallback((pokemonId: number) => {
    const url = getPokemonCryUrl(pokemonId);
    // Inject JavaScript into the hidden WebView to play the audio
    const js = `
      (function() {
        if (window._cryAudio) {
          window._cryAudio.pause();
          window._cryAudio.src = '';
        }
        var audio = new Audio(${JSON.stringify(url)});
        audio.volume = 1.0;
        audio.play().catch(function(e) { console.warn('cry play error', e); });
        window._cryAudio = audio;
      })();
      true;
    `;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  return { webViewRef, playPokemonCry };
}

/**
 * Returns the HTML for the hidden audio WebView.
 */
export function getCryPlayerHtml(): string {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body style="margin:0;padding:0;background:transparent;"></body></html>`;
}
