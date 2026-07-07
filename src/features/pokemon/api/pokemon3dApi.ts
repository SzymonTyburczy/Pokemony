import { Pokemon3dEntry, Pokemon3dForm } from '../model/pokemon3d';

const POKEMON_3D_API_URL = 'https://pokemon-3d-api.onrender.com/v1/pokemon';

let pokemon3dIndexPromise: Promise<Map<number, Pokemon3dEntry>> | null = null;
const preloadedFormPromises = new Map<number, Promise<Pokemon3dForm | null>>();

async function fetchPokemon3dIndex(): Promise<Map<number, Pokemon3dEntry>> {
  if (!pokemon3dIndexPromise) {
    pokemon3dIndexPromise = fetch(POKEMON_3D_API_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Pokemon 3D API error: ${response.status}`);
        }
        return response.json();
      })
      .then((data: Pokemon3dEntry[] | { pokemon?: Pokemon3dEntry[] }) => {
        const entries = Array.isArray(data) ? data : data.pokemon ?? [];
        return new Map(entries.map((entry) => [entry.id, entry]));
      })
      .catch((error) => {
        pokemon3dIndexPromise = null;
        throw error;
      });
  }

  return pokemon3dIndexPromise;
}

async function selectRandomPokemon3dForm(id: number): Promise<Pokemon3dForm | null> {
  const forms = await fetchAllPokemon3dForms(id);
  if (forms.length === 0) {
    return null;
  }

  return forms[Math.floor(Math.random() * forms.length)];
}

function warmModelAsset(modelUrl: string) {
  fetch(modelUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Pokemon 3D model preload error: ${response.status}`);
      }
      return response.arrayBuffer();
    })
    .catch((error) => {
      console.log('Preload modelu 3D zignorowany:', error.message);
    });
}

export function preloadRandomPokemon3dForm(id: number): Promise<Pokemon3dForm | null> {
  const existingPromise = preloadedFormPromises.get(id);
  if (existingPromise) {
    return existingPromise;
  }

  const formPromise = selectRandomPokemon3dForm(id)
    .then((form) => {
      if (form?.model) {
        warmModelAsset(form.model);
      }
      return form;
    })
    .catch((error) => {
      preloadedFormPromises.delete(id);
      throw error;
    });

  preloadedFormPromises.set(id, formPromise);
  return formPromise;
}

export async function fetchRandomPokemon3dForm(id: number): Promise<Pokemon3dForm | null> {
  const preloadedFormPromise = preloadedFormPromises.get(id);
  if (preloadedFormPromise) {
    preloadedFormPromises.delete(id);
    return preloadedFormPromise;
  }

  return selectRandomPokemon3dForm(id);
}

export async function fetchAllPokemon3dForms(id: number): Promise<Pokemon3dForm[]> {
  const index = await fetchPokemon3dIndex();
  const allForms = index.get(id)?.forms.filter((form) => Boolean(form.model)) ?? [];

  const validFormsPromises = allForms.map(async (form) => {
    try {
      const response = await fetch(form.model, { method: 'HEAD' });
      return response.ok ? form : null;
    } catch {
      return null;
    }
  });

  const validForms = (await Promise.all(validFormsPromises)).filter(
    (form): form is Pokemon3dForm => form !== null
  );

  return validForms;
}
