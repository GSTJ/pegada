import { CustomMDX } from "@/components/custom-mdx";
import { Logo } from "@/components/logo";
import { Restricter } from "@/components/restricter";
import { t } from "@/lib/translate";

type DataProps = {
  pageKey: string;
};

export const getLocalizedMdxData = (pageKey: string) => {
  console.log(`${pageKey}.content`);
  return {
    content: t(`${pageKey}.content` as any),
    metadata: {
      title: t(`${pageKey}.metadata.title` as any)
    }
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
