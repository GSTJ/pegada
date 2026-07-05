import createMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  experimental: {
    optimizeCss: true,
    // Queue consumers import native/dynamic-require packages that webpack
    // can't statically analyse — resolve them at runtime instead.
    serverComponentsExternalPackages: [
      "sharp",
      "@tensorflow/tfjs",
      "nsfwjs",
      "expo-server-sdk",
      "@vercel/queue",
      "cloudflare",
    ],
  },
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

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(withMDX(nextConfig));
