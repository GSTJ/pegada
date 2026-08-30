import { normalizePreferenceLimit } from "./preference-limit";

test("sends unlimited limits as null so the API clears them", () => {
  expect(normalizePreferenceLimit(301, 301)).toBeNull();
  expect(normalizePreferenceLimit(11, 11)).toBeNull();
  expect(normalizePreferenceLimit(300, 301)).toBe(300);
  expect(normalizePreferenceLimit(10, 11)).toBe(10);
});
