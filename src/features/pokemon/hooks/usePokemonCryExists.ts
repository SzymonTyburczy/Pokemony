import { useEffect, useState } from 'react';

/**
 * Fetches the set of Pokemon IDs that have a cry audio file available
 * from the PokeAPI/cries GitHub repository.
 *
 * HEAD requests to raw.githubusercontent.com are unreliable (CDN returns 200
 * even for missing files), so we use the GitHub Contents API instead.
 */

const GITHUB_API_URL =
  'https://api.github.com/repos/PokeAPI/cries/contents/cries/pokemon/latest';

let availableIdsPromise: Promise<Set<number>> | null = null;

function fetchAvailableCryIds(): Promise<Set<number>> {
  if (!availableIdsPromise) {
    availableIdsPromise = fetch(GITHUB_API_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
        return res.json() as Promise<Array<{ name: string }>>;
      })
      .then((files) => {
        const ids = files
          .filter((f) => f.name.endsWith('.ogg'))
          .map((f) => parseInt(f.name.replace('.ogg', ''), 10))
          .filter((id) => !isNaN(id));
        return new Set(ids);
      })
      .catch((err) => {
        // On failure reset so next call retries
        availableIdsPromise = null;
        throw err;
      });
  }
  return availableIdsPromise;
}

/**
 * Checks whether a cry audio file actually exists for the given Pokemon ID.
 * Returns `true` if available, `false` if not, `null` while loading.
 */
export function usePokemonCryExists(pokemonId: number | undefined): boolean | null {
  const [hasCry, setHasCry] = useState<boolean | null>(null);

  useEffect(() => {
    if (!pokemonId) {
      setHasCry(false);
      return;
    }

    let cancelled = false;
    setHasCry(null);

    fetchAvailableCryIds()
      .then((ids) => {
        if (!cancelled) {
          setHasCry(ids.has(pokemonId));
        }
      })
      .catch(() => {
        if (!cancelled) {
          // On API failure, assume cry exists to avoid false negatives
          setHasCry(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pokemonId]);

  return hasCry;
}
