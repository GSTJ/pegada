import * as React from "react";

import {
  generateLocalizedMdxMetadata,
  LocalizedMdxScreen
} from "@/components/localized-mdx-screen";

const pageKey = "deleteAccount";

export const generateMetadata = () => generateLocalizedMdxMetadata(pageKey);

const DeleteAccount: React.FC = () => {
  return <LocalizedMdxScreen pageKey={pageKey} />;
};

export default DeleteAccount;
