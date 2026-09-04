import type { ImageResponse } from "next/og";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * The Gilroy weights and the brand mark that `opengraph-image.tsx` draws,
 * read off disk rather than imported: satori renders outside the bundler, so
 * `next/font` (which is what the pages themselves use, `src/lib/fonts.ts`)
 * has nothing to hand it.
 *
 * `process.cwd()` is `apps/nextjs` in `next dev`, in `next build` and in the
 * deployed function, so two `..` reaches the repo root and the same
 * `packages/shared/themes/fonts` the app loads its own Gilroy from.
 *
 * Nothing about that makes the files a build dependency. The paths are built
 * at runtime, webpack never sees them, and the function Vercel deploys ships
 * without them unless `outputFileTracingIncludes` in `next.config.mjs` names
 * them: building with that entry removed drops every `Gilroy-*.ttf` and
 * `logo.svg` out of the route's `.nft.json`, and the deployed route then
 * answers `ENOENT: no such file or directory, open
 * '/var/task/packages/shared/themes/fonts/Gilroy-Medium.ttf'`.
 *
 * The other way round is to let the bundler trace the file itself, with `new
 * URL("./Gilroy-Medium.ttf", import.meta.url)`. That does not build here:
 * webpack rewrites it into its own relative-URL shim, and `fileURLToPath`
 * rejects the shim with `The "path" argument must be of type string or an
 * instance of URL. Received an instance of URL`.
 *
 * So the config entry is the mechanism, and `tests/og-image-assets.test.mjs`
 * is what keeps its route key and these paths from drifting apart.
 */
const FONTS_DIR = join(
  process.cwd(),
  "..",
  "..",
  "packages",
  "shared",
  "themes",
  "fonts",
);

/**
 * The card sets medium on the tagline, bold on the tag and extrabold on the
 * wordmark and the dog's name. Semibold is loaded with them so a line of copy
 * can move to that step without also losing its face.
 */
const FONTS = (
  [
    { file: "Gilroy-Medium.ttf", weight: 500 },
    { file: "Gilroy-SemiBold.ttf", weight: 600 },
    { file: "Gilroy-Bold.ttf", weight: 700 },
    { file: "Gilroy-ExtraBold.ttf", weight: 800 },
  ] as const
).map(({ file, weight }) => ({ path: join(FONTS_DIR, file), weight }));

/** Every file the OG image routes open, for the tracing test to check. */
export const OG_FONT_PATHS = FONTS.map(({ path }) => path);
export const OG_LOGO_PATH = join(process.cwd(), "public", "logo.svg");

type OgFonts = NonNullable<
  ConstructorParameters<typeof ImageResponse>[1]
>["fonts"];

export type OgAssets = {
  /**
   * Undefined when the files could not be read, which `ImageResponse` reads
   * as "use your own bundled face" rather than as an error.
   */
  fonts: OgFonts;
  /** Undefined the same way; the card then draws without the mark. */
  logoDataUri: string | undefined;
};

/**
 * A card in the wrong font still gives the link a preview; a module that
 * fails to initialise gives the scraper a 500 and the link no preview at all,
 * which is the whole reason the image exists. So a read that fails costs the
 * card that one asset and nothing else. Logged, so a tracing regression still
 * surfaces as an exception instead of going quiet.
 */
const readOrSkip = async <T>(what: string, read: () => Promise<T>) => {
  try {
    return await read();
  } catch (error) {
    // oxlint-disable-next-line no-console -- The only report a tracing regression gets; Vercel collects it as an exception.
    console.error(`Could not read ${what} for the OG image`, error);

    return undefined;
  }
};

const readFonts = () =>
  readOrSkip("the Gilroy weights", () =>
    Promise.all(
      FONTS.map(async ({ path, weight }) => ({
        name: "Gilroy",
        data: await readFile(path),
        weight,
        style: "normal" as const,
      })),
    ),
  );

const readLogo = () =>
  readOrSkip("the brand mark", async () => {
    const svg = await readFile(OG_LOGO_PATH, "utf8");

    // Satori only reliably draws an `<img>` from a data URI, not from an
    // arbitrary `src` path, so the real mark has to be inlined to be a logo
    // rather than the word "Pegada" set in a font.
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  });

const read = async (): Promise<OgAssets> => {
  const [fonts, logoDataUri] = await Promise.all([readFonts(), readLogo()]);

  return { fonts, logoDataUri };
};

let assets: Promise<OgAssets> | undefined;

/**
 * Read on the first request rather than at module scope: font data never
 * changes between requests, and a rejected top-level `await` would poison the
 * module for the life of the instance and report itself without a stack ("An
 * error occurred in the Server Components render").
 *
 * Only a complete read is kept. Anything less is dropped so the next request
 * tries again, since one unlucky read would otherwise cost every card served
 * by that instance its typeface until the next deploy. Requests that arrive
 * while a read is in flight share it.
 */
export const getOgAssets = async () => {
  const result = await (assets ??= read());

  if (!result.fonts || !result.logoDataUri) {
    assets = undefined;
  }

  return result;
};
