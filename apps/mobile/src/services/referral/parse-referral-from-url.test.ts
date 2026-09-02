import { parseReferralFromUrl, withReferral } from "./parse-referral-from-url";

/**
 * The device has no usable `URL`.
 *
 * React Native ships its own (Libraries/Blob/URL.js): `hostname` is a regex
 * that only matches `^https?://`, and `searchParams` is a stub. A parser
 * written against the global passes every test in here, where jest supplies
 * node's real one, and returns `undefined` for every deep link on a phone.
 * Removing both globals for the whole suite is what makes these tests run
 * against the same thing the app runs against.
 */
const globals = globalThis as { URL?: unknown; URLSearchParams?: unknown };
const realUrl = globals.URL;
const realSearchParams = globals.URLSearchParams;

beforeAll(() => {
  delete globals.URL;
  delete globals.URLSearchParams;
});

afterAll(() => {
  globals.URL = realUrl;
  globals.URLSearchParams = realSearchParams;
});

const SHARER = "cms9es4dr0001wbmv1a2b3c4d";
const DOG = "cms9es4ht0005wbmvmjg1okvo";

describe("parseReferralFromUrl", () => {
  it.each([
    `https://www.pegada.app/dog/${DOG}?ref=${SHARER}`,
    `https://pegada.app/dog/${DOG}?ref=${SHARER}`,
    `https://www.pegada.app/dog/${DOG}/?ref=${SHARER}`,
    `pegada://dog/${DOG}?ref=${SHARER}`,
    `pegada:///dog/${DOG}?ref=${SHARER}`,
    // Real links come back from chat apps with their own tracking on them.
    `https://www.pegada.app/dog/${DOG}?utm_source=whatsapp&ref=${SHARER}`,
  ])("reads the sharer and the dog out of %s", (url) => {
    expect(parseReferralFromUrl(url)).toStrictEqual({
      ref: SHARER,
      referredDogId: DOG,
    });
  });

  it.each([
    // The Instagram bio link, and the rest of the site carrying the same token.
    "https://www.pegada.app/store?ref=ig",
    "https://www.pegada.app/?ref=ig",
    "https://pegada.app?ref=ig",
    "pegada://dog/mangled?ref=ig",
  ])("reads a channel token with no dog out of %s", (url) => {
    expect(parseReferralFromUrl(url)).toStrictEqual({ ref: "ig" });
  });

  it.each([
    ["nothing was opened", undefined],
    ["the link is empty", ""],
    ["the link is not a URL", `dog/${DOG}?ref=${SHARER}`],
    // The whole point of the host check: any page anywhere can put `?ref=` on
    // a `/dog/` path, and an attributed signup has to mean something.
    [
      "the host is not ours",
      `https://pegada.app.evil.com/dog/${DOG}?ref=${SHARER}`,
    ],
    [
      "the scheme is not ours",
      `http://www.pegada.app/dog/${DOG}?ref=${SHARER}`,
    ],
    ["there is no ref", `https://www.pegada.app/dog/${DOG}`],
    ["the ref is empty", `https://www.pegada.app/dog/${DOG}?ref=`],
    ["the ref is a single character", "https://www.pegada.app/?ref=a"],
    [
      "the ref is too long",
      `https://www.pegada.app/dog/${DOG}?ref=${"a".repeat(33)}`,
    ],
    [
      "the ref carries a path traversal",
      `https://www.pegada.app/dog/${DOG}?ref=../../admin`,
    ],
    ["the ref carries a space", "https://www.pegada.app/?ref=some%20thing"],
  ])("returns nothing when %s", (_reason, url) => {
    expect(parseReferralFromUrl(url)).toBeUndefined();
  });

  it("keeps the sharer when the dog id is unreadable", () => {
    // Who shared it is the number; which dog is the detail. A link mangled in
    // the middle should still be attributed.
    expect(
      parseReferralFromUrl(
        `https://www.pegada.app/dog/NOT-AN-ID?ref=${SHARER}`,
      ),
    ).toStrictEqual({ ref: SHARER });
  });
});

describe("withReferral", () => {
  it("appends the sharer to a share link", () => {
    expect(withReferral(`https://www.pegada.app/dog/${DOG}`, SHARER)).toBe(
      `https://www.pegada.app/dog/${DOG}?ref=${SHARER}`,
    );
  });

  it("round-trips through the parser", () => {
    expect(
      parseReferralFromUrl(
        withReferral(`https://www.pegada.app/dog/${DOG}`, SHARER),
      ),
    ).toStrictEqual({ ref: SHARER, referredDogId: DOG });
  });

  it("replaces a ref that is already there instead of adding a second", () => {
    const link = withReferral(
      `https://www.pegada.app/dog/${DOG}?ref=${DOG}`,
      SHARER,
    );

    expect(link).toBe(`https://www.pegada.app/dog/${DOG}?ref=${SHARER}`);
  });

  it("hands back the link untouched when there is no usable sharer", () => {
    const link = `https://www.pegada.app/dog/${DOG}`;

    // A channel token is not a sharer: the app only ever puts a real user id
    // on a link it generates.
    expect(withReferral(link, "")).toBe(link);
    expect(withReferral(link, "ig")).toBe(link);
    expect(withReferral(link, "not-an-id")).toBe(link);
  });
});
