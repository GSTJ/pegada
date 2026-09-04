import type { OgAssets } from "@/lib/og-assets";

import { ImageResponse } from "next/og";

import { getSafeLocale } from "@/lib/get-safe-locale";
import { getOgAssets } from "@/lib/og-assets";
import { t } from "@/lib/translate";

import { getDog, getDogImage, getDogTagline } from "./get-dog";

// Explicit, not the segment default: this route reads the Gilroy font files
// off disk (`node:fs/promises`, `process.cwd()`, see `@/lib/og-assets`) and
// queries the dog via Prisma, both Node-only, so it needs the Node runtime
// rather than Edge.
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

// The lockup: the real mark (an `<img>` of `public/logo.svg`, inlined by
// `@/lib/og-assets`) next to the wordmark, in the same Gilroy ExtraBold the
// app itself sets its brand name in. Neither one alone is the logo.
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

const LogoMark = (props: { src: string | undefined; style: LogoStyle }) =>
  props.src ? (
    // oxlint-disable-next-line nextjs/no-img-element -- satori (next/og) renders its own <img>, not next/image
    <img
      src={props.src}
      width={props.style.width}
      height={props.style.height}
      alt=""
      style={props.style}
    />
  ) : null;

/** Branded card with no dog-specific data, for a missing/removed profile. */
const buildFallbackImage = ({ fonts, logoDataUri }: OgAssets) =>
  new ImageResponse(
    <div style={fallbackContainerStyle}>
      <LogoMark src={logoDataUri} style={fallbackLogoMarkStyle} />
      <div style={fallbackWordmarkStyle}>Pegada</div>
      <div style={fallbackTaglineStyle}>{t("home.title")}</div>
    </div>,
    { ...size, fonts },
  );

const Image = async ({ params }: Props) => {
  const { id } = await params;
  const [assets, dog] = await Promise.all([getOgAssets(), getDog(id)]);

  if (!dog) {
    return buildFallbackImage(assets);
  }

  const dogImage = getDogImage(dog);

  // `getDog`'s `where` already requires an approved image, so this is
  // belt and braces rather than a case that fires in practice.
  if (!dogImage) {
    return buildFallbackImage(assets);
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
          <LogoMark src={assets.logoDataUri} style={logoMarkStyle} />
          <div style={wordmarkStyle}>Pegada</div>
        </div>
        <div style={nameStyle}>{dog.name}</div>
        {tagline ? <div style={taglineStyle}>{tagline}</div> : null}
        <div style={tagStyle}>{t("dog.og.tag")}</div>
      </div>
    </div>,
    { ...size, fonts: assets.fonts },
  );
};

export default Image;
