const GITHUB_API_URL =
  'https://api.github.com/repos/PokeAPI/cries/contents/cries/pokemon/latest';

export async function fetchAvailableCryIds(signal?: AbortSignal): Promise<Set<number>> {
  const response = await fetch(GITHUB_API_URL, { signal });
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const files = (await response.json()) as Array<{ name: string }>;
  const ids = files
    .filter((file) => file.name.endsWith('.ogg'))
    .map((file) => parseInt(file.name.replace('.ogg', ''), 10))
    .filter((id) => !Number.isNaN(id));

  return new Set(ids);
}
