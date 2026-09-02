import { isReferralId, isReferralRef } from "@pegada/shared/utils/referral";

/**
 * What a link carries. `ref` is a user id when the app generated the link and
 * a channel token (`ig`) when a human wrote it into a profile bio; the server
 * resolves which. `referredDogId` is only present on a dog card link.
 */
export type Referral = {
  ref: string;
  referredDogId?: string;
};

/**
 * The hosts a Pegada link can legitimately arrive on. Anything else is some
 * other site's URL that happens to have a `ref` on it, and attributing a
 * signup to it would put noise straight into the metric.
 */
const ALLOWED_HOSTS = new Set(["www.pegada.app", "pegada.app"]);

/** The custom scheme, registered in app.config.ts. */
const APP_SCHEME = "pegada";

type UrlParts = {
  scheme: string;
  authority: string;
  path: string;
  query: string;
};

/**
 * Split a URL by hand rather than with `new URL()`.
 *
 * React Native ships its own `URL` (Libraries/Blob/URL.js) and it is not the
 * web one: `hostname` is a regex that only matches `^https?://`, so it returns
 * "" for `pegada://`, and `searchParams` is a stub. Written against the global,
 * this function passed every test in jest — where `URL` is node's real one —
 * and silently returned `undefined` for every deep link on the device. The
 * whole feature reads as "referrals just do not work" and nothing logs.
 *
 * `pegada://dog/<id>` puts "dog" in the authority and the id in the path;
 * `pegada:///dog/<id>` puts both in the path. Both are normalised below.
 */
const splitUrl = (url: string): UrlParts | undefined => {
  const match = /^([a-z][\d+.a-z-]*):\/\/([^#/?]*)([^#?]*)(?:\?([^#]*))?/i.exec(
    url,
  );

  if (!match) return undefined;

  const [, scheme, authority, path, query] = match;

  return {
    scheme: (scheme ?? "").toLowerCase(),
    authority: (authority ?? "").toLowerCase(),
    path: path ?? "",
    query: query ?? "",
  };
};

/** One query parameter, or undefined. Percent escapes are decoded once. */
const queryValue = (query: string, name: string): string | undefined => {
  const pair = query
    .split("&")
    .find((candidate) => candidate.split("=")[0] === name);

  if (pair === undefined) return undefined;

  const separator = pair.indexOf("=");
  if (separator === -1) return "";

  try {
    return decodeURIComponent(pair.slice(separator + 1).replaceAll("+", " "));
  } catch {
    // A lone `%` from a link a chat app cut in half.
    return undefined;
  }
};

const dogIdFromPath = (path: string): string | undefined => {
  // Leading and trailing slashes vary by platform and by whether the link came
  // out of a share sheet or a browser address bar.
  const segments = path.split("/").filter(Boolean);
  const [first, second] = segments;

  if (first !== "dog") return undefined;
  return isReferralId(second) ? second : undefined;
};

/**
 * Pull the attribution out of a link the user just opened.
 *
 * Accepts anything on our own hosts or our own scheme that carries a `ref`:
 * the dog card the app shares, the store link in the Instagram bio, the plain
 * site link. The dog is optional because only one of those is a dog link, and
 * the number this feeds is "who sent them", not "what they looked at first".
 *
 * Returns `undefined` for everything else, including one of our links with no
 * `ref` on it: there is nothing to attribute, and storing a partial referral
 * would mean the next real one loses the race.
 */
export const parseReferralFromUrl = (
  url: string | null | undefined,
): Referral | undefined => {
  if (!url) return undefined;

  const parts = splitUrl(url);
  if (!parts) return undefined;

  const isAppScheme = parts.scheme === APP_SCHEME;

  if (!isAppScheme && parts.scheme !== "https") return undefined;
  if (!isAppScheme && !ALLOWED_HOSTS.has(parts.authority)) return undefined;

  const ref = queryValue(parts.query, "ref");
  if (!isReferralRef(ref)) return undefined;

  const path = isAppScheme ? `/${parts.authority}${parts.path}` : parts.path;
  const referredDogId = dogIdFromPath(path);

  return { ref, ...(referredDogId ? { referredDogId } : {}) };
};

/**
 * Put a sharer on a share link.
 *
 * Exported for the share link builder (`DogShareOptions/share-actions.ts`),
 * which calls it so every link this app hands out can be attributed. Built by
 * hand for the same reason as {@link splitUrl}: `URLSearchParams` is a stub in
 * React Native.
 */
export const withReferral = (
  shareUrl: string,
  sharerUserId: string,
): string => {
  if (!isReferralId(sharerUserId)) return shareUrl;
  if (!splitUrl(shareUrl)) return shareUrl;

  const [beforeHash = "", ...hash] = shareUrl.split("#");
  const [base = "", query = ""] = splitOnce(beforeHash, "?");

  const kept = query
    .split("&")
    .filter((pair) => pair !== "" && !pair.startsWith("ref="));

  kept.push(`ref=${sharerUserId}`);

  const rebuilt = `${base}?${kept.join("&")}`;
  return hash.length > 0 ? `${rebuilt}#${hash.join("#")}` : rebuilt;
};

const splitOnce = (value: string, separator: string): [string, string] => {
  const index = value.indexOf(separator);
  if (index === -1) return [value, ""];
  return [value.slice(0, index), value.slice(index + separator.length)];
};
