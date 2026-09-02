import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getSafeLocale } from "@/lib/get-safe-locale";
import { t } from "@/lib/translate";

import { getDog, getDogImage, getDogTagline } from "./get-dog";

// Explicit, not the segment default: this route reads the Gilroy font files
// off disk (`node:fs/promises`, `process.cwd()`) and queries the dog via
// Prisma, both Node-only, so it needs the Node runtime rather than Edge.
export const runtime = "nodejs";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Same brand tokens as `@pegada/shared/themes/themes` (`LightTheme.colors`),
// converted to hex: satori renders these outside Tailwind/PostCSS, so the CSS
// vars/utility classes the rest of the app uses aren't available here.
const COLORS = {
  primary: "#EF62A1",
  secondary: "#FDE8F1",
  background: "#FFFFFF",
  text: "#0F172A",
  subtitle: "#5A5F6D",
};

// Read once at module scope, same as the docs example for `ImageResponse`
// fonts (`readFile` + `process.cwd()`), not per-request: font data never
// changes between requests. `process.cwd()` is `apps/nextjs` in both `next
// dev` and `next build`/the deployed function, so two `..` reaches the repo
// root and into the same `packages/shared/themes/fonts` the app itself
// loads its Gilroy weights from.
const FONTS_DIR = join(
  process.cwd(),
  "..",
  "..",
  "packages",
  "shared",
  "themes",
  "fonts",
);

const LOGO_PATH = join(process.cwd(), "public", "logo.svg");

const [gilroyMedium, gilroySemiBold, gilroyBold, gilroyExtraBold, logoSvg] =
  await Promise.all([
    readFile(join(FONTS_DIR, "Gilroy-Medium.ttf")),
    readFile(join(FONTS_DIR, "Gilroy-SemiBold.ttf")),
    readFile(join(FONTS_DIR, "Gilroy-Bold.ttf")),
    readFile(join(FONTS_DIR, "Gilroy-ExtraBold.ttf")),
    readFile(LOGO_PATH, "utf8"),
  ]);

// Satori (`next/og`'s renderer) only reliably draws an `<img>` from a data
// URI, not an arbitrary `src` path — the actual brand mark
// (`public/logo.svg`, the heart-shaped paw), inlined this way, is what makes
// this a logo instead of the word "Pegada" set in a font.
const logoBase64 = Buffer.from(logoSvg).toString("base64");
const LOGO_DATA_URI = `data:image/svg+xml;base64,${logoBase64}`;

const OG_FONTS = [
  { name: "Gilroy", data: gilroyMedium, weight: 500, style: "normal" },
  { name: "Gilroy", data: gilroySemiBold, weight: 600, style: "normal" },
  { name: "Gilroy", data: gilroyBold, weight: 700, style: "normal" },
  { name: "Gilroy", data: gilroyExtraBold, weight: 800, style: "normal" },
] satisfies NonNullable<
  ConstructorParameters<typeof ImageResponse>[1]
>["fonts"];

// Hoisted to module scope, not inlined in JSX: every value below is static
// (only the text nodes vary per dog), so building these once avoids a fresh
// object per render for no reason — same object, every time.
const containerStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  gap: 56,
  padding: 64,
  background: `linear-gradient(135deg, ${COLORS.secondary} 0%, ${COLORS.background} 70%)`,
} as const;

const fallbackContainerStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 20,
  background: `linear-gradient(135deg, ${COLORS.secondary} 0%, ${COLORS.background} 65%)`,
} as const;

/**
 * The photo is rotated, which means the box it occupies is bigger than the box
 * it is laid out in: a 3 degree turn on a 420x478 frame swings the corners out
 * to 444x499. Sized and offset so that swung box lands inside the container's
 * 64px padding instead of over it. At 440x502 with no offset the frame drew
 * 53px from the left edge and 54px from the bottom, so the padding in the code
 * was not the padding on the card.
 */
const PHOTO_WIDTH = 420;
const PHOTO_HEIGHT = 478;

const photoFrameStyle = {
  width: PHOTO_WIDTH,
  height: PHOTO_HEIGHT,
  marginLeft: 13,
  borderRadius: 32,
  overflow: "hidden",
  display: "flex",
  flexShrink: 0,
  transform: "rotate(-3deg)",
  boxShadow: "0 24px 48px rgba(15, 23, 42, 0.25)",
  border: `10px solid ${COLORS.background}`,
  background: COLORS.secondary,
} as const;

const photoImgStyle = { objectFit: "cover" } as const;

const detailsStyle = {
  display: "flex",
  flexDirection: "column",
  gap: 20,
  flex: 1,
} as const;

// The lockup: the real mark (an `<img>` of `public/logo.svg`, see
// `LOGO_DATA_URI` above) next to the wordmark, in the same Gilroy ExtraBold
// the app itself sets its brand name in. Neither one alone is the logo.
const brandRowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 12,
} as const;

/**
 * Sized against the wordmark's caps rather than against its whole line box.
 * The row centres both children on their layout boxes, and a text box runs
 * from ascender to descender, so a mark centred that way floats above the
 * letters it is meant to sit beside: measured 4px high, on a mark whose ink
 * was 42px tall against a 22px cap height. Smaller, and nudged down by the
 * difference.
 */
const logoMarkStyle = {
  width: 32,
  height: 34,
  marginTop: 5,
  display: "flex",
} as const;

const fallbackLogoMarkStyle = {
  width: 108,
  height: 113,
  display: "flex",
} as const;

const wordmarkStyle = {
  fontSize: 32,
  fontWeight: 800,
  fontFamily: "Gilroy",
  // Gilroy ExtraBold sets loose at display sizes. Small negative values here
  // and on the name below, in the same proportion the app's own story cards
  // use, so the two read as the same typography.
  letterSpacing: -0.4,
  color: COLORS.primary,
  display: "flex",
} as const;

const fallbackWordmarkStyle = { ...wordmarkStyle, fontSize: 56 } as const;

const nameStyle = {
  fontSize: 76,
  fontWeight: 800,
  fontFamily: "Gilroy",
  letterSpacing: -1.5,
  color: COLORS.text,
  lineHeight: 1.05,
  display: "flex",
} as const;

const taglineStyle = {
  fontSize: 34,
  fontWeight: 500,
  fontFamily: "Gilroy",
  color: COLORS.subtitle,
  display: "flex",
} as const;

const fallbackTaglineStyle = { ...taglineStyle, fontSize: 30 } as const;

// Matches the app's primary button (`apps/mobile/src/components/button`:
// flat `theme.colors.primary` fill, white text, Gilroy Bold) rather than a
// bespoke badge, per Gabriel's review note. Padding/height are scaled up
// from the button's own 68px-tall, 16px-padded footprint to read as a real
// button at this canvas's size instead of a small pill.
const tagStyle = {
  display: "flex",
  marginTop: 12,
  // A filled shape and a line of type do not line up on the same number: the
  // fill has a hard edge where the type has a side bearing. Without this the
  // button started 5px left of the name above it.
  marginLeft: 3,
  padding: "20px 40px",
  borderRadius: 9999,
  background: COLORS.primary,
  color: COLORS.background,
  fontSize: 28,
  fontWeight: 700,
  fontFamily: "Gilroy",
  alignSelf: "flex-start",
} as const;

type Props = {
  params: Promise<{ id: string }>;
};

type LogoStyle = { width: number; height: number; display: "flex" };

const LogoMark = (props: { style: LogoStyle }) => (
  // oxlint-disable-next-line nextjs/no-img-element -- satori (next/og) renders its own <img>, not next/image
  <img
    src={LOGO_DATA_URI}
    width={props.style.width}
    height={props.style.height}
    alt=""
    style={props.style}
  />
);

/** Branded card with no dog-specific data, for a missing/removed profile. */
const buildFallbackImage = () =>
  new ImageResponse(
    <div style={fallbackContainerStyle}>
      <LogoMark style={fallbackLogoMarkStyle} />
      <div style={fallbackWordmarkStyle}>Pegada</div>
      <div style={fallbackTaglineStyle}>{t("home.title")}</div>
    </div>,
    { ...size, fonts: OG_FONTS },
  );

const Image = async ({ params }: Props) => {
  const { id } = await params;
  const dog = await getDog(id);

  if (!dog) {
    return buildFallbackImage();
  }

  const dogImage = getDogImage(dog);

  // `getDog`'s `where` already requires an approved image, so this is
  // belt and braces rather than a case that fires in practice.
  if (!dogImage) {
    return buildFallbackImage();
  }

  const lng = getSafeLocale();
  const tagline = getDogTagline(dog, lng);

  return new ImageResponse(
    <div style={containerStyle}>
      <div style={photoFrameStyle}>
        {/* oxlint-disable-next-line nextjs/no-img-element -- satori (next/og) renders its own <img>, not next/image */}
        <img
          src={dogImage}
          width={PHOTO_WIDTH}
          height={PHOTO_HEIGHT}
          alt=""
          style={photoImgStyle}
        />
      </div>

      <div style={detailsStyle}>
        <div style={brandRowStyle}>
          <LogoMark style={logoMarkStyle} />
          <div style={wordmarkStyle}>Pegada</div>
        </div>
        <div style={nameStyle}>{dog.name}</div>
        {tagline ? <div style={taglineStyle}>{tagline}</div> : null}
        <div style={tagStyle}>{t("dog.og.tag")}</div>
      </div>
    </div>,
    { ...size, fonts: OG_FONTS },
  );
};

export default Image;
