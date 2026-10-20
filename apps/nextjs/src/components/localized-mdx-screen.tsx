import type { Namespace } from "@pegada/shared/i18n/types/types";
import type { ParseKeys } from "i18next";

import type { ComponentProps } from "react";

import { CustomMDX } from "@/components/custom-mdx";
import { Logo } from "@/components/logo";
import { Restricter } from "@/components/restricter";
import { t } from "@/lib/translate";

type DataProps = {
  pageKey: string;
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

export const generateLocalizedMdxMetadata = (pageKey: string) => {
  return getLocalizedMdxData(pageKey).metadata;
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

export const LocalizedMdxScreen = ({ pageKey }: DataProps) => {
  const source = getLocalizedMdxData(pageKey).content;

  return (
    <Restricter>
      <main id="main" tabIndex={-1} className="prose max-w-none w-full p-12">
        <Logo />
        <CustomMDX source={source} components={components} />
      </main>
    </Restricter>
  );
};
