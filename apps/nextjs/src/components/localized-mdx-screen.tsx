import type { Namespace } from "@pegada/shared/i18n/types/types";
import type { ParseKeys } from "i18next";

import type { ComponentProps } from "react";

import { CustomMDX } from "@/components/custom-mdx";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { t } from "@/lib/translate";

type DataProps = {
  pageKey: string;
  /** The page's path without the locale, for the language switch. */
  route: string;
};

export const getLocalizedMdxData = (pageKey: string) => {
  // The page key is only known at runtime (it comes from the route), so these
  // cannot be narrowed to i18next's literal key union here.
  const key = (suffix: string) =>
    `${pageKey}.${suffix}` as ParseKeys<Namespace.Web>;

  return {
    content: t(key("content")),
    metadata: {
      title: t(key("metadata.title")),
      description: t(key("metadata.description")),
    },
  };
};

/**
 * `noindex` is for secondary legal pages that should stay reachable (follow)
 * but not compete with the privacy policy in search results.
 */
export const generateLocalizedMdxMetadata = (
  pageKey: string,
  { noindex = false }: { noindex?: boolean } = {},
) => {
  const { metadata } = getLocalizedMdxData(pageKey);

  return noindex
    ? { ...metadata, robots: { index: false, follow: true } }
    : metadata;
};

/**
 * Every legal text opens with a single `###` (its title) and nests `####`
 * under it, so the levels shift up by two: the title becomes the page's h1.
 */
const components = {
  h3: ({ children, ...props }: ComponentProps<"h1">) => (
    <h1 {...props}>{children}</h1>
  ),
  h4: ({ children, ...props }: ComponentProps<"h2">) => (
    <h2 {...props}>{children}</h2>
  ),
};

export const LocalizedMdxScreen = ({ pageKey, route }: DataProps) => {
  const source = getLocalizedMdxData(pageKey).content;

  return (
    <>
      <SiteHeader route={route} />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto max-w-[1200px] px-5 py-12 outline-none sm:px-10 sm:py-16"
      >
        <div className="prose max-w-[70ch]">
          <CustomMDX source={source} components={components} />
        </div>
      </main>
      <SiteFooter route={route} page="legal" />
    </>
  );
};
