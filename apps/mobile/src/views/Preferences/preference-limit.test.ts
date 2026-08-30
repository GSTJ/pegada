import { normalizePreferenceLimit } from "./preference-limit";

test("sends unlimited limits as null so the API clears them", () => {
  expect(normalizePreferenceLimit(301, 300)).toBeNull();
  expect(normalizePreferenceLimit(10, 10)).toBeNull();
  expect(normalizePreferenceLimit(295, 300)).toBe(295);
});
