import * as React from "react";

import {
  generateLocalizedMdxMetadata,
  LocalizedMdxScreen
} from "@/components/localized-mdx-screen";

const pageKey = "termsOfUse";

export const generateMetadata = () => generateLocalizedMdxMetadata(pageKey);

const TermsOfUse: React.FC = () => {
  return <LocalizedMdxScreen pageKey={pageKey} />;
};

export default TermsOfUse;
