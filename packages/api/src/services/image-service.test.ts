import { createTemporaryUploadKey } from "./image-service";

describe("createTemporaryUploadKey", () => {
  it("creates distinct UUID-backed keys", () => {
    const keys = Array.from({ length: 100 }, createTemporaryUploadKey);

    expect(new Set(keys)).toHaveProperty("size", keys.length);
    for (const key of keys) {
      expect(key).toMatch(
        /^dogs-temporary\/[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/,
      );
    }
  });
});
