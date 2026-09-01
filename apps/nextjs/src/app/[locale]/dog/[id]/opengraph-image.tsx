import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getSafeLocale } from "@/lib/get-safe-locale";
import { t } from "@/lib/translate";

import { getDog, getDogImage, getDogTagline } from "./get-dog";

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

const [gilroyMedium, gilroySemiBold, gilroyExtraBold, logoSvg] =
  await Promise.all([
    readFile(join(FONTS_DIR, "Gilroy-Medium.ttf")),
    readFile(join(FONTS_DIR, "Gilroy-SemiBold.ttf")),
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

const photoFrameStyle = {
  width: 440,
  height: 502,
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

const logoMarkStyle = { width: 40, height: 42, display: "flex" } as const;

const fallbackLogoMarkStyle = {
  width: 108,
  height: 113,
  display: "flex",
} as const;

const wordmarkStyle = {
  fontSize: 32,
  fontWeight: 800,
  fontFamily: "Gilroy",
  color: COLORS.primary,
  display: "flex",
} as const;

const fallbackWordmarkStyle = { ...wordmarkStyle, fontSize: 56 } as const;

const nameStyle = {
  fontSize: 76,
  fontWeight: 800,
  fontFamily: "Gilroy",
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

const tagStyle = {
  display: "flex",
  marginTop: 12,
  padding: "16px 30px",
  borderRadius: 9999,
  background: `linear-gradient(135deg, #FF81BD 0%, ${COLORS.primary} 100%)`,
  color: COLORS.background,
  fontSize: 26,
  fontWeight: 600,
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

  const lng = getSafeLocale();
  const dogImage = getDogImage(dog);
  const tagline = getDogTagline(dog, lng);

  return new ImageResponse(
    <div style={containerStyle}>
      <div style={photoFrameStyle}>
        {dogImage ? (
          // oxlint-disable-next-line nextjs/no-img-element -- satori (next/og) renders its own <img>, not next/image
          <img
            src={dogImage}
            width={440}
            height={502}
            alt=""
            style={photoImgStyle}
          />
        ) : null}
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
