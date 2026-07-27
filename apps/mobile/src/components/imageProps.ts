import type { ImageProps, ImageSource } from "expo-image";

const DEFAULT_CACHE_POLICY = "memory-disk" as const;

type ImagePresentationProps = Pick<
  ImageProps,
  "cachePolicy" | "contentFit" | "placeholder" | "placeholderContentFit" | "source"
>;

const isBlurhashSource = (
  source: ImageProps["source"],
): source is ImageSource & { blurhash: string } =>
  typeof source === "object" &&
  source !== null &&
  !Array.isArray(source) &&
  "blurhash" in source &&
  typeof source.blurhash === "string" &&
  source.blurhash.length > 0;

/**
 * A source cannot use `uri` and `blurhash` simultaneously in Expo Image.
 * Treat Pegada's API blurhash as a placeholder and leave the real source clean.
 */
export const resolveImagePresentationProps = ({
  source,
  placeholder,
  contentFit,
  placeholderContentFit,
  cachePolicy,
}: ImagePresentationProps): ImagePresentationProps => {
  if (!isBlurhashSource(source)) {
    return {
      source,
      placeholder,
      contentFit,
      placeholderContentFit,
      cachePolicy: cachePolicy === undefined ? DEFAULT_CACHE_POLICY : cachePolicy,
    };
  }

  const { blurhash, ...imageSource } = source;
  const usesSourceBlurhash = placeholder === undefined;

  return {
    source: imageSource,
    placeholder: usesSourceBlurhash ? { blurhash } : placeholder,
    contentFit,
    placeholderContentFit:
      placeholderContentFit ?? (usesSourceBlurhash ? (contentFit ?? "cover") : undefined),
    cachePolicy: cachePolicy === undefined ? DEFAULT_CACHE_POLICY : cachePolicy,
  };
};
