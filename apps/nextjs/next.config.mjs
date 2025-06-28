import createMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  experimental: {
    optimizeCss: true
  },
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: ["@pegada/api", "@pegada/shared", "@pegada/database"],
  pageExtensions: ["js", "jsx", "ts", "tsx"],
  webpack: (config) => {
    config.module.rules.push({
      test: /\.hbs$/,
      loader: "handlebars-loader",
      options: {
        precompileOptions: {
          knownHelpersOnly: false
        }
      }
    });
    return config;
  },

  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true }
};

const withMDX = createMDX({
  extension: /\.mdx?$/
});

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(withMDX(nextConfig));
