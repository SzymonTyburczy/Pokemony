export const pokemonQueryKeys = {
  all: ["pokemon"] as const,
  details: (name: string) =>
    [...pokemonQueryKeys.all, "details", name] as const,
  list: () => [...pokemonQueryKeys.all, "list"] as const,
  searchIndex: () => [...pokemonQueryKeys.all, "search-index"] as const,
  cryIds: () => [...pokemonQueryKeys.all, "cry-ids"] as const,
  threeDIndex: () => [...pokemonQueryKeys.all, "3d-index"] as const,
};
