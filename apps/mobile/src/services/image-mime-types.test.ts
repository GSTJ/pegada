import { getMimeType } from "./get-mime-type";
import { lookupImageMimeType } from "./image-mime-types";

/**
 * Every expectation here was recorded from `mime.lookup` in
 * `react-native-mime-types@2.5.0` before it was removed, so this file is the
 * parity contract for that swap rather than a fresh opinion about MIME types.
 */
describe("lookupImageMimeType", () => {
  it.each([
    ["a.jpg", "image/jpeg"],
    ["a.jpeg", "image/jpeg"],
    ["a.png", "image/png"],
    ["a.webp", "image/webp"],
    ["a.gif", "image/gif"],
    ["a.heic", "image/heic"],
    ["a.heif", "image/heif"],
    ["a.bmp", "image/bmp"],
    ["a.tif", "image/tiff"],
    ["a.tiff", "image/tiff"],
    ["a.avif", "image/avif"],
  ])("resolves %s to %s", (fileName, expected) => {
    expect(lookupImageMimeType(fileName)).toBe(expected);
  });

  it("is case-insensitive, as mime.lookup was", () => {
    expect(lookupImageMimeType("a.JPG")).toBe("image/jpeg");
    expect(lookupImageMimeType("a.JPEG")).toBe("image/jpeg");
    expect(lookupImageMimeType("a.PNG")).toBe("image/png");
  });

  it("takes everything after the last dot, so a bare .jpg resolves", () => {
    expect(lookupImageMimeType(".jpg")).toBe("image/jpeg");
    expect(lookupImageMimeType("a.b.jpg")).toBe("image/jpeg");
    expect(lookupImageMimeType("/x/y/a.png")).toBe("image/png");
  });

  it("returns false for the cases mime.lookup also refused", () => {
    // No dot at all, an empty extension, and a query string glued to the
    // extension — mime.lookup returned false for all three.
    expect(lookupImageMimeType("abc")).toBe(false);
    expect(lookupImageMimeType("a.")).toBe(false);
    expect(lookupImageMimeType("a.webp?x=1")).toBe(false);
    expect(lookupImageMimeType("")).toBe(false);
  });

  it("does not answer for non-image types it never needed to", () => {
    expect(lookupImageMimeType("a.mp4")).toBe(false);
    expect(lookupImageMimeType("a.svg")).toBe(false);
  });
});

describe("getMimeType", () => {
  it("resolves the WebP the upload path always produces", () => {
    expect(getMimeType("file:///var/tmp/ImageManipulator/abc.webp")).toBe(
      "image/webp",
    );
  });

  it("prefers the asset uri, then its fileName, then its declared type", () => {
    expect(getMimeType({ uri: "x/a.png", fileName: "a.jpg" } as never)).toBe(
      "image/png",
    );
    expect(getMimeType({ uri: "x/unknown", fileName: "a.jpg" } as never)).toBe(
      "image/jpeg",
    );
    expect(
      getMimeType({
        uri: "x/unknown",
        fileName: "b",
        type: "image/png",
      } as never),
    ).toBe("image/png");
  });

  it("throws when nothing resolves, as before", () => {
    expect(() => getMimeType("file:///var/tmp/nope")).toThrow(
      "File mime type is not defined",
    );
    expect(() => getMimeType({ uri: "x/nope" } as never)).toThrow(
      "File mime type is not defined",
    );
  });
});
