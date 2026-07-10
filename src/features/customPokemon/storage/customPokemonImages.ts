import { Directory, File, Paths } from 'expo-file-system';

const CUSTOM_POKEMON_IMAGES_DIR = 'custom-pokemon-images';
const CUSTOM_POKEMON_IMAGES_PREFIX = `${CUSTOM_POKEMON_IMAGES_DIR}/`;

function getCustomPokemonImagesDirectory(): Directory {
  const directory = new Directory(Paths.document, CUSTOM_POKEMON_IMAGES_DIR);
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

function getImageExtension(uri: string): string {
  const cleanUri = uri.split('?')[0] ?? uri;
  const match = cleanUri.match(/\.(jpe?g|png|webp|heic|heif)$/i);
  return match?.[0].toLowerCase() ?? '.jpg';
}

function toStoredCustomPokemonImagePath(uri: string): string {
  const markerIndex = uri.indexOf(CUSTOM_POKEMON_IMAGES_PREFIX);
  if (markerIndex >= 0) {
    return uri.slice(markerIndex);
  }

  return uri;
}

export function resolveCustomPokemonImageUri(imageUri: string | null): string {
  if (!imageUri) {
    return '';
  }

  if (imageUri.startsWith(CUSTOM_POKEMON_IMAGES_PREFIX)) {
    const filename = imageUri.slice(CUSTOM_POKEMON_IMAGES_PREFIX.length);
    return new File(getCustomPokemonImagesDirectory(), filename).uri;
  }

  return imageUri;
}

export async function persistCustomPokemonImage(
  sourceUri: string | null,
  pokemonId: string,
): Promise<string | null> {
  if (!sourceUri) {
    return null;
  }

  const directory = getCustomPokemonImagesDirectory();
  if (sourceUri.startsWith(directory.uri)) {
    return toStoredCustomPokemonImagePath(sourceUri);
  }

  const source = new File(sourceUri);
  const destination = new File(
    directory,
    `${pokemonId}-${Date.now()}${getImageExtension(sourceUri)}`,
  );

  await source.copy(destination, { overwrite: true });
  return toStoredCustomPokemonImagePath(destination.uri);
}
