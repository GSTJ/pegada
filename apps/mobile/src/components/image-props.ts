import type { ImageProps, ImageSource } from "expo-image";

const DEFAULT_CACHE_POLICY = "memory-disk" as const;

/**
 * Crossfade length for a photo arriving over the network, in ms.
 *
 * Expo Image defaults `transition` to none, so a remote photo replaced its
 * blurhash in a single frame — a hard cut on the swipe deck, the dog profile,
 * the messages list and the new-match screen, several times a session. 200 ms
 * is the same duration the rest of the app already uses for short UI motion
 * (the card pagination dot, the map's region ease).
 */
const DEFAULT_REMOTE_TRANSITION = 200;

type ImagePresentationProps = Pick<
  ImageProps,
  | "cachePolicy"
  | "contentFit"
  | "placeholder"
  | "placeholderContentFit"
  | "source"
  | "transition"
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
 * Only network photos get the default crossfade.
 *
 * A bundled asset (`require(...)`) is already decoded by the time the view
 * mounts, so fading it in would add motion where there is currently none —
 * visible on the UpgradeWall hero, the Match wordmarks and the emoji. A
 * `file://` picked photo is likewise instant. Neither is the hard cut this
 * default exists to remove.
 */
const isRemoteSource = (source: ImageProps["source"]): boolean => {
  if (typeof source === "string") return /^https?:/.test(source);
  if (Array.isArray(source)) return source.some((item) => isRemoteSource(item));
  // Not `source.uri`: the union also holds a `SharedRef<"image">`, which has
  // no `uri` at all.
  if (typeof source !== "object" || source === null || !("uri" in source)) {
    return false;
  }

  return typeof source.uri === "string" && /^https?:/.test(source.uri);
};

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
  transition,
}: ImagePresentationProps): ImagePresentationProps => {
  const resolvedCachePolicy =
    cachePolicy === undefined ? DEFAULT_CACHE_POLICY : cachePolicy;
  const resolvedTransition =
    transition === undefined && isRemoteSource(source)
      ? DEFAULT_REMOTE_TRANSITION
      : transition;

  if (!isBlurhashSource(source)) {
    return {
      source,
      placeholder,
      contentFit,
      placeholderContentFit,
      cachePolicy: resolvedCachePolicy,
      transition: resolvedTransition,
    };
  }

  const { blurhash, ...imageSource } = source;
  const usesSourceBlurhash = placeholder === undefined;

  return {
    source: imageSource,
    placeholder: usesSourceBlurhash ? { blurhash } : placeholder,
    contentFit,
    placeholderContentFit:
      placeholderContentFit ??
      (usesSourceBlurhash ? (contentFit ?? "cover") : undefined),
    cachePolicy: resolvedCachePolicy,
    transition: resolvedTransition,
  };
};
