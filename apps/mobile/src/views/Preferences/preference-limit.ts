export const normalizePreferenceLimit = (
  value: number | null | undefined,
  max: number,
) => (typeof value === "number" && value >= max ? null : value);
