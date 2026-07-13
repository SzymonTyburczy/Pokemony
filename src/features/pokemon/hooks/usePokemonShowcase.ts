import { useCallback, useState } from "react";
import { fetchAllPokemon3dForms } from "../api/pokemon3dApi";
import { Pokemon } from "../model/types";
import { Pokemon3dSelection } from "../model/pokemon3d";
import { getPokemonIdFromUrl } from "../../../shared/utils/getPokemonIdFromUrl";
import { usePokemonCryPlayer } from "./usePokemonCryPlayer";

export function usePokemonShowcase() {
  const { webViewRef, playPokemonCry } = usePokemonCryPlayer();
  const [selectedAnimation, setSelectedAnimation] =
    useState<Pokemon3dSelection | null>(null);
  const [loadingPokemonName, setLoadingPokemonName] = useState<string | null>(
    null,
  );

  const showPokemonById = useCallback(
    async (pokemonId: number, pokemonName: string) => {
      setLoadingPokemonName(pokemonName);

      try {
        const forms = await fetchAllPokemon3dForms(pokemonId);
        if (forms.length > 0) {
          const randomForm = forms[Math.floor(Math.random() * forms.length)];
          setSelectedAnimation({
            id: pokemonId,
            pokemonName,
            form: randomForm,
            forms,
          });
        }
      } catch (error) {
        console.warn("Nie udało się pobrać modelu 3D Pokémona:", error);
      } finally {
        setLoadingPokemonName(null);
      }
    },
    [],
  );

  const showPokemon = useCallback(
    async (pokemon: Pokemon) => {
      const pokemonId = getPokemonIdFromUrl(pokemon.url);
      if (!pokemonId) {
        return;
      }

      await showPokemonById(pokemonId, pokemon.name);
    },
    [showPokemonById],
  );

  const closeAnimation = useCallback(() => {
    setSelectedAnimation(null);
  }, []);

  return {
    selectedAnimation,
    loadingPokemonName,
    playPokemonCry,
    webViewRef,
    showPokemon,
    showPokemonById,
    closeAnimation,
  };
}
