/**
 * `ShareableDog["gender"]` is `string`, not the `DOG_GENDERS` union, so a
 * malformed or future value degrades to the masculine form rather than
 * throwing — pt-BR defaults to masculine when gender is unknown, same as
 * the rest of the app's copy.
 */
export const pickByGender = <T>(gender: string, male: T, female: T): T =>
  gender === "FEMALE" ? female : male;

/**
 * Deterministic pick from a list, seeded by a stable string (the dog's id).
 * Two shares of the same dog land on the same line — no flicker between a
 * capture retry — while different dogs still spread across the options.
 */
export const pickByHash = <T>(items: readonly T[], seed: string): T => {
  let hash = 0;
  for (const char of seed) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 2147483647;
  }
  return items[Math.abs(hash) % items.length] as T;
};
