import createMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  experimental: {
    optimizeCss: true,
  },

  images: {
    /**
     * Next 15 only serves qualities named here. The hero is the LCP element
     * and the only optimised image on the site; at the default 75 the
     * optimiser's re-encode of an already-encoded WebP source costs about
     * 1.6x the structural error of 90 for ~40KB, which is the wrong trade
     * for the one image the page is about.
     */
    qualities: [90],
  },
  // Queue consumers import native/dynamic-require packages that webpack
  // can't statically analyse — resolve them at runtime instead.
  serverExternalPackages: [
    "sharp",
    "@tensorflow/tfjs",
    "nsfwjs",
    "expo-server-sdk",
    "@vercel/queue",
    "cloudflare",
  ],
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: ["@pegada/api", "@pegada/shared", "@pegada/database"],
  pageExtensions: ["js", "jsx", "ts", "tsx"],

  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

const withNextIntl = createNextIntlPlugin("./i18n.ts");

export default withNextIntl(withMDX(nextConfig));
