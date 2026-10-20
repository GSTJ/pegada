import * as React from "react";

import {
  generateLocalizedMdxMetadata,
  LocalizedMdxScreen,
} from "@/components/localized-mdx-screen";

const pageKey = "privacyPolicy";

export const generateMetadata = () => generateLocalizedMdxMetadata(pageKey);

const PrivacyPolicy: React.FC = () => {
  return <LocalizedMdxScreen pageKey={pageKey} route="/privacy-policy" />;
};

export default PrivacyPolicy;
