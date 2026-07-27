import type { ComponentProps } from "react";

import type { Image } from "./image";
import { resolveImagePresentationProps } from "./image-props";

const blurhash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";
const uri = "https://images.pegada.app/luna.webp";

// Compiles only while Image keeps forwarding Expo Image's own props. These are
// the ones the old layout wrapper silently swallowed.
const forwardedProps = {
  source: { uri, blurhash },
  contentFit: "contain",
  contentPosition: "top",
  transition: 180,
  recyclingKey: "luna-photo-1",
  onDisplay: () => undefined,
  onLoad: () => undefined,
} satisfies ComponentProps<typeof Image>;

test("moves an API blurhash onto the placeholder and keeps the source clean", () => {
  expect(resolveImagePresentationProps(forwardedProps)).toEqual({
    source: { uri },
    placeholder: { blurhash },
    contentFit: "contain",
    placeholderContentFit: "contain",
    cachePolicy: "memory-disk",
  });
});

test("defaults the blurhash fit to cover when the caller sets no contentFit", () => {
  expect(resolveImagePresentationProps({ source: { uri, blurhash } })).toEqual({
    source: { uri },
    placeholder: { blurhash },
    contentFit: undefined,
    placeholderContentFit: "cover",
    cachePolicy: "memory-disk",
  });
});

test("leaves a caller-provided placeholder and cache policy alone", () => {
  const placeholder = { uri: "file:///placeholder.webp" };

  expect(
    resolveImagePresentationProps({
      source: { uri, blurhash },
      placeholder,
      placeholderContentFit: "scale-down",
      cachePolicy: "disk",
    }),
  ).toEqual({
    source: { uri },
    placeholder,
    contentFit: undefined,
    placeholderContentFit: "scale-down",
    cachePolicy: "disk",
  });
});

test("treats an explicit null placeholder and cache policy as opting out", () => {
  expect(
    resolveImagePresentationProps({
      source: { uri, blurhash },
      placeholder: null,
      cachePolicy: null,
    }),
  ).toEqual({
    source: { uri },
    placeholder: null,
    contentFit: undefined,
    placeholderContentFit: undefined,
    cachePolicy: null,
  });
});

test.each([42, "https://images.pegada.app/static.webp", null] as const)(
  "passes a %p source straight through",
  (source) => {
    expect(resolveImagePresentationProps({ source })).toEqual({
      source,
      placeholder: undefined,
      contentFit: undefined,
      placeholderContentFit: undefined,
      cachePolicy: "memory-disk",
    });
  },
);

test("passes a responsive source array straight through", () => {
  const source = [
    { uri: "https://images.pegada.app/luna-small.webp", width: 320 },
    { uri: "https://images.pegada.app/luna-large.webp", width: 1280 },
  ];

  expect(resolveImagePresentationProps({ source })).toEqual({
    source,
    placeholder: undefined,
    contentFit: undefined,
    placeholderContentFit: undefined,
    cachePolicy: "memory-disk",
  });
});
