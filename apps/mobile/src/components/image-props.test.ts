import type { Image } from "./image";

import type { ComponentProps } from "react";

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
  expect(resolveImagePresentationProps(forwardedProps)).toStrictEqual({
    source: { uri },
    placeholder: { blurhash },
    contentFit: "contain",
    placeholderContentFit: "contain",
    cachePolicy: "memory-disk",
    transition: 180,
  });
});

test("defaults the blurhash fit to cover when the caller sets no contentFit", () => {
  expect(
    resolveImagePresentationProps({ source: { uri, blurhash } }),
  ).toStrictEqual({
    source: { uri },
    placeholder: { blurhash },
    contentFit: undefined,
    placeholderContentFit: "cover",
    cachePolicy: "memory-disk",
    transition: 200,
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
  ).toStrictEqual({
    source: { uri },
    placeholder,
    contentFit: undefined,
    placeholderContentFit: "scale-down",
    cachePolicy: "disk",
    transition: 200,
  });
});

test("treats an explicit null placeholder and cache policy as opting out", () => {
  expect(
    resolveImagePresentationProps({
      source: { uri, blurhash },
      placeholder: null,
      cachePolicy: null,
    }),
  ).toStrictEqual({
    source: { uri },
    placeholder: null,
    contentFit: undefined,
    placeholderContentFit: undefined,
    cachePolicy: null,
    transition: 200,
  });
});

test.each([
  [42, undefined],
  ["https://images.pegada.app/static.webp", 200],
  [null, undefined],
] as const)("passes a %p source straight through", (source, transition) => {
  expect(resolveImagePresentationProps({ source })).toStrictEqual({
    source,
    placeholder: undefined,
    contentFit: undefined,
    placeholderContentFit: undefined,
    cachePolicy: "memory-disk",
    transition,
  });
});

test("passes a responsive source array straight through", () => {
  const source = [
    { uri: "https://images.pegada.app/luna-small.webp", width: 320 },
    { uri: "https://images.pegada.app/luna-large.webp", width: 1280 },
  ];

  expect(resolveImagePresentationProps({ source })).toStrictEqual({
    source,
    placeholder: undefined,
    contentFit: undefined,
    placeholderContentFit: undefined,
    cachePolicy: "memory-disk",
    transition: 200,
  });
});

describe("default crossfade", () => {
  it("gives a network photo the 200 ms default", () => {
    expect(resolveImagePresentationProps({ source: { uri } }).transition).toBe(
      200,
    );
    expect(
      resolveImagePresentationProps({ source: { uri, blurhash } }).transition,
    ).toBe(200);
  });

  it("leaves bundled and local sources with no transition at all", () => {
    // require("...") resolves to a number; a picked photo is file://.
    expect(
      resolveImagePresentationProps({ source: 42 }).transition,
    ).toBeUndefined();
    expect(
      resolveImagePresentationProps({ source: { uri: "file:///picked.jpg" } })
        .transition,
    ).toBeUndefined();
    expect(
      resolveImagePresentationProps({ source: undefined }).transition,
    ).toBeUndefined();
  });

  it("never overrides a caller's own transition, including 0", () => {
    expect(
      resolveImagePresentationProps({ source: { uri }, transition: 0 })
        .transition,
    ).toBe(0);
    expect(
      resolveImagePresentationProps({ source: { uri }, transition: null })
        .transition,
    ).toBeNull();
    expect(
      resolveImagePresentationProps({
        source: { uri },
        transition: { duration: 400, effect: "cross-dissolve" },
      }).transition,
    ).toStrictEqual({ duration: 400, effect: "cross-dissolve" });
  });
});
