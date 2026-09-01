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
  gap: 24,
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

const wordmarkStyle = {
  fontSize: 36,
  fontWeight: 800,
  color: COLORS.primary,
  display: "flex",
} as const;

const fallbackWordmarkStyle = { ...wordmarkStyle, fontSize: 72 } as const;

const nameStyle = {
  fontSize: 76,
  fontWeight: 800,
  color: COLORS.text,
  lineHeight: 1.05,
  display: "flex",
} as const;

const taglineStyle = {
  fontSize: 34,
  color: COLORS.subtitle,
  display: "flex",
} as const;

const fallbackTaglineStyle = { ...taglineStyle, fontSize: 32 } as const;

const tagStyle = {
  display: "flex",
  marginTop: 12,
  padding: "14px 28px",
  borderRadius: 9999,
  background: COLORS.primary,
  color: COLORS.background,
  fontSize: 26,
  fontWeight: 600,
  alignSelf: "flex-start",
} as const;

type Props = {
  params: Promise<{ id: string }>;
};

/** Branded card with no dog-specific data, for a missing/removed profile. */
const buildFallbackImage = () =>
  new ImageResponse(
    (
      <div style={fallbackContainerStyle}>
        <div style={fallbackWordmarkStyle}>Pegada</div>
        <div style={fallbackTaglineStyle}>{t("home.title")}</div>
      </div>
    ),
    size,
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
    (
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
          <div style={wordmarkStyle}>Pegada</div>
          <div style={nameStyle}>{dog.name}</div>
          {tagline ? <div style={taglineStyle}>{tagline}</div> : null}
          <div style={tagStyle}>{t("dog.og.tag")}</div>
        </div>
      </div>
    ),
    size,
  );
};

export default Image;
