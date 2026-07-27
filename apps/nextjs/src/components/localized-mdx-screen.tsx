import type { Namespace } from "@pegada/shared/i18n/types/types";
import type { ParseKeys } from "i18next";

import { CustomMDX } from "@/components/custom-mdx";
import { Logo } from "@/components/logo";
import { Restricter } from "@/components/restricter";
import { t } from "@/lib/translate";

interface DataProps {
  pageKey: string;
}

export const getLocalizedMdxData = (pageKey: string) => {
  // The page key is only known at runtime (it comes from the route), so these
  // cannot be narrowed to i18next's literal key union here.
  const key = (suffix: string) =>
    `${pageKey}.${suffix}` as ParseKeys<Namespace.Web>;

  return {
    content: t(key("content")),
    metadata: {
      title: t(key("metadata.title")),
    },
  };
};

export const generateLocalizedMdxMetadata = (pageKey: string) => {
  return getLocalizedMdxData(pageKey).metadata;
};

export const LocalizedMdxScreen = ({ pageKey }: DataProps) => {
  const source = getLocalizedMdxData(pageKey).content;

  return (
    <Restricter>
      <div className="prose max-w-none w-full p-12">
        <Logo />
        <CustomMDX source={source} />
      </div>
    </Restricter>
  );
};
