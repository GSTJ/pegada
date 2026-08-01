import type { MetadataRoute } from "next";

const BASE_URL = "https://www.pegada.app";

// `/robots.txt` falls under the `[locale]` dynamic segment, so without this
// file the request renders the homepage HTML instead of a robots file.
const robots = (): MetadataRoute.Robots => {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
};

export default robots;
