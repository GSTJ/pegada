import sharp from "sharp";

const MAX_BYTES = 8 * 1024 * 1024;

/** Satori needs PNG/JPEG. Bound the CDN read and decode before converting. */
export const loadOgPhoto = async (
  url: string,
  width: number,
  height: number,
): Promise<string | undefined> => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (
      !response.ok ||
      Number(response.headers.get("content-length")) > MAX_BYTES
    ) {
      await response.body?.cancel();
      return undefined;
    }
    const reader = response.body?.getReader();
    if (!reader) return undefined;
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    // oxlint-disable no-await-in-loop -- Consume a bounded stream in order; parallel reads defeat the byte limit.
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        return undefined;
      }
      chunks.push(value);
    }
    // oxlint-enable no-await-in-loop
    const png = await sharp(Buffer.concat(chunks), {
      limitInputPixels: 40_000_000,
    })
      .resize(width, height, { fit: "cover" })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return undefined;
  }
};
