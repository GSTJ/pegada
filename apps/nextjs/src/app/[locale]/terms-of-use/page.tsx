import * as React from "react";

import {
  generateLocalizedMdxMetadata,
  LocalizedMdxScreen,
} from "@/components/localized-mdx-screen";

const pageKey = "termsOfUse";

export const generateMetadata = () =>
  generateLocalizedMdxMetadata(pageKey, { noindex: true });

const TermsOfUse: React.FC = () => {
  return <LocalizedMdxScreen pageKey={pageKey} route="/terms-of-use" />;
};

export default TermsOfUse;
