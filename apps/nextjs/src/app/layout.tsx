import "./globals.css";
import type { Metadata } from "next";

import { Epilogue } from "next/font/google";

import { Analytics } from "@vercel/analytics/react";

import { Providers } from "@/app/providers";
import { getRequestPathname, getSafeLocale } from "@/lib/get-safe-locale";
import {
  LOCALE_SEGMENTS,
  toLanguage,
  toLocalePath,
  toOpenGraphLocale,
  toRoutePath,
} from "@/lib/locales";
import { t } from "@/lib/translate";
import { cn } from "@/lib/utils";

// oxlint-disable-next-line new-cap -- next/font loaders are capitalised functions, not constructors
const epilogue = Epilogue({
  variable: "--font-epilogue",
  subsets: ["latin"],
});

/**
 * Every relative URL below (canonical, hreflang, `og:image`) is resolved
 * against this, which is what makes them absolute in the rendered `<head>` —
 * crawlers and every social scraper reject relative ones.
 */
const SITE_URL = new URL("https://www.pegada.app");

/**
 * The headline is baked into the card, so an English one under `/pt-br` shows
 * a Portuguese page behind an English preview every time the link is pasted
 * into WhatsApp. One file per locale, same as the story page's card.
 */
const OG_IMAGE_BY_LOCALE: Record<string, string> = {
  "pt-br": "/og-image-pt-br.png",
};

const OG_IMAGE_FALLBACK = "/og-image.png";

const ogImage = (locale: string) => ({
  url: OG_IMAGE_BY_LOCALE[locale] ?? OG_IMAGE_FALLBACK,
  width: 1200,
  height: 630,
});

/**
 * `public/favicon.ico` is served by convention with no `<link>` at all, which
 * leaves every non-.ico surface — Android's home screen, iOS's, the 180px
 * touch icon — to guess. Declaring the set is what makes those resolve; all
 * of it is generated from `public/logo.svg` by `scripts/generate-icons.sh`.
 */
const icons = {
  icon: [
    { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  apple: [
    { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  ],
} satisfies Metadata["icons"];

export const generateMetadata = () => {
  const locale = getSafeLocale();
  const routePath = toRoutePath(getRequestPathname());

  const canonical = toLocalePath(locale, routePath);
  const images = [{ ...ogImage(locale), alt: t("metadata.ogImageAlt") }];

  return {
    metadataBase: SITE_URL,
    title: t("metadata.title"),
    description: t("metadata.description"),
    icons,
    alternates: {
      canonical,
      languages: Object.fromEntries(
        LOCALE_SEGMENTS.map((segment) => [
          toLanguage(segment),
          toLocalePath(segment, routePath),
        ]),
      ),
    },
    // No `title`/`description` here on purpose: Next falls back to the ones
    // above, and those are overridden per route (privacy policy, terms, …).
    // Repeating them would stamp the homepage title onto every sub-page's card.
    openGraph: {
      type: "website",
      locale: toOpenGraphLocale(locale),
      siteName: "Pegada",
      url: canonical,
      images,
    },
    twitter: {
      card: "summary_large_image",
      images,
    },
    other: { "apple-itunes-app": "app-id=6450865592" },
  } satisfies Metadata;
};

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  const locale = getSafeLocale();

  return (
    <html lang={locale}>
      <Analytics />
      <body className={cn(epilogue.variable, "font-epilogue")}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
};

export default RootLayout;
