import createMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Two `next dev` processes out of one checkout share `.next` and corrupt each
 * other's chunk cache. It presents as an app bug, not a tooling one: every
 * tRPC call starts answering 500 with `Cannot find module
 * './vendor-chunks/zod.js'` and the app shows "Oops - An error occurred while
 * logging in." Mid-capture that reads exactly like an auth regression
 * (.unistyles-migration/verify-r1/MATRIX-GATE.md, "Capture flakes hit on the
 * way"). The workaround so far has been to run the second server out of a
 * detached worktree, which every harness doc now has to repeat.
 *
 * Two servers on one port is impossible, so the port is already the unique
 * name each instance needs. `next dev` on the default port keeps writing to
 * `.next` so nothing about the ordinary single-server case changes; anything
 * with an explicit PORT gets its own directory.
 *
 * Dev only. `next build` and `next start` have to agree on a directory, and
 * PORT is routinely set for `start` and not for `build`.
 */
const devDistDir = () => {
  const port = process.env.PORT;

  if (process.env.NODE_ENV === "production" || !port || port === "3000") {
    return undefined;
  }

  return { distDir: `.next-${port}` };
};

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  ...devDistDir(),

  experimental: {
    optimizeCss: true,
  },

  images: {
    // Next 15 only serves qualities named here. Keep the LCP hero at 90 and
    // use 75 for the lazy-loaded screenshot gallery.
    qualities: [75, 90],
  },

  // `opengraph-image.tsx` reads Gilroy TTFs from `packages/shared` (outside
  // this app's directory) and `public/logo.svg` off disk at module scope.
  // Next's default output file tracing only follows files it can see through
  // static imports/requires, and these are read with `node:fs` at a path
  // built from `process.cwd()`, so the standalone/serverless bundle Vercel
  // deploys would otherwise ship without them and 500 at runtime even though
  // `next dev` (which runs from the full repo checkout) never surfaces it.
  // Keys are globs matched against the route; values are globs relative to
  // this file's directory (`apps/nextjs`, the project root `next build` and
  // Vercel's build both use).
  outputFileTracingIncludes: {
    "/\\[locale\\]/dog/\\[id\\]/opengraph-image": [
      "../../packages/shared/themes/fonts/Gilroy-*.ttf",
      "./public/logo.svg",
    ],
  },
  // Queue consumers import native/dynamic-require packages that webpack
  // can't statically analyse — resolve them at runtime instead.
  serverExternalPackages: [
    "sharp",
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

  /**
   * `/store` is a route handler, and the middleware's matcher excludes it from
   * next-intl, so it never gets a locale prefix. A visitor who copies
   * `/pt-br/store` out of somewhere would otherwise get a 404 on the one link
   * that is printed in an Instagram bio. Query strings are preserved by
   * default, which is what keeps `?ref=` alive across the hop.
   */
  redirects: () => [
    {
      source: "/:locale(en-us|pt-br)/store",
      destination: "/store",
      permanent: false,
    },
    /**
     * www is the canonical host, so the apex has to send visitors there. It
     * cannot send Apple and Google there: `swcd`, the daemon that installs
     * an app's associated domains, fetches
     * `https://<domain>/.well-known/apple-app-site-association` and treats
     * anything other than a direct 200 as a failure, and Android's domain
     * verifier does the same for `assetlinks.json`. Neither follows a
     * redirect. `apps/mobile/app.config.ts` declares
     * `applinks:pegada.app` alongside `applinks:www.pegada.app` and lists
     * both as Android verified hosts, so a blanket apex redirect silently
     * drops the apex half of every universal link: the OS never installs
     * the association and a shared `pegada.app/dog/<id>` opens in the
     * browser instead of the app, with no error anywhere to say why.
     *
     * The negative lookahead is what keeps the two well-known files
     * answering 200 on the apex while every other apex path still hops to
     * www. Query strings ride along on their own, Next preserves them
     * whenever the destination declares none.
     *
     * Inert until the "Redirect to www.pegada.app" setting is removed from
     * the `pegada.app` domain in the Vercel project. That redirect is a
     * whole-domain one applied at the platform's routing layer, ahead of
     * this deployment, and it has no path exclusions, so today it answers
     * 308 for `/.well-known/*` too and nothing here is ever reached.
     * Landing this first means clearing that setting is the only step left
     * and the apex never goes a deploy without a canonical redirect.
     */
    {
      source: "/:path((?!\\.well-known).*)",
      has: [{ type: "host", value: "pegada.app" }],
      destination: "https://www.pegada.app/:path",
      permanent: true,
    },
  ],
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
});

const withNextIntl = createNextIntlPlugin("./i18n.ts");

export default withNextIntl(withMDX(nextConfig));
