import type { MetadataRoute } from "next";

const BASE_URL = "https://www.pegada.app";

// Search and AI crawlers named explicitly so the intent to be indexed and
// cited is on record, not just implied by the `*` rule. Tokens are the ones
// each vendor documents. Perplexity-User and ChatGPT-User are user-initiated
// fetchers that may ignore robots.txt, listed so the allow is still explicit.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
] as const;

// `/robots.txt` falls under the `[locale]` dynamic segment, so without this
// file the request renders the homepage HTML instead of a robots file.
const robots = (): MetadataRoute.Robots => {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/api/" },
      ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
};

export default robots;
