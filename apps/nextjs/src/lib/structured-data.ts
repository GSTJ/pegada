const ORIGIN = "https://www.pegada.app";
const ORGANIZATION_ID = `${ORIGIN}/#organization`;

/**
 * The home's JSON-LD as one graph: the app, the site, and the organization
 * that publishes both. Only fields the stores and the site back up. No
 * `offers` or `aggregateRating`: the app has in-app purchases and the repo has
 * no rating to cite. No `SearchAction`: the site has no search. `sameAs` is the
 * store listings, the only official profiles Pegada has. They come in as an
 * argument so this file imports nothing and the test can load it as is.
 */
export const homeJsonLd = ({
  url,
  inLanguage,
  description,
  sameAs,
}: {
  url: string;
  inLanguage: string;
  description: string;
  sameAs: string[];
}) => {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORGANIZATION_ID,
        name: "Pegada",
        url: `${ORIGIN}/`,
        logo: `${ORIGIN}/icon-512.png`,
        email: "support@pegada.app",
        sameAs,
      },
      {
        "@type": "WebSite",
        "@id": `${ORIGIN}/#website`,
        name: "Pegada",
        url: `${ORIGIN}/`,
        inLanguage,
        publisher: { "@id": ORGANIZATION_ID },
      },
      {
        "@type": "MobileApplication",
        name: "Pegada",
        url,
        description,
        inLanguage,
        image: `${ORIGIN}/icon-512.png`,
        operatingSystem: "iOS 15.1 or later, Android",
        applicationCategory: "SocialNetworkingApplication",
        sameAs,
        publisher: { "@id": ORGANIZATION_ID },
        author: {
          "@type": "Person",
          name: "Gabriel Taveira",
          url: "https://gabrieltaveira.dev",
        },
      },
    ],
  };
};
