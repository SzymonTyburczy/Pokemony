import { useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { getPokemonCryUrl } from '../../../shared/utils/getPokemonCryUrl';

export function usePokemonCryPlayer() {
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch((error) => {
      console.warn('Nie udało się ustawić trybu audio:', error);
    });

    playerRef.current = createAudioPlayer(null);

    return () => {
      playerRef.current?.release();
      playerRef.current = null;
    };
  }, []);

  return useCallback((pokemonId: number) => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    try {
      player.pause();
      player.replace({ uri: getPokemonCryUrl(pokemonId) });
      player.play();
    } catch (error) {
      console.warn('Nie udało się odtworzyć cry Pokémona:', error);
    }
  }, []);
}
