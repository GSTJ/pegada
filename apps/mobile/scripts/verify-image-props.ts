import assert from "node:assert/strict";
import type { ComponentProps } from "react";

import type { Image } from "../src/components/Image";
import { resolveImagePresentationProps } from "../src/components/imageProps";

const blurhash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";

const supportedImageProps = {
  source: { uri: "https://images.pegada.app/luna.webp", blurhash },
  contentFit: "contain",
  contentPosition: "top",
  transition: 180,
  recyclingKey: "luna-photo-1",
  onDisplay: () => undefined,
  onLoad: () => undefined,
} satisfies ComponentProps<typeof Image>;

void supportedImageProps;

const resolvedRemoteImage = resolveImagePresentationProps({
  source: { uri: "https://images.pegada.app/luna.webp", blurhash },
  contentFit: "contain",
});

assert.deepEqual(resolvedRemoteImage, {
  source: { uri: "https://images.pegada.app/luna.webp" },
  placeholder: { blurhash },
  contentFit: "contain",
  placeholderContentFit: "contain",
  cachePolicy: "memory-disk",
});

const explicitPlaceholder = { uri: "file:///placeholder.webp" };
assert.deepEqual(
  resolveImagePresentationProps({
    source: { uri: "https://images.pegada.app/luna.webp", blurhash },
    placeholder: explicitPlaceholder,
    placeholderContentFit: "scale-down",
    cachePolicy: "disk",
  }),
  {
    source: { uri: "https://images.pegada.app/luna.webp" },
    placeholder: explicitPlaceholder,
    contentFit: undefined,
    placeholderContentFit: "scale-down",
    cachePolicy: "disk",
  },
);

assert.deepEqual(
  resolveImagePresentationProps({
    source: { uri: "https://images.pegada.app/luna.webp", blurhash },
    placeholder: null,
    cachePolicy: null,
  }),
  {
    source: { uri: "https://images.pegada.app/luna.webp" },
    placeholder: null,
    contentFit: undefined,
    placeholderContentFit: undefined,
    cachePolicy: null,
  },
);

for (const source of [42, "https://images.pegada.app/static.webp", null] as const) {
  assert.deepEqual(resolveImagePresentationProps({ source }), {
    source,
    placeholder: undefined,
    contentFit: undefined,
    placeholderContentFit: undefined,
    cachePolicy: "memory-disk",
  });
}

const responsiveSources = [
  { uri: "https://images.pegada.app/luna-small.webp", width: 320 },
  { uri: "https://images.pegada.app/luna-large.webp", width: 1280 },
];
assert.deepEqual(resolveImagePresentationProps({ source: responsiveSources }), {
  source: responsiveSources,
  placeholder: undefined,
  contentFit: undefined,
  placeholderContentFit: undefined,
  cachePolicy: "memory-disk",
});

process.stdout.write("verify:image-props PASS\n");
