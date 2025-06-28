import { CustomMDX } from "@/components/custom-mdx";
import { Logo } from "@/components/logo";
import { Restricter } from "@/components/restricter";
import { t } from "@/lib/translate";

interface DataProps {
  pageKey: string;
}

export const getLocalizedMdxData = (pageKey: string) => {
  /* eslint-disable @typescript-eslint/no-unsafe-argument -- dynamic i18n keys */
  return {
    content: t(`${pageKey}.content` as never),
    metadata: {
      title: t(`${pageKey}.metadata.title` as never)
    }
  };
  /* eslint-enable @typescript-eslint/no-unsafe-argument */
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
